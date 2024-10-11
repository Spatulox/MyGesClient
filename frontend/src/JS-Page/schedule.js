import { CheckXTimeInternetConnection, GetAgenda, RefreshAgenda } from "../../wailsjs/go/backend/App";
import {capitalizeFirstLetter, getMonday, getSaturday, log} from "../JS/functions";

let addButton

async function initCreateEvent(){
    addButton = document.getElementById('open-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const createEventBtn = document.getElementById('create-btn');
    const eventForm = document.getElementById('event-form');
    const overlay = document.getElementById('overlay');

    addButton.addEventListener('click', () => {
        addButton.classList.remove("initial")
        addButton.classList.add('active');
        overlay.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });

    createEventBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Handle event creation here

        // If event successfully created
        closeModal();
        clearForm();
    });

    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
    });

    // Prevent closing when clicking inside the modal
    addButton.querySelector('.modal').addEventListener('click', (e) => {
        e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
        // Vérifier si le clic est en dehors de addButton
        if (!addButton.contains(e.target) && addButton.classList.contains('active')) {
            closeModal();
        }
    });
}

function closeModal() {
    addButton.classList.remove('active');
    overlay.style.display = 'none';
}

function clearForm() {
    document.getElementById('event-name').value = '';
    document.getElementById('event-description').value = '';
    document.getElementById('event-start').value = '';
    document.getElementById('event-end').value = '';
    document.getElementById('event-color').value = '#5865f2';
}


export async  function schedule(){

    const replace = document.getElementById("replace")
    replace.style.height = "auto"

    initCreateEvent()

    // Get the full week schedule
    const monday = getMonday()
    const saturday = getSaturday()
    const agenda = await GetAgenda(monday.toISOString().split("T")[0], saturday.toISOString().split("T")[0])
    const calendarGrid = document.getElementById("calendar-grid")


    try{
        const agendaBeta = await GetAgenda("2024-09-23", "2024-09-28")
        printSchedule(agendaBeta, calendarGrid)
    } catch (e) {
        popup(e)
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


/*
document.addEventListener('click', function(e) {
    const lessons = document.querySelectorAll('.lesson');
    const lessonsArray = Array.from(lessons);
    const plusAddEvent = document.getElementById('plusAddEvent')
    const plusAddEventImg = document.getElementById('plusAddEventImg')
    const isClickInsideLesson = lessonsArray.some(lesson => lesson.contains(e.target));

    const validerEvent = document.getElementById('validerEvent')


    // Create an event
    if(e.target.id === validerEvent.id){
        const inputs = document.querySelectorAll('#plusAddEvent input');
        const textDesc = document.getElementsByTagName('textarea')[0];

        let inputDic = {}
        inputs.forEach((input, index) => {
            if (index < inputs.length - 1) {
                inputDic[input.name] = input.value
            }
        });

        inputDic["description"] = textDesc.value

        // Check info format
        if(isNaN(new Date (inputDic.date))){
            popup("Il faut mettre une date valide")
            log("Wrong date format")
            return
        }

        if (new Date (inputDic.date) < new Date().setUTCDate(0,0,0,0)){
            popup('Impossible de créer un évènement avant aujourd\'hui')
            return
        }

        if(isNaN(parseInt(inputDic.hour)) || isNaN(parseInt(inputDic.minutes))){
            popup("Il faut mettre des nombres pour les heures et les minutes")
            log("Wrong hour and/or minutes format")
            return
        }

        if(parseInt(inputDic.hour) < 0 || parseInt(inputDic.hour) > 24){
            popup("Il faut spécifier les heures entre 0 et 24")
            log("Wrong hour int")
            return
        }

        if(parseInt(inputDic.minutes) < 0 || parseInt(inputDic.minutes) > 59){
            popup("Il faut spécifier les minutes entre 0 et 59")
            log("Wrong hour int")
            return
        }

        if(inputDic.description === ""){
            popup("Veuiller entrer une description")
            log("No description entered")
            return
        }

        // Refactor informations
        let tmp = inputDic.date.split('-')
        inputDic.date = tmp[2]+"/"+tmp[1]+"/"+tmp[0]
        let hour = inputDic.hour + ":" + inputDic.minutes + ":00"
        let color = inputDic.color
        let description = inputDic.description

        const template = {
            date: {
                [hour]: {
                    color: color,
                    description: description
                }
            }
        };

        //--------------------------------//
        // CALL THE BACKEND TO SAVE EVENT //
        //--------------------------------//

        popup('Rappel enregistré !')

        // Close the popup to create event
        plusAddEvent.classList.remove('active')
        plusAddEventImg.src = "./src/assets/images/plus_logo_noir.png"

        // Remove informations
        inputs.forEach((input, index) => {
            if (index < inputs.length - 1) {
                input.value = ""
            }
        });
        textDesc.value = ""

        return

    }

    if (!isClickInsideLesson) {
        lessonsArray.forEach(lesson => {
            lesson.classList.remove('bigAgenda');
        });
    }

    try{
        if (e.target.closest('#plusAddEvent')) {
            // L'élément ou l'un de ses parents a l'id "plusAddEvent"
            plusAddEvent.classList.add('active')
            plusAddEventImg.src = "./src/assets/images/GES_logo.png"
        } else {
            plusAddEvent.classList.remove('active')
            plusAddEventImg.src = "./src/assets/images/plus_logo_noir.png"
            // L'élément n'a pas l'id "plusAddEvent" et n'a pas d'ancêtres avec cet id
        }
    }
    catch{
        console.log("No plusAddEvent tag")
    }

});
*/