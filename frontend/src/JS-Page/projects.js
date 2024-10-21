import {popup, stillPopup, stopStillPopup} from "../JS/popups";
import {getYear} from "../JS/functions";
import {GetProfile, GetProjects} from "../../wailsjs/go/backend/App";

export async function projects(){
    let laStill = stillPopup("Recherche de vos projets..")
    const loadingProject = document.getElementById("loadingProject")
    //try{
        const year = getYear()
        const mygesProjects = await GetProjects(year.toString())
        let profile = await GetProfile()
        profile = await JSON.parse(profile)

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
    groupsContainer.innerHTML = ""

    console.log(data)
    data.items.forEach(course => {
        const groupElement = document.createElement('div');
        groupElement.className = 'group';

        const courseTitle = document.createElement("h1")
        courseTitle.innerHTML = course.name
        groupElement.appendChild(courseTitle);

        const para = document.createElement("p")
        para.innerHTML = `${course.author} ・ ${course.course_name}`
        /*group.course_name
        group.project_teaching_goals
        group.project_type_subject
        group.project_hearing_presentation
        group.project_type_presentation*/
        groupElement.id = getGroupIdIfInside(course.groups, lastname, firstname).toString()
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

        groupElement.addEventListener("click", ()=>{
            console.log(yep)
            getGroupIfInside(course.group, lastname, firstname)
            popup("Under Contruction")
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