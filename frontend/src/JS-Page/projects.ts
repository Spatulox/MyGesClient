import { popup } from "../JS/popups";
import { GetProfile, GetProjects, JoinProjectGroup, QuitProjectGroup } from "../../wailsjs/go/backend/App";
import { scrollMainPart } from "../JS/functions";

// Types de base à adapter selon tes vrais modèles
type Student = {
    firstname: string;
    name: string;
    classe: string;
};

type Group = {
    group_name: string;
    project_group_id: number;
    project_id: number;
    project_group_students: Student[];
    project_group_logs?: LogEntry[];
    date_presentation?: string;
    [key: string]: any;
};

type LogEntry = {
    pgl_date: string;
    pgl_describe: string;
};

type FileEntry = {
    pf_title: string;
    pf_file: string;
};

type Project = {
    rc_id: number;
    project_id: number;
    name: string;
    author: string;
    course_name: string;
    project_max_student_group: number;
    project_personal_work: number;
    project_presentation_duration: number;
    project_teaching_goals: string;
    project_detail_plan: string;
    project_type_subject: string;
    project_type_group: string;
    project_type_presentation: string;
    project_hearing_presentation: string;
    project_files?: FileEntry[];
    project_group_logs?: LogEntry[];
    groups: Group[];
    [key: string]: any;
};

type ProjectsResponse = {
    items: Project[];
};

type Profile = {
    name: string;
    firstname: string;
    [key: string]: any;
};

let isStillRunning = false;
let mygesProjectsRAM = "";

export async function projects(forceRefresh = false): Promise<void> {
    if (isStillRunning) return;
    isStillRunning = true;
    scrollMainPart();

    try {
        const mygesProjects = await GetProjects();

        if (mygesProjectsRAM === mygesProjects && !forceRefresh) {
            popup("No New Projects");
            return;
        }

        let profile: Profile = JSON.parse(await GetProfile());
        mygesProjectsRAM = JSON.stringify(JSON.parse(mygesProjects));

        const projectItem = document.getElementById('projecttojoin') as HTMLElement;
        const myproject = document.getElementById('myproject') as HTMLElement;
        projectItem.innerHTML = "";
        myproject.innerHTML = "";

        populateData(JSON.parse(mygesProjects), profile.name, profile.firstname);
    } catch (e: any) {
        console.error(e);
        popup(e.toString());
    } finally {
        isStillRunning = false;
    }
}

