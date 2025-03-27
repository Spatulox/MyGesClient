import {GetCourses} from "../../wailsjs/go/backend/App";
import {getYear, scrollMainPart} from "../JS/functions";
import {popup} from "../JS/popups";

let isStillRunning = false

export async function courses(){
    if(isStillRunning){
        return
    }
    isStillRunning = true
    scrollMainPart()
    const loading = document.getElementById("loadingCourses")
    const search = document.getElementById("search-bar-courses")
    const courseGrid = document.getElementById('courseGrid');
    let mygescourses
    try{
        mygescourses = await GetCourses()

        if(!mygescourses){
            popup("Impossible de lister vos Cours")
            isStillRunning = false
            return
        }

        search.addEventListener("input", ()=>{
            courseGrid.innerHTML = ""
            mygescourses.items.forEach(course => {
                if(course.name.toLowerCase().includes(search.value.toLowerCase())){
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
    isStillRunning = false
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