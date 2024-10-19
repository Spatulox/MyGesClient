import {GetAgenda, GetEvents, GetGrades, RefreshAgenda, ReturnRefreshScheduleState} from "../../wailsjs/go/backend/App";
import {
    getYear,
    capitalizeFirstLetter,
    formatDateWithDay,
    wait,
    getMonday,
    getSaturday,
} from "../JS/functions";
import {updateSchedule} from "./schedule";
import {initGradesDisplay} from "./grades";
import {stillPopup, stopStillPopup} from "../JS/popups";

let displayDashboardId = []
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

        const agenda = await getTodayAgendaPlusDay(direction === 'forward' ? 1 : -1, true);
        const htmlElement = document.getElementById("schedule-content");

        document.getElementsByClassName("schedule-section")[0].style.transform = "translateY(-70px)"

        if (agenda) {
            await updateSchedule(agenda, htmlElement);
            document.getElementsByClassName("schedule-section")[0].style.transform = "translateY(-70px)"
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
    const htmlElement = document.getElementById("schedule-content")
    prevNextCliked = true

    let still = stillPopup("Affichage de vos informations")
    try{
        const htmlGradeElement = document.getElementById("grades-content")

        Promise.all([
            handleAgenda(htmlElement),
            handleGrades(htmlGradeElement),
            handleEvents()
        ]).then(() => {

            prevNextCliked = false

            if(displayDashboardId.length === 0){
                displayDashboardId.push(setInterval(dashboard, 10000))
                initDashboard()
            }

        }).catch((error) => {
            prevNextCliked = false
            console.error("Une erreur s'est produite :", error);
        });

    } catch (e) {
        console.log(e)
        popup("Impossible de mettre à jour l'accueil..")
    }
    stopStillPopup(still)
}

// --------------------------------------------------------------------------------------- //

// Créez des fonctions pour chaque tâche
async function handleAgenda(htmlElement) {
    return getTodayAgendaPlusDay().then((agenda) => {
        if (agenda) {
            updateSchedule(agenda, htmlElement);
            document.getElementsByClassName("schedule-section")[0].style.transform = "translateY(-70px)";
        } else {
            printDate(htmlElement);
        }
    });
}

function handleGrades(htmlGradeElement) {
    return GetGrades(getYear().toString()).then((grades) => {
        if (grades) {
            recapGrades(htmlGradeElement, grades);
        } else {
            document.getElementById("grades-content").innerHTML = "<div class='grade-item'>Nothing to show</div>";
        }
    });
}

function handleEvents() {
    return GetEvents().then((events) => {
        if (events) {
            recapEvents(events);
        } else {
            document.getElementById("event-content").innerHTML = "Nothing to show";
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

// Fonction pour arrêter tous les intervalles
export function stopDashboardEvents() {
    while (displayDashboardId.length > 0) {
        const intervalId = displayDashboardId.pop();
        clearInterval(intervalId);
    }
    initialized = 0
}


function getDayWithDecalage(direction){
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
        today.setUTCDate(today.getUTCDate() + direction);
        userShowTomorrow += direction
    }

    return today
}

async function getTodayAgendaPlusDay(direction = null, showMessage = false) {
    const today = getDayWithDecalage(direction)

    if (today.getDay() === 0) {
        today.setDate(today.getDate() + 1);
    }
    // Créer une date pour aujourd'hui à 23:00 UTC
    const todayNight = new Date(today);
    todayNight.setUTCHours(24, 0, 0, 0);

    let theStill
    let agenda = null

    try {
        const monday = getMonday()
        const saturday = getSaturday()
        // Local Search
        if(monday<= today && today <= saturday) {
            agenda = await GetAgenda(today.toISOString().split("T")[0], todayNight.toISOString().split("T")[0])
        }

        if(!agenda){
            // Online Search
            let count = 0
            while(await ReturnRefreshScheduleState() === 1 && count < 3){
                count++
                wait(1)
            }
            if(showMessage){
                /*theStill = stillPopup("Recherche de votre emploi du temps..")*/
            }
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
    try{
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
    } catch (e) {
        console.log(e)
    }

}