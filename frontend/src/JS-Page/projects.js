import {popup, stillPopup, stopStillPopup} from "../JS/popups";
import {getYear, scrollMainPart} from "../JS/functions";
import {GetProfile, GetProjects, JoinProjectGroup, QuitProjectGroup} from "../../wailsjs/go/backend/App";
export async function projects(){
    scrollMainPart()
    let laStill = stillPopup("Recherche de vos projets..")
    const loadingProject = document.getElementById("loadingProject")
    try{
        const mygesProjects = await GetProjects()
        let profile = await GetProfile()
        profile = await JSON.parse(profile)
        populateData(JSON.parse(mygesProjects), profile.name, profile.firstname)
        loadingProject.style.display = "none"
    } catch (e) {
        console.log(e)
        popup(e.toString())
        loadingProject.style.display = "none"
    }
    stopStillPopup(laStill)
}


function populateData(data, lastname, firstname) {
    const groupsContainer = document.getElementById('courses-container');
    groupsContainer.innerHTML = ""

    let courseGroup = 0
    console.log(data.items)
    data.items.forEach(course => {
        courseGroup++
        const groupElement = document.createElement('div');
        groupElement.className = 'group';

        const courseTitle = document.createElement("h1")
        courseTitle.innerHTML = course.name
        groupElement.appendChild(courseTitle);

        const para = document.createElement("p")
        para.innerHTML = `${course.author} ・ ${course.course_name}`

        let groupId = getGroupIdIfInside(course.groups, lastname, firstname)
        if(groupId !== 0){
            // Create informations of the project when joined
            groupElement.id = `group-element-id${groupId}`
            console.log(groupElement, course, groupId)
            createGroupInformations(groupElement, course, groupId)
        } else {
            // Create a list of Groups
            groupElement.appendChild(createGroupList(groupElement, course, groupId))
            groupId = courseGroup
            groupElement.id = `group-element-id${groupId}`
        }

        groupElement.appendChild(para);

        groupElement.addEventListener("click", (event) => {
            // Vérifier si l'élément cliqué est directement le groupElement
            if (event.target === groupElement || event.target === courseTitle || event.target === para) {
                const element = groupElement.querySelector('div');
                if (element) {
                    element.classList.toggle("active");
                    groupElement.classList.toggle("active");
                }
            }
        });

        groupsContainer.appendChild(groupElement);
    });
}


function getGroupIdIfInside(groups, lastname, firstname){
    if (!Array.isArray(groups)) {
        console.log("Groups is not an array");
        return 0;
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
                return group.project_group_id;
            }
        }
    }

    return 0;
}

