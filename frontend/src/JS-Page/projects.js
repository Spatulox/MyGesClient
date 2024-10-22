import {popup, stillPopup, stopStillPopup} from "../JS/popups";
import {getYear, scrollMainPart} from "../JS/functions";
import {GetProfile, GetProjects} from "../../wailsjs/go/backend/App";

export async function projects(){
    scrollMainPart()
    let laStill = stillPopup("Recherche de vos projets..")
    const loadingProject = document.getElementById("loadingProject")
    //try{
        const year = getYear()
        const mygesProjects = await GetProjects(year.toString())
        let profile = await GetProfile()
        profile = await JSON.parse(profile)

        populateData(JSON.parse(mygesProjects), profile.name, profile.firstname)
        populateData(JSON.parse(mygesProjects), profile.name, profile.firstname)
        populateData(JSON.parse(mygesProjects), profile.name, profile.firstname)
        populateData(JSON.parse(mygesProjects), profile.name, profile.firstname)
        loadingProject.style.display = "none"
        stopStillPopup(laStill)
    /*} catch (e) {
        console.log(e)
        popup(e.toString())
        stopStillPopup(laStill)
        // Can crah for no reason
        loadingProject.style.display = "none"
    }*/
}


function populateData(data, lastname, firstname) {
    const groupsContainer = document.getElementById('courses-container');
    //groupsContainer.innerHTML = ""

    let courseGroup = 0
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
            groupElement.id = `group-element-id${groupId}`
            createGroupInformations(groupElement, course, groupId)
        } else {
            // Not in a group
            // Réalise la liste des groupes avec la possibilité de les rejoindre
            groupId = courseGroup
            groupElement.id = `group-element-id${groupId}`
        }

        groupElement.appendChild(para);

        /*const groupName = document.createElement('div');
        groupName.className = 'group-name';
        groupName.textContent = group.group_name;
        groupElement.appendChild(groupName);*/

        /*group.groups.project_group_students.forEach(student => {
            const studentElement = document.createElement('div');
            studentElement.className = 'student';

            const studentName = document.createElement('span');
            studentName.className = 'student-name';
            studentName.textContent = `${student.firstname} ${student.name}`;
            studentElement.appendChild(studentName);

            const studentInfo = document.createElement('span');
            studentInfo.className = 'student-info';
            studentInfo.textContent = ` ${student.promotion} - ${student.classe}`;
            studentElement.appendChild(studentInfo);

            groupElement.appendChild(studentElement);
        });*/

        groupElement.addEventListener("click", (event)=>{
            const element = document.querySelector(`#group-element-id${groupId} > div`)
            console.log(element)
            element.classList.toggle("active")

        })

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
            console.log("project_group_students is not an array for group:", group.project_group_id);
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

function isGroupElementOrChild(element, groupElement) {
    while (element) {
        if (element === groupElement) {
            return true;
        }
        element = element.parentElement;
    }
    return false;
}


function createGroupInformations(groupElement, values, group_id){
    console.log(values)
    const div = document.createElement("div")
/*    //values.project_group_logs
    values.course_name
    values.project_teaching_goals // Sujet
    values.project_type_subject // Imposé
    values.project_type_group // Imposé
    values.project_hearing_presentation // a huis clos
    project_presentation_duration // Minutes
    project_personnal_work // Hours
    values.project_type_presentation*/

    let groupInfo = {
        name: '',
        users: []
    };
    values.groups.forEach((group) => {
        if (group.project_group_id === group_id) {
            groupInfo.name = group.group_name;
            group.project_group_students.forEach(student => {
                groupInfo.users.push({
                    classe: student.classe,
                    firstname: student.firstname,
                    name: student.name
                });
            });
        }
    });

    const groupInfoDiv = document.createElement('div');
    groupInfoDiv.className = 'group-info';

    const groupTitle = document.createElement('h2');
    groupTitle.textContent = groupInfo.name;
    groupInfoDiv.appendChild(groupTitle);

    const projectDetails = document.createElement('div');
    projectDetails.className = 'project-details';

    const detailsArray = [
        { label: 'Sujet', value: values.project_teaching_goals },
        { label: 'Type de sujet', value: values.project_type_subject },
        { label: 'Type de groupe', value: values.project_type_group },
        { label: 'Présentation', value: values.project_hearing_presentation },
        { label: 'Durée de présentation', value: `${values.project_presentation_duration} minutes` },
        { label: 'Travail personnel', value: `${values.project_personal_work} heures` },
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

    const membersList = document.createElement('ul');
    membersList.className = 'group-members';

    groupInfo.users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.firstname} ${user.name} (${user.classe})`;
        membersList.appendChild(li);
    });

    groupInfoDiv.appendChild(membersList);

    groupElement.appendChild(groupInfoDiv)
}