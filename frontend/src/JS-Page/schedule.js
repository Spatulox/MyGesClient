import { GetAgenda, SaveEvents } from "../../wailsjs/go/backend/App";
import {capitalizeFirstLetter, getMonday, getSaturday} from "../JS/functions";

let scheduleTimeoutId = []

export async  function schedule(){
    const replace = document.getElementById("replace")
    replace.style.height = "auto"

    const prevWeek = document.getElementById("prev-week")
    const nextWeek = document.getElementById("next-week")

    prevWeek.addEventListener("click", ()=>{
        popup("Not Bound")
    })
    nextWeek.addEventListener("click", ()=>{
        popup("Not Bound")
    })

    try{
        // Get the full week schedule
        const monday = getMonday()
        const saturday = getSaturday()
        //const agenda = await GetAgenda(monday.toISOString().split("T")[0], saturday.toISOString().split("T")[0])
        const calendarGrid = document.getElementById("calendar-grid")
        const currentWeek = document.getElementById("current-week")

        // Créer un formateur de date pour le jour de la semaine
        const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });

        // Créer un formateur de date pour le jour et le mois
        const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

        // Formater les dates
        const mondayFormatted = `${weekdayFormatter.format(monday)} ${dateFormatter.format(monday)}`;
        const saturdayFormatted = `${weekdayFormatter.format(saturday)} ${dateFormatter.format(saturday)}`;

        // Mettre à jour le texte
        currentWeek.textContent = `${capitalizeFirstLetter(mondayFormatted)} --- ${capitalizeFirstLetter(saturdayFormatted)}`;

        const agenda = await GetAgenda("2024-09-23", "2024-09-28")
        if(agenda){
            printSchedule(agenda, calendarGrid)
        } else {
            calendarGrid.innerHTML = "<div class='day-column'>Nothing to show</div>"
        }
    } catch (e) {
        popup(e)
    }

    if (scheduleTimeoutId.length === 0) {
        scheduleTimeoutId.push(setInterval(schedule, 5000));
    }

}

// Fonction pour arrêter le setTimeout
export function stopSchedule() {
    while (scheduleTimeoutId.length > 0) {
        const timeoutId = scheduleTimeoutId.pop(); // Retirer le dernier identifiant du tableau
        clearTimeout(timeoutId); // Arrêter le timeout
    }
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
    const now = new Date();
    const isAfter6PM = now.getHours() >= 18;
    const scheduleDate = isAfter6PM ? new Date(now.setDate(now.getDate() + 1)) : now;
    if(printCurrDate){
        finalHtmlElement.innerHTML = `<h3>${capitalizeFirstLetter(scheduleDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>`;
    }

    agenda.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.className = 'course-card';
        let courseName = course.agenda_name.includes("S1") ? course.agenda_name.split("S1 - ")[1] : (course.agenda_name.includes("S2 -") ? course.agenda_name.split("S2 - ") : course.agenda_name)
        courseName = capitalizeFirstLetter(courseName)
        courseElement.innerHTML = `
            <h3>${courseName}</h3>
            <p>${course.start_date.split('T')[1].substring(0, 5)} - ${course.end_date.split('T')[1].substring(0, 5)}</p>
            <p>Prof: ${course.discipline.Teacher.teacher}</p>
            <p>Salle: ${course.room.name} (${course.room.campus})</p>
            <p>Type: ${course.type}</p>
            <p>Modalité: ${course.modality}</p>
        `;
        finalHtmlElement.appendChild(courseElement);
    });
}

/*export async function updateGrades(grades, finalHtmlElement) {
    grades.forEach(grade => {
        const gradeElement = document.createElement('div');
        gradeElement.className = 'grade-item';
        gradeElement.innerHTML = `
            <h3>${grade.discipline.name}</h3>
            <p>Note: ${grade.grade}/20</p>
            <p>Coefficient: ${grade.discipline.coef || 'N/A'}</p>
            <p>Professeur: ${grade.discipline.teacher.teacher_name}</p>
        `;
        finalHtmlElement.appendChild(gradeElement);
    });
}*/

/*export async function updateAbsences(absences, finalHtmlElement) {
    absences.forEach(absence => {
        const absenceElement = document.createElement('div');
        absenceElement.className = 'absence-item';
        absenceElement.innerHTML = `
            <h3>${absence.course_name}</h3>
            <p>Date: ${new Date(absence.date).toLocaleDateString('fr-FR')}</p>
            <p>Raison: ${absence.reason || 'Non spécifiée'}</p>
        `;
        finalHtmlElement.appendChild(absenceElement);
    });
}*/

/*updateSchedule();
updateGrades();
updateAbsences();*/