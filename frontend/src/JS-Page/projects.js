import {popup, stillPopup, stopStillPopup} from "../JS/popups";
import {getYear} from "../JS/functions";
import {GetProjects} from "../../wailsjs/go/backend/App";

export async function projects(){
    let laStill = stillPopup("Recherche de vos projets..")
    const loadingProject = document.getElementById("loadingProject")
    //try{
        const year = getYear()
        const mygesProjects = await GetProjects(year.toString())
        /*console.log(mygesProjects)*/
        populateData(JSON.parse(mygesProjects))
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


function populateData(data) {
    const groupsContainer = document.getElementById('courses-container');
    groupsContainer.innerHTML = ""

    console.log(data.items)
    data.items.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.className = 'group';

        const courseTitle = document.createElement("h1")
        courseTitle.innerHTML = group.name
        groupElement.appendChild(courseTitle);

        const para = document.createElement("p")
        para.innerHTML = `${group.author} ・ ${group.course_name}`
        /*group.course_name
        group.project_teaching_goals
        group.project_type_subject
        group.project_hearing_presentation
        group.project_type_presentation*/
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
            popup("coucou")
        })

        groupsContainer.appendChild(groupElement);
    });
}