import { GetEvents, GetGrades } from "../../wailsjs/go/backend/App";
import {
    capitalizeFirstLetter,
    formatDateWithDay,
} from "../JS/functions";
import { initGradesDisplay } from "./grades";
import { popup } from "../JS/popups";
import { getSchedule } from "./schedule";
import { structures } from "../../wailsjs/go/models";

const forwardButton = document.getElementById("forward-button") as HTMLElement | null;
const backwardButton = document.getElementById("backward-button") as HTMLElement | null;
const htmlScheduleElement = document.getElementById("schedule-content") as HTMLElement | null;
const htmlGradeElement = document.getElementById("grades-content") as HTMLElement | null;
let TODAY = new Date();
let agenda: structures.LocalAgenda[] | undefined = undefined;
let scheduleTimer: ReturnType<typeof setTimeout> | null = null

export async function dashboard(): Promise<void> {
    TODAY.setUTCHours(5, 0, 0, 0);
    try {
        await handleAgenda();
        await handleGrades();
        await handleEvents();
    } catch (e) {
        console.log(e);
        printDate();
        popup("Impossible de mettre à jour l'accueil..");
    }
}

forwardButton?.addEventListener("click", async () => {
    hideDashboardButtons()
    await changeDay(1)
    await handleAgenda()
    showDashboardButtons()
});

backwardButton?.addEventListener("click", async () => {
    hideDashboardButtons()
    await changeDay(-1)
    await handleAgenda()
    showDashboardButtons()
});

// --------------------------------------------------------------------------------------- //

async function handleAgenda(): Promise<void> {
    if (!htmlScheduleElement) return;

    const tomorrowMidnight = new Date(TODAY);
    tomorrowMidnight.setUTCHours(22, 0, 0, 0);
    printDate();

    let agenda_new: structures.LocalAgenda[] | undefined = undefined;
    while (!agenda_new) {
        agenda_new = await getSchedule(
            TODAY.toISOString().split("T")[0],
            tomorrowMidnight.toISOString().split("T")[0]
        );
        if(!agenda_new){
            printDate()
            return
        }
        if (agenda_new && JSON.stringify(agenda) !== JSON.stringify(agenda_new)) {
            agenda = agenda_new;
            await updateScheduleDashboard(agenda);
            const section = document.getElementsByClassName("schedule-section")[0] as HTMLElement | undefined;
            if (section) section.style.transform = "translateY(-70px)";
        } else {
            agenda = agenda_new
        }
    }
}

async function handleGrades(): Promise<void> {
    if (!htmlGradeElement) return;

    try {
        const grades = await GetGrades() as structures.LocalGrades[];
        if (grades) {
            recapGrades(htmlGradeElement, grades);
        } else {
            htmlGradeElement.innerHTML = "<div class='grade-item'>Aucune Notes</div>";
        }
    } catch {
        htmlGradeElement.innerHTML = "<div class='grade-item'>Aucune Notes</div>";
    }
}

export async function handleEvents(): Promise<void> {
    const eventContent = document.getElementById("event-content") as HTMLElement | null;
    if (!eventContent) return;

    try {
        const events = await GetEvents() as structures.Event[];
        if (events) {
            recapEvents(events);
        } else {
            eventContent.innerHTML = "Aucun Évènement";
        }
    } catch {
        eventContent.innerHTML = "Aucun Évènement";
    }
}

// --------------------------------------------------------------------------------------- //