function populateData(projects: ProjectsResponse, name: string, firstname: string): void {
    if (!projects || !projects.hasOwnProperty("items")) {
        popup("Pas de projets trouvé");
        return;
    }
    projects.items.forEach((project: Project) => {
        const groups = project.groups;
        const pmy_group = getGroupIdIfInside(groups, name, firstname) as Group;
        const pdate_presentation = pmy_group?.date_presentation;
        const groupId = pmy_group?.project_group_id;

        const prc_id = project.rc_id;
        const pproject_id = project.project_id;

        const pgroupname = pmy_group?.group_name;
        const pgoup_user = pmy_group?.project_group_students ?? [];
        const pcoursename = project.course_name;
        const pprof = project.author;
        const pname = project.name;
        const pmax_student = project.project_max_student_group;
        const ppersonnal_work = project.project_personal_work;
        const ppresentation_duration = project.project_presentation_duration;
        let psubject = project.project_teaching_goals;
        const pdetailed = project.project_detail_plan;

        const ptype_hearing_presentation = project.project_hearing_presentation;
        const ptype_presentation = project.project_type_presentation;
        const ptype = project.project_type_subject;
        const ptype_group = project.project_type_group;

        const plogs = project.project_group_logs;

        if (groupId) {
            let plog_out: string[] = [];
            if (plogs && plogs.length > 0) {
                plog_out = plogs.map(log => {
                    const date = new Date(log.pgl_date);
                    return `${date.toLocaleDateString()} - ${log.pgl_describe}`;
                });
            }

            const pfiles = project.project_files;
            let pfiles_out: string[] = [];
            if (pfiles) {
                pfiles_out = pfiles.map(file => {
                    return `${file.pf_title}.${file.pf_file.split(".")[1]}`;
                });
            }

            let pgoup_user_out: string[] = [];
            if (pgoup_user && pgoup_user.length > 0) {
                pgoup_user_out = pgoup_user.map(file => {
                    return `${file.classe} - ${file.firstname} ${file.name}`;
                });
            }

            let status = "in-time";
            if (pdate_presentation && new Date(pdate_presentation) < new Date()) {
                status = "outdated";
            }

            addMyProject(pname, pgroupname, pprof, pcoursename, status);
            addMyProjectDetails({
                "Sujet": psubject,
                "Détails": pdetailed,
                "Date de Présentation": pdate_presentation ? new Date(pdate_presentation).toLocaleDateString() : "",
                "Type de sujet": ptype,
                "Type de groupe": ptype_group,
                "Membres maximum": pmax_student,
                "Présentation": ptype_hearing_presentation,
                "Type de présentation": ptype_presentation,
                "Durée de présentation": ppresentation_duration !== 0 ? `${ppresentation_duration} minutes` : "",
                "Travail personnel estimé": ppersonnal_work !== 0 ? `${ppersonnal_work} heures` : "",
                "members": pgoup_user_out,
                "files": pfiles_out,
                "history": plog_out,
                "maxMembers": pmax_student
            }, status, prc_id, pproject_id, groupId);
        } else {
            let pgoups_out: any[] = [];
            if (groups && groups.length > 0) {
                pgoups_out = groups.map(group => {
                    const pgroup_users = group.project_group_students;

                    let pgroup_users_out: string[] = [];
                    if (pgroup_users && pgroup_users.length > 0) {
                        pgroup_users_out = pgroup_users.map(file => {
                            return `${file.classe} - ${file.firstname} ${file.name}`;
                        });
                    }

                    let status = pgroup_users_out.length < pmax_student ? "open" : "close";
                    if (group.date_presentation && new Date(group.date_presentation) < new Date()) {
                        status = "outdated";
                    }

                    return {
                        "type": ptype_group,
                        "name": group.group_name,
                        "members": pgroup_users_out,
                        "max_student": pmax_student,
                        "status": status,
                        "id": group.project_group_id,
                        "rc_id": prc_id,
                        "project_id": group.project_id
                    };
                });
            }
            psubject = psubject.length > 89 ? psubject.slice(0, 86) + "..." : psubject;
            addProjectToJoin(pname, pprof, psubject);
            addGroupsToProjectToJoin(pgoups_out);
        }
    });

    document.querySelectorAll<HTMLDivElement>('#courses-container .project-item').forEach(item => {
        item.addEventListener('click', () => {
            const details = item.nextElementSibling as HTMLElement;
            details.classList.toggle('active');
            if (details.classList.contains('active')) {
                item.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            document.querySelectorAll<HTMLElement>('#courses-container .project-details.active').forEach(activeDetail => {
                if (activeDetail !== details) {
                    activeDetail.classList.remove('active');
                }
            });
        });
    });
}

function getGroupIdIfInside(groups: Group[], lastname: string, firstname: string): Group | undefined {
    if (!Array.isArray(groups)) {
        console.log("Groups is not an array");
        return undefined;
    }

    for (const group of groups) {
        if (!group || typeof group !== 'object') {
            console.log("Invalid group object");
            continue;
        }

        const students = group.project_group_students;
        if (!Array.isArray(students)) {
            continue;
        }

        for (const student of students) {
            if (student &&
                student.firstname === firstname &&
                student.name === lastname) {
                return group;
            }
        }
    }

    return undefined;
}

// ------------ join project ------------ //

function addProjectToJoin(projectName: string, professorName: string, subject: string): void {
    const projectItem = document.getElementById('projecttojoin') as HTMLElement;
    const div = document.createElement("div");
    div.classList.add("project-item");

    div.innerHTML += `
        <span class="project-name">${projectName}</span>
        <span class="project-info">${professorName} - ${subject}</span>
    `;
    projectItem.appendChild(div);
}

type GroupToJoin = {
    type: string;
    name: string;
    members: string[];
    max_student: number;
    status: string;
    id: number;
    rc_id: number;
    project_id: number;
};

function addGroupsToProjectToJoin(groups: GroupToJoin[]): void {
    const projectDetails = document.getElementById('projecttojoin') as HTMLElement;
    const project_groups = document.createElement("div");
    project_groups.classList.add("project-groups");

    const div = document.createElement("div");
    div.classList.add("project-details");

    groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group';

        const groupInfoDiv = document.createElement('div');
        groupInfoDiv.className = 'group-info';

        const groupNameDiv = document.createElement('div');
        groupNameDiv.className = 'group-name';
        groupNameDiv.textContent = group.name;

        const statusSpan = document.createElement('span');
        statusSpan.className = `status-label status-${group.status.toLowerCase()}`;
        statusSpan.textContent = group.status;
        groupNameDiv.appendChild(statusSpan);

        const nbMemberSpan = document.createElement('span');
        nbMemberSpan.textContent = `${group.members.length}/${group.max_student}`;
        nbMemberSpan.style.marginLeft = "5px";
        groupNameDiv.appendChild(nbMemberSpan);

        const groupMembersDiv = document.createElement('div');
        groupMembersDiv.className = 'group-members';
        groupMembersDiv.textContent = group.members.join(' | ');

        groupInfoDiv.appendChild(groupNameDiv);
        groupInfoDiv.appendChild(groupMembersDiv);
        groupDiv.appendChild(groupInfoDiv);

        if (group.status !== "close" && group.status !== "outdated" && group.type !== "Imposé") {
            const joinButton = document.createElement('button');
            joinButton.className = 'join-button';
            joinButton.textContent = 'Rejoindre le groupe';
            joinButton.addEventListener('click', async (event) => {
                event.stopPropagation();
                try {
                    joinButton.style.opacity = "0";
                    if (await JoinProjectGroup(group.rc_id, group.project_id, group.id)) {
                        popup("Groupe rejoint");
                        projects(true);
                    }
                } catch (e) {
                    joinButton.style.opacity = "1";
                    console.log(e);
                    popup("Une erreur est survenue");
                }
            });
            groupDiv.appendChild(joinButton);
        }

        project_groups.appendChild(groupDiv);
    });

    div.appendChild(project_groups);
    projectDetails.appendChild(div);
}

