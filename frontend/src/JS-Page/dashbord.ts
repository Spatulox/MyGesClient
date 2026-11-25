import { GetEvents, GetGrades } from "../../wailsjs/go/backend/App";
import {
    capitalizeFirstLetter,
    cleanCourseName,
    escapeHtml,
    formatDateWithDay,
    safeColor,
} from "../JS/functions";
import { formatGrade, gradesOfSemester, Semester, semesterOf, summarizeSemester } from "../JS/gradesCalc";
import { popup } from "../JS/popups";
import { getSchedule } from "./schedule";
import { structures } from "../../wailsjs/go/models";
import { addDays, startOfDay, toYMD } from "../JS/dates";

const forwardButton = document.getElementById("forward-button") as HTMLElement | null;
const backwardButton = document.getElementById("backward-button") as HTMLElement | null;
const htmlScheduleElement = document.getElementById("schedule-content") as HTMLElement | null;
const htmlGradeElement = document.getElementById("grades-content") as HTMLElement | null;
const gradesSemesterGroup = document.getElementById("grades-recap-semesters") as HTMLElement | null;
const gradesRecapLink = document.getElementById("grades-recap-link") as HTMLAnchorElement | null;
// Day displayed in the dashboard schedule, at local midnight
let TODAY = startOfDay();
let scheduleTimer: ReturnType<typeof setTimeout> | null = null

