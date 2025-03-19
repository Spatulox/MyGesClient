import {GetAgenda, RefreshAgenda} from "../../wailsjs/go/backend/App";
import {capitalizeFirstLetter, getMonday, getSaturday, scrollMainPart, todayDate} from "../JS/functions";
import {popup, stillPopup, stopStillPopup} from "../JS/popups";

let scheduleTimeoutId = []
let monday = getMonday()
let saturday = getSaturday()
let nextPrevActive = true
let thisWeekAlreadyFetched = false
let prevWeek = null
let nextWeek = null
let agenda = null

function initSchedule(){
    prevWeek = document.getElementById("prev-week")
    nextWeek = document.getElementById("next-week")

    if(!prevWeek || !nextWeek){
        console.log("Impossible de sélectionner les prevWeek et nextWeek")
        return
    }

    prevWeek.addEventListener("click", ()=>{
        if(nextPrevActive){
            getPrevWeek()
            thisWeekAlreadyFetched = false
            schedule()
        } else {
            popup("Plz wait")
        }
    })
    nextWeek.addEventListener("click", ()=>{
        if(nextPrevActive) {
            getNextWeek()
            thisWeekAlreadyFetched = false
            schedule()
        } else {
            popup("Plz wait")
        }
    })
}

export async  function schedule(forceRefresh = false){

    // Avoid useless API request and html overwrite
    if(thisWeekAlreadyFetched){
        return
    }
    scrollMainPart()
    /*let stillPopupId*/
    const today = new Date()

    try{

        nextPrevActive = false
        let bkpAgenda = agenda
        const calendarGrid = document.getElementById("calendar-grid")
        const currentWeek = document.getElementById("current-week")

        // If the today is in the requested week
        if(monday<= today && today <= saturday){
            agenda = await GetAgenda(monday.toISOString().split("T")[0], saturday.toISOString().split("T")[0])
        } else {
            agenda = null
        }

        // If the week requested doesn't not contains today
        if(!agenda && !nextPrevActive){
            /*stillPopupId = stillPopup("Recherche de votre agenda depuis MyGes")*/
            agenda = await RefreshAgenda(monday.toISOString().split("T")[0], saturday.toISOString().split("T")[0])
            thisWeekAlreadyFetched = true
        }
        nextPrevActive = true
        if(JSON.stringify(bkpAgenda) === JSON.stringify(agenda) && !forceRefresh){
            console.log("schedule4")
            return
        }
        printNothing(calendarGrid, currentWeek)

        if(agenda){
            calendarGrid.classList.remove('one-columns');
            calendarGrid.classList.remove('two-columns');
            calendarGrid.classList.remove('three-columns');
            calendarGrid.classList.remove('four-columns');
            await printSchedule(agenda, calendarGrid)
        } else {
            printNothing(calendarGrid, currentWeek)
        }

        const button = document.createElement("button")
        button.classList.add("btn")
        button.classList.add("btn-create")
        button.innerHTML = "Rafaîchir l'agenda"
        button.style.gridColumn = "span 5"

        button.addEventListener("click", async ()=>{
            let still = stillPopup("Mise à jour forcée de votre emploi du temp")
            try{
                agenda = await RefreshAgenda(monday.toISOString().split("T")[0], saturday.toISOString().split("T")[0])
                schedule(true)
            } catch (e) {
                console.log(e)
                popup("Une erreur est survenue")
            }
            stopStillPopup(still)
        })

        calendarGrid.appendChild(button)

    } catch (e) {
        console.log(e)
    }

    /*stopStillPopup(stillPopupId)*/
    nextPrevActive = true

    // Is only execute one time
    if (scheduleTimeoutId.length === 0) {
        scheduleTimeoutId.push(setInterval(schedule, 10000));
    }

    if(prevWeek == null){
        initSchedule()
    }

}

// Fonction pour arrêter le setTimeout
export function stopSchedule() {
    while (scheduleTimeoutId.length > 0) {
        const timeoutId = scheduleTimeoutId.pop(); // Retirer le dernier identifiant du tableau
        clearTimeout(timeoutId); // Arrêter le timeout
    }
    prevWeek = null
    nextWeek = null
    thisWeekAlreadyFetched = false
}

function printNothing(calendarGrid, currentWeek){

    // Créer un formateur de date pour le jour de la semaine
    const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });

    // Créer un formateur de date pour le jour et le mois
    const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

    // Formater les dates
    const mondayFormatted = `${weekdayFormatter.format(monday)} ${dateFormatter.format(monday)}`;
    const saturdayFormatted = `${weekdayFormatter.format(saturday)} ${dateFormatter.format(saturday)}`;

    // Mettre à jour le texte
    currentWeek.textContent = `🗓️ ${capitalizeFirstLetter(mondayFormatted)} au ${capitalizeFirstLetter(saturdayFormatted)} 🗓️`;

    calendarGrid.classList.add('one-columns');
    calendarGrid.innerHTML = "<div class='day-column'>Aucun Agenda</div>"
}

async function printSchedule(agenda, calendarGrid) {
    // Trier l'agenda par date de début
    agenda.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    // Grouper les événements par jour
    const groupedAgenda = agenda.reduce((acc, event) => {
        const date = new Date(event.start_date).toDateString();
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(event);
        return acc;
    }, {});

    // Vider le contenu existant
    calendarGrid.innerHTML = '';

    // Count the number of days inside the schedule to assign correct grid to the parent
    let groupedAgendaLength = Object.keys(groupedAgenda).length

    if(groupedAgendaLength === 4){
        calendarGrid.classList.add('four-columns');
    } else if(groupedAgendaLength === 3){
        calendarGrid.classList.add('three-columns');
    } else if(groupedAgendaLength === 2){
        calendarGrid.classList.add('two-columns');
    } else if(groupedAgendaLength === 1){
        calendarGrid.classList.add('one-columns');
    }


    // Créer un élément pour chaque jour et le remplir
    for (const [date, events] of Object.entries(groupedAgenda)) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day-column';

        // Créer un en-tête pour le jour
        const dateObj = new Date(date);
        const dateHeader = document.createElement('h2');
        dateHeader.textContent = capitalizeFirstLetter(dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
        dayElement.appendChild(dateHeader);

        // Créer un conteneur pour les événements du jour
        const eventsContainer = document.createElement('div');
        //eventsContainer.className = 'course-card';

        // Utiliser updateSchedule pour remplir les événements du jour
        await updateSchedule(events, eventsContainer, false);

        dayElement.appendChild(eventsContainer);
        calendarGrid.appendChild(dayElement);
    }
}


/*
    Is used to fill the schedule in dashboard.html and schedule.html
    Only create a schedule for one day
 */
export async function updateSchedule(agenda, finalHtmlElement, printCurrDate = true) {
    const agendaDate = new Date(agenda[0].start_date)
    agendaDate.setUTCHours(0, 0, 0, 0)
    if(printCurrDate){
        finalHtmlElement.innerHTML = `<h3>${capitalizeFirstLetter(agendaDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>`;
    }

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


        finalHtmlElement.appendChild(courseElement);
    });
}

function checkDiffTime(direction){
    let currMonday = getMonday()

    let diffTime = monday.getTime() - currMonday.getTime();

    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function getNextWeek(){
    /*if(checkDiffTime() >= 30){
        return
    }*/

    monday.setDate(monday.getDate() + 7)
    saturday.setDate(saturday.getDate() + 7)
    schedule()
}

function getPrevWeek(){
    if(checkDiffTime() <= -30){
        return
    }

    monday.setDate(monday.getDate() - 7)
    saturday.setDate(saturday.getDate() - 7)
    schedule()
}