function createGroupInformations(groupElement, values, group_id){
    let groupInfo = {
        name: '',
        users: []
    };
    for (const group of values.groups) {
        if (group.project_group_id === group_id) {
            groupInfo.name = group.group_name;
            if (group.project_group_students && Array.isArray(group.project_group_students)) {
                group.project_group_students.forEach(student => {
                    groupInfo.users.push({
                        classe: student.classe,
                        firstname: student.firstname,
                        name: student.name
                    });
                });
            }
            break; // Quitte la boucle dès qu'on a trouvé le bon groupe
        }
    }

    const groupInfoDiv = document.createElement('div');
    groupInfoDiv.className = 'group-info';

    const groupTitle = document.createElement('h2');
    groupTitle.textContent = groupInfo.name + ` | ${groupInfo.users.length}/${values.project_max_student_group}`;
    if(groupInfo.users.length === values.project_max_student_group){
        groupTitle.innerHTML = groupInfo.name + " | <span class='underline' style='color: #b10202'>Complet</span>"
    }
    groupInfoDiv.appendChild(groupTitle);

    const projectDetails = document.createElement('div');
    projectDetails.className = 'project-details';

    const detailsArray = [
        { label: 'Sujet', value: values.project_teaching_goals },
        { label: 'Type de sujet', value: values.project_type_subject },
        { label: 'Type de groupe', value: values.project_type_group },
        { label: 'Présentation', value: values.project_hearing_presentation },
        { label: 'Durée de présentation', value: `${values.project_presentation_duration} minutes` },
        { label: 'Travail personnel estimé', value: `${values.project_personal_work} heures` },
        { label: 'Type de présentation', value: values.project_type_presentation }
    ];

    detailsArray.forEach(detail => {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = `${detail.label}: `;
        p.appendChild(strong);
        p.appendChild(document.createTextNode(detail.value));
        projectDetails.appendChild(p);
    });

    groupInfoDiv.appendChild(projectDetails);

    const membersTitle = document.createElement('h3');
    membersTitle.textContent = 'Membres du groupe :';
    groupInfoDiv.appendChild(membersTitle);

    const span = document.createElement("span")
    span.innerHTML = `Min : ${values.project_min_student_group} / Max : ${values.project_max_student_group}`
    groupInfoDiv.appendChild(span)

    const membersList = document.createElement('ul');
    membersList.className = 'group-members';

    groupInfo.users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.firstname} ${user.name} (${user.classe})`;
        membersList.appendChild(li);
    });

    groupInfoDiv.appendChild(membersList);

    // Ajout de la section des fichiers du projet
    const filesTitle = document.createElement('h3');
    filesTitle.innerHTML = 'Fichiers du projet : <span class="tooltip-trigger">(A récupérer sur MyGes)<span class="tooltip">L\'API actuellement utilisée ne donne pas accès au téléchargement des fichiers</span></span>';
    groupInfoDiv.appendChild(filesTitle);

    const filesList = document.createElement('ul');
    filesList.className = 'project-files';

    
    if (values.hasOwnProperty('project_files') && values.project_files != null) {
        values.project_files.forEach(file => {
            console.log(file)
            const li = document.createElement('li');
            const date = new Date(file.pf_crea_date);
            li.textContent = `${file.pf_title} (${date.toLocaleDateString()})`;
            filesList.appendChild(li);
        });
    }

    groupInfoDiv.appendChild(filesList);

    // Ajout de la section des logs du groupe
    const logsTitle = document.createElement('h3');
    logsTitle.textContent = 'Historique du groupe :';
    groupInfoDiv.appendChild(logsTitle);

    const logsList = document.createElement('ul');
    logsList.className = 'group-logs';

    values.project_group_logs.forEach(log => {
        const li = document.createElement('li');
        const date = new Date(log.pgl_date);
        li.textContent = `${date.toLocaleString()} - ${log.pgl_describe}`;
        logsList.appendChild(li);
    });

    groupInfoDiv.appendChild(logsList);

    // Sananes va me tuer
    // Mais après, c'est pas de ma faute, y'a pas de sécurité serveur...
    // Donc si je met un bouton, ca veut dire que je peux quitter/rejoindre des groupes imposés :/
    if(!values.project_type_group.includes("Imposé")){
        const button = document.createElement("button")
        button.classList.add("btn")
        button.classList.add("btn-delete")
        button.innerHTML = "Quitter"
        button.addEventListener("click", async (e)=>{
            e.stopPropagation()
            try{
                if(await QuitProjectGroup(values.rc_id, values.project_id, group_id)){
                    popup("Groupe quitté")
                    document.getElementById("courses-container").innerHTML = ""
                    projects()
                }
            } catch (e) {
                console.log(e)
                popup("Une erreur est survenue")
            }
        })
        groupInfoDiv.appendChild(button)
    }


    groupElement.appendChild(groupInfoDiv)
}



function createGroupList(groupElement, values){

    let groupList = []
    let groupInfo
    values.groups.forEach((group) => {
        let groupUsers = []
        groupInfo = {}
        if (Array.isArray(group.project_group_students)) {
            group.project_group_students.forEach(student => {
                groupUsers.push({
                    firstname: student.firstname,
                    name: student.name
                });
            });
        }

        groupInfo = {
            "name": group.group_name,
            "id": group.project_group_id,
            "person": groupUsers
        }

        groupList.push(groupInfo)

    });
    let div = document.createElement("div")
    div.classList.add("random-div-class-for-groups")
    groupList.forEach((groupCard)=>{
        div.appendChild(createGroupCard(groupCard, values.rc_id, values.project_id))
    })
    return div

}


function createGroupCard(data, rc_id, project_id){
    const div = document.createElement("div")
    div.classList.add("container")

    div.addEventListener("click", ()=>{
        div.classList.toggle("active")
    })

    // Create group name container
    const groupNameContainer = document.createElement('div');
    groupNameContainer.className = 'group-name-container';

    // Create group name element
    const groupName = document.createElement('div');
    groupName.className = 'group-name';
    groupName.textContent = data.name;

    // Create join button
    const joinButton = document.createElement('button');
    joinButton.className = 'join-button';
    joinButton.textContent = 'Rejoindre';
    joinButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        groupName.classList.toggle("active")
        try{
            if(await JoinProjectGroup(rc_id, project_id, data.id)){
                popup("Groupe rejoind")
                document.getElementById("courses-container").innerHTML = ""
                projects()
            }
        } catch (e) {
            console.log(e)
            popup("Une erreur est survenue")
        }
        // Logique pour rejoindre le groupe
    });

    // Append group name and join button to the container
    groupNameContainer.appendChild(groupName);
    groupNameContainer.appendChild(joinButton);

    // Append group name container to main div
    div.appendChild(groupNameContainer);

    // Create member list
    const memberList = document.createElement('ul');
    memberList.className = 'member-list';

    // Populate member list
    data.person.forEach(member => {
        const memberItem = document.createElement('li');
        memberItem.className = 'member';

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = member.firstname.charAt(0);

        const memberInfo = document.createElement('div');
        memberInfo.className = 'member-info';

        const memberName = document.createElement('div');
        memberName.className = 'member-name';
        memberName.textContent = member.firstname;

        const memberFullname = document.createElement('div');
        memberFullname.className = 'member-fullname';
        memberFullname.textContent = member.name;

        // Append elements to the DOM
        memberInfo.appendChild(memberName);
        memberInfo.appendChild(memberFullname);

        memberItem.appendChild(avatar);
        memberItem.appendChild(memberInfo);

        memberList.appendChild(memberItem);
    });

    div.appendChild(memberList)
    return div
}