function recapGrades(gradesList: HTMLElement, grades: structures.LocalGrades[]): void {
    // Fonction pour obtenir 3 éléments aléatoires d'un tableau
    function getRandomElements<T>(array: T[], count: number): T[] {
        let shuffled = array.slice(0), i = array.length, min = i - count, temp: T, index: number;
        while (i-- > min) {
            index = Math.floor((i + 1) * Math.random());
            temp = shuffled[index];
            shuffled[index] = shuffled[i];
            shuffled[i] = temp;
        }
        return shuffled.slice(min);
    }

    // Fonction pour afficher les notes
    function displayGrades(): void {
        gradesList.innerHTML = ''; // Nettoyer la liste existante
        const selectedGrades = getRandomElements(grades, 3);

        selectedGrades.forEach(grade => {
            const { gradeElement, courseName, gradesHtml, examHtml } = initGradesDisplay(grade);

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

function createEventCard(event: structures.Event): HTMLDivElement {
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

function recapEvents(events: structures.Event[]): void {
    const container = document.getElementById('events-container') as HTMLElement | null;
    if (!container) return;
    container.innerHTML = "";
    events.forEach(event => {
        const card = createEventCard(event);
        container.appendChild(card);
    });
}

export async function updateScheduleDashboard(agenda: structures.LocalAgenda[]): Promise<void> {
    if (!htmlScheduleElement) return;

    htmlScheduleElement.innerHTML = `<h3>${capitalizeFirstLetter(TODAY.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>`;

    agenda.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.className = 'course-card';
        let courseName = course.agenda_name.includes("S1 - ")
            ? course.agenda_name.split("S1 - ")[1]
            : (course.agenda_name.includes("S2 - ")
                ? course.agenda_name.split("S2 - ")[1]
                : course.agenda_name);
        courseName = capitalizeFirstLetter(courseName + "");
        courseElement.innerHTML = `
            <h3 style="color: ${course.room.color!.Valid ? course.room.color!.String : "#FFFFFF"}">${courseName}</h3>
            <p>${course.start_date.split('T')[1].substring(0, 5)} - ${course.end_date.split('T')[1].substring(0, 5)}</p>
            <p>Prof: ${course.discipline.Teacher.teacher}</p>
        `;

        if (course.room.name.Valid) {
            courseElement.innerHTML += `<p>Salle: ${course.room.name.String} (${course.room.campus.String})</p>`;
        }

        courseElement.innerHTML += `<p>Type: ${course.type}</p>`;
        if (course.modality) {
            courseElement.innerHTML += `<p>Modalité: ${course.modality}</p>`;
        }
        if (course.comment) {
            courseElement.innerHTML += `<p>Commentaire: ${course.comment}</p>`;
        }

        htmlScheduleElement.appendChild(courseElement);
    });
}

async function changeDay(direction: number): Promise<void> {
    if (!TODAY) {
        TODAY = new Date();
    }
    restartTimer()

    TODAY.setUTCDate(TODAY.getUTCDate() + direction);
    TODAY.setUTCHours(5, 0, 0, 0);
    if (TODAY.getUTCDay() === 0) {
        TODAY.setUTCDate(TODAY.getUTCDate() + direction);
    }
    console.log(TODAY.toISOString());
}

function printDate(): void {
    if (!htmlScheduleElement) return;
    try {
        htmlScheduleElement.innerHTML = `<h3>${capitalizeFirstLetter(TODAY.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>`;
        htmlScheduleElement.innerHTML += "Aucun Agenda";
        const section = document.getElementsByClassName("schedule-section")[0] as HTMLElement | undefined;
        if (section) section.style.transform = "inherit";
    } catch (e) {
        console.log(e);
    }
}

function restartTimer() {
    if (scheduleTimer) clearTimeout(scheduleTimer);
    scheduleTimer = setTimeout(async () => {
        // Schedule is right now
        hideDashboardButtons()
        let TODAY = new Date();
        TODAY.setUTCHours(5, 0, 0, 0);
        await handleAgenda()
        showDashboardButtons()
        
    }, 60000);
}

function hideDashboardButtons(){
    if (!forwardButton || !backwardButton) return;

    forwardButton.style.opacity = "0";
    forwardButton.style.pointerEvents = 'none';
    backwardButton.style.opacity = "0";
    backwardButton.style.pointerEvents = 'none';
}
function showDashboardButtons(){
    if (!forwardButton || !backwardButton) return;

    forwardButton.style.opacity = "1";
    forwardButton.style.pointerEvents = 'auto';
    backwardButton.style.opacity = "1";
    backwardButton.style.pointerEvents = 'auto';
}