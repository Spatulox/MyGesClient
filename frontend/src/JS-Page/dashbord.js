import {GetAgenda, GetEvents, GetGrades} from "../../wailsjs/go/backend/App";
import {getYear, capitalizeFirstLetter, formatTime, formatDate, formatDateWithDay} from "../JS/functions";
import {updateSchedule} from "./schedule";

export async function dashboard(){

    const now = new Date();

    // Créer une date pour aujourd'hui à minuit UTC
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Créer une date pour aujourd'hui à 23:00 UTC
    const todayNight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23));

    let agenda = null
    const htmlElement = document.getElementById("schedule-content")
    try{
        agenda = await GetAgenda("2024-09-23", "2024-09-23")
        //agenda = await GetAgenda(today.toISOString().split("T")[0], todayNight.toISOString().split("T")[0])
    } catch (e) {
        console.log(e)
    }

    let grades = null
    const htmlGradeElement = document.getElementById("grades-content")
    try{
        grades = await GetGrades(getYear().toString())
    } catch (e) {
        console.log(e)
    }

    let events = null
    const htmlElementEvent = document.getElementById("event-content")
    try{
        events = await GetEvents()
    } catch (e) {
        console.log(e)
    }

    if(agenda){
        updateSchedule(agenda, htmlElement)
    } else {
        htmlElement.innerHTML = "Nothing to show"
        document.getElementsByClassName("schedule-section")[0].style.transform = "inherit"
    }

    if(grades){
        recapGrades(htmlGradeElement, grades)
    } else {
        document.getElementById("grades-content").innerHTML = "<div class='grade-item'>Nothing to show</div>"
    }

    if(events){

        recapEvents(events)
    } else {
        document.getElementById("event-content").innerHTML = "Nothing to show"
    }

    /* Animate buttons */
    document.getElementById("backward-button").addEventListener("click", ()=>{
        // Ajoute la classe 'clicked' pour déclencher l'animation
        document.getElementById("backward-button").classList.add('clicked');
        popup("Not bound")

        // Retire la classe après l'animation pour permettre une nouvelle animation
        setTimeout(() => {
            document.getElementById("backward-button").classList.remove('clicked');
        }, 600); // Durée de l'animation en millisecondes
    })

    document.getElementById("forward-button").addEventListener( "click", ()=>{
        // Ajoute la classe 'clicked' pour déclencher l'animation
        document.getElementById("forward-button").classList.add('clicked');
        popup("Not bound")

        // Retire la classe après l'animation pour permettre une nouvelle animation
        setTimeout(() => {
            document.getElementById("forward-button").classList.remove('clicked');
        }, 600); // Durée de l'animation en millisecondes
    })

}


async function recapGrades(gradesList, grades) {
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
            const gradeElement = document.createElement('div');
            gradeElement.className = 'grade-item';

            const gradesHtml = grade.grades != null ? grade.grades.join(', ') : "";
            const examHtml = grade.exam != null ? grade.exam.join(', ') : "";

            // Enlever le préfixe "S1 -" ou "S2 -" du nom du cours
            const courseName = grade.course.replace(/^S[12] - /, '');

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

    // Mettre à jour les notes toutes les 10 secondes
    setInterval(displayGrades, 10000);
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
        console.log(event)
        container.appendChild(card);
    });
}

