import {GetCourses} from "../../wailsjs/go/backend/App";
import {getYear, scrollMainPart} from "../JS/functions";

export async function courses(){
    scrollMainPart()
    const loading = document.getElementById("loading")
    const search = document.getElementById("search-bar-courses")
    const courseGrid = document.getElementById('courseGrid');

    try{
        const year = getYear()
        let courses = await GetCourses(year.toString())

        search.addEventListener("input", ()=>{
            courseGrid.innerHTML = ""
            courses.items.forEach(course => {
                console.log(course)
                if(course.name.includes(search.value)){
                    courseGrid.innerHTML += createCourseCard(course);
                }
            });
        })

        loading.style.display = "none"
        courses = JSON.parse(courses)

        // Supposons que 'data' contient les données de l'API
        courses.items.forEach(course => {
            courseGrid.innerHTML += createCourseCard(course);
        });

    } catch (e) {
        console.log(e)
        courseGrid.innerHTML = "Une erreur c'est produite"
        loading.style.display = "none"
        courses = JSON.parse(courses)
    }
}

// Les données seront chargées et insérées ici via JavaScript
// Exemple de structure pour insérer une carte :

function createCourseCard(course) {
    return `
        <div class="course-card">
            <div class="course-name">${course.name}</div>
            <div class="course-detail teacher">${course.teacher}</div>
            <div class="course-detail">${course.student_group_name}</div>
            <div class="course-detail">
                <span class="badge badge-blue">${course.trimester}</span>
                <span class="badge badge-green">${course.year}</span>
            </div>
        </div>
    `;
}