import {GetCourses} from "../../wailsjs/go/backend/App";
import {getYear, scrollMainPart} from "../JS/functions";
import {popup} from "../JS/popups";

export async function courses(){
    scrollMainPart()
    const loading = document.getElementById("loadingCourses")
    const search = document.getElementById("search-bar-courses")
    const courseGrid = document.getElementById('courseGrid');
    let mygescourses
    try{
        const year = getYear()
        mygescourses = await GetCourses(year.toString())

        if(!mygescourses){
            popup("Impossible de lister vos Cours")
            return
        }

        search.addEventListener("input", ()=>{
            courseGrid.innerHTML = ""
            mygescourses.items.forEach(course => {
                if(course.name.includes(search.value)){
                    courseGrid.innerHTML += createCourseCard(course);
                }
            });
        })
        mygescourses = JSON.parse(mygescourses)

        // Supposons que 'data' contient les données de l'API
        courseGrid.innerHTML = ""
        mygescourses.items.forEach(course => {
            courseGrid.innerHTML += createCourseCard(course);
        });

    } catch (e) {
        console.log(e)
        courseGrid.innerHTML = "Une erreur c'est produite"
        mygescourses = JSON.parse(mygescourses)
        loading.style.display = "none"
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