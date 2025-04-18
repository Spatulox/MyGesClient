import {GetEvents, GetGrades} from "../../wailsjs/go/backend/App";
import {
    getYear,
    capitalizeFirstLetter,
    formatDateWithDay,
} from "../JS/functions";
import { initGradesDisplay } from "./grades";
import { popup } from "../JS/popups";
import { getSchedule } from "./schedule";

const forwardButton = document.getElementById("forward-button")
const backwardButton = document.getElementById("backward-button")
const htmlScheduleElement = document.getElementById("schedule-content")
const htmlGradeElement = document.getElementById("grades-content")
let TODAY = new Date();
let agenda = null

export async function dashboard(){
    TODAY.setUTCHours(5, 0, 0, 0)
    try{
        handleAgenda(),
        handleGrades(),
        handleEvents()
    } catch (e) {
        console.log(e)
        printDate();
        popup("Impossible de mettre à jour l'accueil..")
    }
}
forwardButton.addEventListener("click", async ()=> {

    forwardButton.style.opacity = 0;
    forwardButton.style.pointerEvents = 'none';
    backwardButton.style.opacity = 0;
    backwardButton.style.pointerEvents = 'none';
    
    await changeDay(1)
    await handleAgenda()

    forwardButton.style.opacity = 1;
    forwardButton.style.pointerEvents = 'auto';
    backwardButton.style.opacity = 1;
    backwardButton.style.pointerEvents = 'auto';
})

backwardButton.addEventListener("click", async ()=> {
    forwardButton.style.opacity = 0;
    forwardButton.style.pointerEvents = 'none';
    backwardButton.style.opacity = 0;
    backwardButton.style.pointerEvents = 'none';
    
    await changeDay(-1)
    await handleAgenda()

    forwardButton.style.opacity = 1;
    forwardButton.style.pointerEvents = 'auto';
    backwardButton.style.opacity = 1;
    backwardButton.style.pointerEvents = 'auto';
})

// --------------------------------------------------------------------------------------- //

async function handleAgenda() {
    
    const tomorrowMidnight = new Date(TODAY);
    tomorrowMidnight.setUTCHours(22, 0, 0, 0);
    printDate()
    
    let agenda_new
    while(!agenda_new){
        agenda_new = await getSchedule(TODAY.toISOString().split("T")[0], tomorrowMidnight.toISOString().split("T")[0]);
        if(agenda_new && JSON.stringify(agenda) !== JSON.stringify(agenda_new)) {
            agenda = agenda_new
            await updateScheduleDashboard(agenda)
            document.getElementsByClassName("schedule-section")[0].style.transform = "translateY(-70px)";
        }
    }
}


function handleGrades() {
    return GetGrades(getYear().toString()).then((grades) => {
        if (grades) {
            recapGrades(htmlGradeElement, grades);
        } else {
            document.getElementById("grades-content").innerHTML = "<div class='grade-item'>Aucune Notes</div>";
        }
    });
}

function handleEvents() {
    return GetEvents().then((events) => {
        if (events) {
            recapEvents(events);
        } else {
            document.getElementById("event-content").innerHTML = "Aucun Évènement";
        }
    });
}

// --------------------------------------------------------------------------------------- //

function recapGrades(gradesList, grades) {
    // Fonction pour obtenir 3 éléments aléatoires d'un tableau
    function getRandomElements(array, count) {
        let shuffled = array.slice(0), i = array.length, min = i - count, temp, index;
        while (i-- > min) {
            index = Math.floor((i + 1) * Math.random());
            temp = shuffled[index];
            shuffled[index] = shuffled[i];
            shuffled[i] = temp;
        }
        return shuffled.slice(min);
    }

    // Fonction pour afficher les notes
    function displayGrades() {
        gradesList.innerHTML = ''; // Nettoyer la liste existante
        const selectedGrades = getRandomElements(grades, 3);

        selectedGrades.forEach(grade => {
            let {gradeElement, courseName, gradesHtml, examHtml} = initGradesDisplay(grade)


            gradeElement.innerHTML = `
                <span>${capitalizeFirstLetter(courseName)}</span>
                <span>${grade.coef}</span>
                <span>${grade.teacher_name}</span>
                <span>${gradesHtml}</span>
                <span>${examHtml}</span>
            `;

            gradesList.appendChild(gradeElement);
        });
    }

    // Afficher les notes initiales
    displayGrades();
}

function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.style.borderLeftColor = event.color;

    const startFormatted = formatDateWithDay(event.start_date);
    const endFormatted = formatDateWithDay(event.end_date);

    card.innerHTML = `
        <div class="event-header">
            <h3 class="event-name">${event.name}</h3>
        </div>
        <p class="event-description">${event.description}</p>
        <div class="event-time">
            <i class="far fa-clock"></i> ${startFormatted} - ${endFormatted}
        </div>
    `;

    return card;
}

function recapEvents(events) {
    const container = document.getElementById('events-container');
    container.innerHTML = ""
    events.forEach(event => {
        const card = createEventCard(event);
        container.appendChild(card);
    });
}

export async function updateScheduleDashboard(agenda) {
    htmlScheduleElement.innerHTML = `<h3>${capitalizeFirstLetter(TODAY.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>`;

    agenda.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.className = 'course-card';
        let courseName = course.agenda_name.includes("S1 - ") ? course.agenda_name.split("S1 - ")[1] : (course.agenda_name.includes("S2 - ") ? course.agenda_name.split("S2 - ")[1] : course.agenda_name)
        courseName = capitalizeFirstLetter(courseName+"")
        courseElement.innerHTML = `
            <h3 style="color: ${course.room.color.Valid ? course.room.color.String : "#FFFFFF"}">${courseName}</h3>
            <p>${course.start_date.split('T')[1].substring(0, 5)} - ${course.end_date.split('T')[1].substring(0, 5)}</p>
            <p>Prof: ${course.discipline.Teacher.teacher}</p>
        `;

        if(course.room.name.Valid){
            courseElement.innerHTML += `<p>Salle: ${course.room.name.String} (${course.room.campus.String})</p>`
        }

        courseElement.innerHTML += `<p>Type: ${course.type}</p>`
        if(course.modality){
            courseElement.innerHTML += `<p>Modalité: ${course.modality}</p>`
        }
        if(course.comment){
            courseElement.innerHTML += `<p>Commentaire: ${course.comment}</p>`
        }


        htmlScheduleElement.appendChild(courseElement);
    });
}

async function changeDay(direction) {
    if(!TODAY){
        TODAY = new Date()
    }

    TODAY.setUTCDate(TODAY.getUTCDate() + direction);
    TODAY.setUTCHours(5, 0, 0, 0)
    if(TODAY.getUTCDay() == 0){
        TODAY.setUTCDate(TODAY.getUTCDate() + direction)
    }
    console.log(TODAY.toISOString())
}

function printDate(){
    try{
        htmlScheduleElement.innerHTML = `<h3>${capitalizeFirstLetter(TODAY.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>`;
        htmlScheduleElement.innerHTML += "Aucun Agenda"
        document.getElementsByClassName("schedule-section")[0].style.transform = "inherit"
    } catch (e) {
        console.log(e)
    }

}