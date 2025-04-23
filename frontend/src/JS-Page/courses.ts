import { GetCourses } from "../../wailsjs/go/backend/App";
import { getYear, scrollMainPart } from "../JS/functions";
import { popup } from "../JS/popups";

let isStillRunning = false;

// Typage d'un cours
interface Course {
    name: string;
    teacher: string;
    student_group_name: string;
    trimester: string;
    year: string;
}

interface MyGesCourses {
    items: Course[];
}

export async function courses(): Promise<void> {
    if (isStillRunning) {
        return;
    }
    isStillRunning = true;
    scrollMainPart();
    const loading = document.getElementById("loadingCourses") as HTMLElement | null;
    const search = document.getElementById("search-bar-courses") as HTMLInputElement | null;
    const courseGrid = document.getElementById('courseGrid') as HTMLElement | null;

    if (!search || !courseGrid) {
        console.log(loading, search, courseGrid)
        popup("Impossible d'accéder à certains éléments du DOM");
        isStillRunning = false;
        return;
    }

    let mygescourses: MyGesCourses | null = null;
    try {
        let rawCourses = await GetCourses();

        if (!rawCourses) {
            popup("Impossible de lister vos Cours");
            isStillRunning = false;
            return;
        }

        mygescourses = JSON.parse(rawCourses) as MyGesCourses;

        // Recherche dynamique
        search.addEventListener("input", () => {
            courseGrid.innerHTML = "";
            mygescourses!.items.forEach(course => {
                if (course.name.toLowerCase().includes(search.value.toLowerCase())) {
                    courseGrid.innerHTML += createCourseCard(course);
                }
            });
        });

        // Affichage initial
        courseGrid.innerHTML = "";
        mygescourses.items.forEach(course => {
            courseGrid.innerHTML += createCourseCard(course);
        });

    } catch (e) {
        console.log(e);
        courseGrid.innerHTML = `
        <div class="width100 marginAuto flex flexCenter">
            <div class="box width100">Une erreur s'est produite</div>
        </div>`;
        if(loading){
            loading.style.display = "none";
        }
    }
    isStillRunning = false;
}

// Fonction pour générer une carte de cours
function createCourseCard(course: Course): string {
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