// ----------- My projects --------------- //

function addMyProject(projectName: string, groupName: string, professorName: string, subject: string, status: string): void {
    const projectItem = document.getElementById("myproject") as HTMLElement;
    const div = document.createElement("div");
    div.classList.add("project-item");

    div.innerHTML = `
        <div class="project-main-info">
            <span class="project-name">${projectName}<span class="status-label status-${status.toLowerCase()}">${status}</span></span>
            <span class="group-name">${groupName}</span>
        </div>
        <span class="project-info">${professorName} - ${subject}</span>
    `;

    projectItem.appendChild(div);
}

type ProjectDetails = {
    [key: string]: any;
    members: string[];
    files: string[];
    history: string[];
    maxMembers: number;
};

function addMyProjectDetails(details: ProjectDetails, status: string, rc_id: number, project_id: number, groupId: number): void {
    const projectDetails = document.getElementById("myproject");
    const div = document.createElement("div");
    div.classList.add("project-details");

    // Détails non-array
    for (const [key, value] of Object.entries(details)) {
        if (!Array.isArray(value) && value !== "" && key !== "maxMembers") {
            const detailRow = document.createElement("div");
            detailRow.classList.add("detail-row");

            const label = document.createElement("span");
            label.classList.add("detail-label");
            label.textContent = `${key}:`;

            const valueSpan = document.createElement("span");
            valueSpan.classList.add("detail-value");
            valueSpan.textContent = value;

            detailRow.appendChild(label);
            detailRow.appendChild(valueSpan);
            div.appendChild(detailRow);
        }
    }

    // Membres
    const membersSection = document.createElement("div");
    membersSection.classList.add("members-section");

    const membersTitle = document.createElement("h3");
    membersTitle.classList.add("section-title");
    membersTitle.textContent = `Membres du groupe (${details.members.length}/${details.maxMembers})`;
    membersSection.appendChild(membersTitle);

    details.members.forEach(member => {
        const memberDiv = document.createElement("div");
        memberDiv.classList.add("member");
        memberDiv.textContent = member;
        membersSection.appendChild(memberDiv);
    });

    div.appendChild(membersSection);

    // Fichiers
    const filesSection = document.createElement("div");
    filesSection.classList.add("files-section");

    const filesTitle = document.createElement("h3");
    filesTitle.classList.add("section-title");
    filesTitle.textContent = "Fichiers du projet";
    filesSection.appendChild(filesTitle);

    details.files.forEach(file => {
        const fileDiv = document.createElement("div");
        fileDiv.classList.add("file");
        fileDiv.textContent = file;
        filesSection.appendChild(fileDiv);
    });

    div.appendChild(filesSection);

    // Historique
    const historySection = document.createElement("div");
    historySection.classList.add("history-section");

    const historyTitle = document.createElement("h3");
    historyTitle.classList.add("section-title");
    historyTitle.textContent = "Historique";
    historySection.appendChild(historyTitle);

    details.history.forEach(entry => {
        const historyEntry = document.createElement("div");
        historyEntry.classList.add("history-entry");
        historyEntry.textContent = entry;
        historySection.appendChild(historyEntry);
    });

    div.appendChild(historySection);

    if (status !== "outdated" && details["Type de groupe"] !== "Imposé") {
        const leaveButton = document.createElement('button');
        leaveButton.textContent = 'Quitter le groupe';
        leaveButton.className = 'leave-button';
        leaveButton.addEventListener("click", async (event) => {
            event.stopPropagation();
            try {
                leaveButton.style.opacity = "0";
                if (await QuitProjectGroup(rc_id, project_id, groupId)) {
                    popup("Groupe quitté");
                    projects(true);
                }
            } catch (e) {
                leaveButton.style.opacity = "1";
                console.log(e);
                popup("Une erreur est survenue");
            }
        });
        div.appendChild(leaveButton);
    }
    if(projectDetails){
        projectDetails.appendChild(div);   
    }
}