import { stillPopup, stopStillPopup, popup } from "../JS/popups";
import {GetProfile, GetProjects, JoinProjectGroup, QuitProjectGroup} from "../../wailsjs/go/backend/App";

export async function projects(){

    const projectItem = document.getElementById('projecttojoin');
    projectItem.innerHTML = ""

    const myproject = document.getElementById('myproject');
    myproject.innerHTML = ""

    let laStill = stillPopup("Recherche de vos projets..")
    const loadingProject = document.getElementById("loadingProject")
    try{
        const mygesProjects = await GetProjects()
        let profile = await GetProfile()
        profile = await JSON.parse(profile)
        /*console.log(mygesProjects)
        console.log(profile)*/
        populateData(JSON.parse(mygesProjects), profile.name, profile.firstname)
        loadingProject.style.display = "none"
    } catch (e) {
        console.log(e)
        popup(e.toString())
        loadingProject.style.display = "none"
    }
    stopStillPopup(laStill)


}

function populateData(projects, name, firstname){
    projects.items.forEach(project => {
        
        // Detect if I'm already in a group for this project
        const groups = project.groups
        const pmy_group = getGroupIdIfInside(groups, name, firstname)
        const pdate_presentation = pmy_group.date_presentation
        const groupId = pmy_group.project_group_id
        const pgroupname = pmy_group.group_name
        const pgoup_user = pmy_group.project_group_students
        const pcoursename = project.course_name
        const pprof = project.author
        const pname = project.name
        const pmax_student = project.project_max_student_group
        const ppersonnal_work = project.project_personal_work
        const ppresentation_duration = project.project_presentation_duration
        const psubject = project.project_teaching_goals
        const pdetailed = project.project_detail_plan
        
        const ptype_hearing_presentation = project.project_hearing_presentation // =>a huis clos
        const ptype_presentation = project.project_type_presentation
        const ptype = project.project_type_subject
        const ptype_group = project.project_type_group
        
        const plogs = project.project_group_logs
        let plog_out = []
        if(plogs && plogs.length > 0){
            plog_out = plogs.map(log => {
                const date = new Date(log.pgl_date);
                return `${date.toLocaleString()} - ${log.pgl_describe}`;
            })
        }


        const pfiles = project.project_files
        let pfiles_out = []
        if(pfiles){
            pfiles_out = pfiles.map(file => {
               return `${file.pf_title}.${file.pf_file.split(".")[1]}`;
            })
        }
        
        let pgoup_user_out = []
        if(pgoup_user && pgoup_user.length > 0){
            pgoup_user_out = pgoup_user.map(file => {
                return `${file.classe} - ${file.firstname} ${file.name}`;
            })
        }


        if(groupId !== 0){
            let status = "in-time"
            if (pdate_presentation && new Date(pdate_presentation) < new Date()){
                status = "outdated"
            }

            addMyProject(pname, pgroupname, pprof, pcoursename, status);
            addMyProjectDetails({
                "Sujet": psubject,
                "Détails":pdetailed,
                "Date de Présentation": new Date(pdate_presentation),
                "Type de sujet": ptype,
                "Type de groupe": ptype_group,
                "Présentation": ptype_hearing_presentation,
                "Durée de présentation": `${ppresentation_duration} minutes`,
                "Travail personnel estimé": `${ppersonnal_work} heures`,
                "Type de présentation": ptype_presentation,
                "members": pgoup_user_out,
                "maxMembers": pmax_student,
                "files": pfiles_out,
                "history": plog_out
            })
        } else {
            //const status = pgoup_user_out.length < pmax_student ? "open" : "close"
        }
    })


    document.querySelectorAll('#courses-container .project-item').forEach(item => {
        item.addEventListener('click', () => {
            const details = item.nextElementSibling;
            
            document.querySelectorAll('#courses-container .project-details.active').forEach(activeDetail => {
            if (activeDetail !== details) {
                activeDetail.classList.remove('active');
            }
            });
            
            details.classList.toggle('active');
        });
    });

}

// Need to parse ALL THE GROUP TO DETECT IF I'M INSIDE OR NOT WELPPPPPP
function getGroupIdIfInside(groups, lastname, firstname){
    if (!Array.isArray(groups)) {
        console.log("Groups is not an array");
        return {};
    }

    for (const group of groups) {
        if (!group || typeof group !== 'object') {
            console.log("Invalid group object");
            continue;
        }

        const students = group.project_group_students;
        if (!Array.isArray(students)) {
            //console.log("project_group_students is not an array for group:", group.project_group_id);
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

    return {};
}


// ------------ join project ------------ //

function addProjectToJoin(projectName, professorName, subject) {
    const projectItem = document.getElementById('projecttojoin');
    projectItem.innerHTML += `
        <span class="project-name">${projectName}</span>
        <span class="project-info">${professorName} - ${subject}</span>
    `;
}

function addGroupsToProjectToJoin(groups) {
    const projectDetails = document.getElementById('projecttojoindetails');
    let groupsHTML = '';
    
    groups.forEach(group => {
        groupsHTML += `
            <div class="group">
                <div class="group-info">
                    <div class="group-name">${group.name}<span class="status-label status-${group.status.toLowerCase()}">${group.status}</span></div>
                    <div class="group-members">${group.members.join(', ')}</div>
                </div>
                <button class="join-button">Rejoindre le groupe</button>
            </div>
        `;
    });
    
    projectDetails.innerHTML += `
        <div class="project-groups">
            ${groupsHTML}
        </div>
    `;
}


// ----------- My projects --------------- //

function addMyProject(projectName, groupName, professorName, subject, status) {

    const projectItem = document.getElementById("myproject")
    const div = document.createElement("div")
    div.classList.add("project-item")

    div.innerHTML = `
        <div class="project-main-info">
            <span class="project-name">${projectName}<span class="status-label status-${status.toLowerCase()}">${status}</span></span>
            <span class="group-name">${groupName}</span>
        </div>
        <span class="project-info">${professorName} - ${subject}</span>
    `;
    
    projectItem.appendChild(div);
}

function addMyProjectDetails(details) {
    console.log(details)
    const projectDetails = document.getElementById("myproject")
    const div = document.createElement("div")
    div.classList.add("project-details")
    let detailsHTML = '';
    for (const [key, value] of Object.entries(details)) {
        if (!Array.isArray(value) && value != "") {
            detailsHTML += `
                <div class="detail-row">
                    <span class="detail-label">${key}:</span>
                    <span class="detail-value">${value}</span>
                </div>
            `;
        }
    }
    
    detailsHTML += `
        <div class="members-section">
            <h3 class="section-title">Membres du groupe (${details.members.length}/${details.maxMembers})</h3>
            ${details.members.map(member => `<div class="member">${member}</div>`).join('')}
        </div>
        <div class="files-section">
            <h3 class="section-title">Fichiers du projet</h3>
            ${details.files.map(file => `<div class="file">${file}</div>`).join('')}
        </div>
        <div class="history-section">
            <h3 class="section-title">Historique</h3>
            ${details.history.map(entry => `<div class="history-entry">${entry}</div>`).join('')}
        </div>
        <button class="leave-button">Quitter le groupe</button>
    `;
    
    div.innerHTML = detailsHTML
    projectDetails.appendChild(div)
}
