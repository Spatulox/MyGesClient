import {GetAgenda, GetEvents, GetGrades, RefreshAgenda, ReturnRefreshScheduleState} from "../../wailsjs/go/backend/App";
import {getYear, capitalizeFirstLetter, formatDateWithDay, wait} from "../JS/functions";
import {updateSchedule} from "./schedule";
import {initGradesDisplay} from "./grades";

let displayGradeId = []
let displayEventsId = []
let prevNextCliked = false
let initialized = 0
let userShowTomorrow = 0

// Initialize in the recapEvent to avoid doing another function
function initDashboard(){
    // Avoid double initialization for no reason ?
    if(initialized === 1){
        return
    }
    initialized = 1
    document.getElementById("backward-button").addEventListener("click", () => handleButtonClick('backward'));
    document.getElementById("forward-button").addEventListener("click", () => handleButtonClick('forward'));
}

async function handleButtonClick(direction) {
    if (prevNextCliked) {
        popup(`Action en cours, veuillez patienter.`);
        return;
    }

    prevNextCliked = true;
    try {
        const button = document.getElementById(`${direction}-button`);
        button.classList.add('clicked');
        setTimeout(() => button.classList.remove('clicked'), 600);

        userShowTomorrow += direction === 'forward' ? 1 : -1;
        const agenda = await getTodayAgendaPlusDay(direction === 'forward' ? 1 : -1);
        const htmlElement = document.getElementById("schedule-content");

        if (agenda) {
            await updateSchedule(agenda, htmlElement);
        } else {
            printDate(htmlElement);
        }
    } catch (error) {
        console.error("Erreur lors du traitement :", error);
        popup("Une erreur est survenue. Veuillez réessayer.");
    } finally {
        prevNextCliked = false;
    }
}

export async function dashboard(){
    if(prevNextCliked){
        return
    }
    prevNextCliked = true
    try{
        const htmlElement = document.getElementById("schedule-content")
        let agenda = await getTodayAgendaPlusDay()

        let grades = null
        const htmlGradeElement = document.getElementById("grades-content")
        try{
            grades = await GetGrades(getYear().toString())
        } catch (e) {
            console.log(e)
        }

        let events = null
        try{
            events = await GetEvents()
        } catch (e) {
            console.log(e)
        }

        if(agenda){
            updateSchedule(agenda, htmlElement)
        } else {
            printDate(htmlElement)
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
    } catch (e) {
        console.log(e)
        popup("Impossible de mettre à jour l'accueil..")
    }


    prevNextCliked = false

    if(displayEventsId.length === 0){
        initDashboard()
    }

}


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

    // Mettre à jour les notes toutes les 10 secondes
    if (displayGradeId.length === 0) {
        displayGradeId.push(setInterval(displayGrades, 10000));
    }
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

    if(displayEventsId.length === 0){
        const intervalId = setInterval(() => recapEvents(events), 5000);
        displayEventsId.push(intervalId);
    }
}


export function stopAutomaticEventsInDashboard(){
    stopRecapEvents()
    stopDisplayingGrades()
}

// Fonction pour arrêter tous les intervalles
function stopRecapEvents() {
    while (displayEventsId.length > 0) {
        const intervalId = displayEventsId.pop();
        clearInterval(intervalId);
    }
}

// Fonction pour arrêter le setTimeout
function stopDisplayingGrades() {
    while (displayGradeId.length > 0) {
        const timeoutId = displayGradeId.pop();
        clearTimeout(timeoutId);
    }
}

async function getTodayAgendaPlusDay(direction = null) {

    const now = new Date();

    const isAfter6PM = now.getHours() >= 18;
    const autoShowTomorrow = isAfter6PM ? 1 : 0;

    if(userShowTomorrow <= -30){
        userShowTomorrow = -30
    }
    if(userShowTomorrow >= 30){
        userShowTomorrow = 30
    }

    // Créer une date pour aujourd'hui à minuit UTC
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    today.setUTCHours(0, 0, 0, 0);
    today.setUTCDate(today.getUTCDate() + userShowTomorrow + autoShowTomorrow);

    // Ajuster au lundi si c'est un dimanche
    if (today.getUTCDay() === 0) { // 0 représente dimanche
        today.setUTCDate(today.getUTCDate() + 1);
        userShowTomorrow += direction
    }

    // Créer une date pour aujourd'hui à 23:00 UTC
    const todayNight = new Date(today);
    todayNight.setUTCHours(20, 0, 0, 0);

    let theStill
    let agenda = null

    try {
        // Local Search
        agenda = await GetAgenda(today.toISOString().split("T")[0], todayNight.toISOString().split("T")[0])
        if(!agenda){
            // Online Search
            let count = 0
            while(await ReturnRefreshScheduleState() === 1 && count < 3){
                count++
                wait(1)
            }
            theStill = stillPopup("Recherche de votre emploi du temps..")
            agenda = await RefreshAgenda(today.toISOString().split("T")[0], todayNight.toISOString().split("T")[0])
        }

    } catch (e) {
        console.log(e)
    }

    if(theStill){
        stopStillPopup(theStill)
    }

    return agenda
}

function printDate(htmlElement){
    const now = new Date();

    const isAfter6PM = now.getHours() >= 18;
    const autoShowTomorrow = isAfter6PM ? 1 : 0;

    // Créer une date pour aujourd'hui à minuit UTC
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    today.setUTCDate(today.getUTCDate() + userShowTomorrow + autoShowTomorrow);
    today.setUTCHours(0, 0, 0, 0)

    // Ajuster au lundi si c'est un dimanche
    if (today.getUTCDay() === 0) { // 0 représente dimanche
        today.setUTCDate(today.getUTCDate() + 1);
        userShowTomorrow ++
    }

    htmlElement.innerHTML = `<h3>${capitalizeFirstLetter(today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>`;
    htmlElement.innerHTML += "Nothing to show"
    document.getElementsByClassName("schedule-section")[0].style.transform = "inherit"
}