export async function dashboard(): Promise<void> {
    TODAY = startOfDay();
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

forwardButton?.addEventListener("click", () => moveDay(1));
backwardButton?.addEventListener("click", () => moveDay(-1));

async function moveDay(direction: number): Promise<void> {
    hideDashboardButtons()
    try {
        await changeDay(direction)
        await handleAgenda()
    } catch (e) {
        console.log(e);
    } finally {
        showDashboardButtons()
    }
}

// --------------------------------------------------------------------------------------- //

async function handleAgenda(): Promise<void> {
    if (!htmlScheduleElement) return;

    printDate();
    const day = toYMD(TODAY);
    const agenda = await getSchedule(day, day);
    if (!agenda || agenda.length === 0) {
        return;
    }

    await updateScheduleDashboard(agenda);
    const section = document.getElementsByClassName("schedule-section")[0] as HTMLElement | undefined;
    if (section) section.style.transform = "translateY(-70px)";
}

async function handleGrades(): Promise<void> {
    if (!htmlGradeElement) return;

    let grades: structures.LocalGrades[] = [];
    try {
        grades = (await GetGrades() as structures.LocalGrades[] | null) ?? [];
    } catch (e) {
        console.log(e);
    }
    recapGrades(htmlGradeElement, grades);
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

// ------------------------- Grades recap (S1 / S2) ------------------------- //

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const WATCHED_COURSES = 4;

// onclick : un seul handler, même après plusieurs visites
if (gradesRecapLink) {
    gradesRecapLink.onclick = (event: MouseEvent) => {
        event.preventDefault();
        // Same path as the sidebar: highlights "Notes" and loads the page
        document.querySelector<HTMLElement>('.loadPage[data-idpage="grades"]')?.click();
    };
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/** CSS class for a /20 value: orange under 10, blue from 14. */
function gradeTone(value: number): string {
    if (value < 10) return "is-low";
    if (value >= 14) return "is-high";
    return "is-mid";
}

/**
 * Show the grades recap. The semester shown by default is S2 as soon as there
 * is an S2 course (the current one), S1 otherwise; the toggle is hidden when
 * there is no S2 course.
 */
function recapGrades(container: HTMLElement, grades: structures.LocalGrades[]): void {
    const hasSemester2 = grades.some(grade => semesterOf(grade) === 2);
    if (gradesSemesterGroup) gradesSemesterGroup.hidden = grades.length === 0 || !hasSemester2;

    if (grades.length === 0) {
        container.innerHTML = "<div class='grades-recap-empty'>Aucune note</div>";
        return;
    }

    gradesSemesterGroup?.querySelectorAll<HTMLButtonElement>("button[data-semester]").forEach(button => {
        // onclick : un seul handler, même après plusieurs visites
        button.onclick = () => {
            renderGradesRecap(container, grades, button.dataset.semester === "2" ? 2 : 1);
        };
    });

    renderGradesRecap(container, grades, hasSemester2 ? 2 : 1);
}

function renderGradesRecap(container: HTMLElement, grades: structures.LocalGrades[], semester: Semester): void {
    gradesSemesterGroup?.querySelectorAll<HTMLButtonElement>("button[data-semester]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.semester === String(semester)));
    });

    const summary = summarizeSemester(gradesOfSemester(grades, semester));
    const average = summary.average;

    const averageShort = average === null ? "—" : formatGrade(average);
    const averageLong = average === null ? "—" : `${average.toFixed(2).replace(".", ",")} / 20`;
    const ringLabel = average === null
        ? "Aucune moyenne générale"
        : `Moyenne générale ${averageShort} sur 20`;
    const ringLength = average === null ? 0 : clamp(average, 0, 20) / 20 * RING_CIRCUMFERENCE;
    // A 0-length dash with round caps would still draw a dot
    const ringValue = ringLength > 0
        ? `<circle class="grades-recap-ring-value${average !== null && average < 10 ? " is-low" : ""}" cx="64" cy="64" r="${RING_RADIUS}"
               stroke-dasharray="${ringLength} ${RING_CIRCUMFERENCE}" transform="rotate(-90 64 64)"></circle>`
        : "";

    let best = "—";
    if (summary.best) {
        const bestName = escapeHtml(capitalizeFirstLetter(summary.best.name));
        // The name is cut with an ellipsis when too long, the average stays visible
        best = `<span class="grades-recap-best-name" title="${bestName}">${bestName}</span>
                <span>(${formatGrade(summary.best.average)})</span>`;
    }

    const watched = summary.graded.slice(0, WATCHED_COURSES).map(course => {
        const name = escapeHtml(capitalizeFirstLetter(course.name));
        const tone = gradeTone(course.average);
        const width = clamp(course.average, 0, 20) / 20 * 100;
        return `
            <li class="grades-recap-course">
                <span class="grades-recap-course-name" title="${name}">${name}</span>
                <div class="grades-recap-track" aria-hidden="true">
                    <div class="grades-recap-fill ${tone}" style="width: ${width}%"></div>
                    <div class="grades-recap-tick"></div>
                </div>
                <span class="grades-recap-course-average ${tone}">${formatGrade(course.average)}</span>
            </li>`;
    }).join("");

    container.innerHTML = `
        <div class="grades-recap-panel">
            <div class="grades-recap-bar">
                <span>Semestre ${semester}</span>
                <span class="grades-recap-count">${summary.graded.length} / ${summary.courses.length} matières notées</span>
            </div>
            <div class="grades-recap-overview">
                <div class="grades-recap-ring">
                    <svg viewBox="0 0 128 128" role="img" aria-label="${escapeHtml(ringLabel)}">
                        <circle class="grades-recap-ring-track" cx="64" cy="64" r="${RING_RADIUS}"></circle>
                        ${ringValue}
                    </svg>
                    <div class="grades-recap-ring-text" aria-hidden="true">
                        <span class="grades-recap-ring-average">${averageShort}</span>
                        <span class="grades-recap-ring-unit">/ 20</span>
                    </div>
                </div>
                <dl class="grades-recap-stats">
                    <div>
                        <dt>Moyenne générale</dt>
                        <dd>${averageLong}</dd>
                    </div>
                    <div>
                        <dt>ECTS en bonne voie</dt>
                        <dd>${formatGrade(summary.ectsOnTrack)} / ${formatGrade(summary.ectsTotal)}</dd>
                    </div>
                    <div>
                        <dt>Meilleure matière</dt>
                        <dd class="grades-recap-best">${best}</dd>
                    </div>
                    <div>
                        <dt>Sous 10</dt>
                        <dd class="${summary.belowTen > 0 ? "is-low" : ""}">${summary.belowTen}</dd>
                    </div>
                </dl>
            </div>
            <div class="grades-recap-watch">
                <div class="grades-recap-watch-head">
                    <h3>À surveiller</h3>
                    <span>Moyennes les plus basses</span>
                </div>
                <ul class="grades-recap-watch-list">
                    ${watched || "<li class='grades-recap-none'>Aucune matière notée</li>"}
                </ul>
                <span class="grades-recap-note">Le trait vertical marque 10/20. Seul le semestre choisi est compté.</span>
            </div>
        </div>`;
}

function createEventCard(event: structures.Event): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.style.borderLeftColor = safeColor(event.color);

    const startFormatted = formatDateWithDay(event.start_date);
    const endFormatted = formatDateWithDay(event.end_date);

    card.innerHTML = `
        <div class="event-header">
            <h3 class="event-name">${escapeHtml(event.name)}</h3>
        </div>
        <p class="event-description">${escapeHtml(event.description)}</p>
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
        const courseName = capitalizeFirstLetter(cleanCourseName(course.agenda_name));
        const color = safeColor(course.room.color?.Valid ? course.room.color.String : "", "#FFFFFF");
        // Used by the light theme, which shows the room color as a border instead
        courseElement.style.setProperty('--course-color', color);
        let html = `
            <h3 style="color: ${escapeHtml(color)}">${escapeHtml(courseName)}</h3>
            <p>${escapeHtml(course.start_date.split('T')[1].substring(0, 5))} - ${escapeHtml(course.end_date.split('T')[1].substring(0, 5))}</p>
            <p>Prof: ${escapeHtml(course.discipline.Teacher.teacher)}</p>
        `;

        if (course.room.name.Valid) {
            html += `<p>Salle: ${escapeHtml(course.room.name.String)} (${escapeHtml(course.room.campus.String)})</p>`;
        }

        html += `<p>Type: ${escapeHtml(course.type)}</p>`;
        if (course.modality) {
            html += `<p>Modalité: ${escapeHtml(course.modality)}</p>`;
        }
        if (course.comment) {
            html += `<p>Commentaire: ${escapeHtml(course.comment)}</p>`;
        }
        courseElement.innerHTML = html;

        htmlScheduleElement.appendChild(courseElement);
    });
}

async function changeDay(direction: number): Promise<void> {
    restartTimer()

    TODAY = addDays(TODAY, direction);
    // No course on Sunday: skip it
    if (TODAY.getDay() === 0) {
        TODAY = addDays(TODAY, direction);
    }
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
        TODAY = startOfDay();
        try {
            await handleAgenda()
        } catch (e) {
            console.log(e);
        } finally {
            showDashboardButtons()
        }
        
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