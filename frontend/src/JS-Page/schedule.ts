import { CheckInternetConnection, GetAgenda, RefreshAgenda } from "../../wailsjs/go/backend/App";
import { structures } from "../../wailsjs/go/models";
import {
    capitalizeFirstLetter,
    getDateInfo,
    scrollMainPart,
    toLocalHourString,
    escapeHtml,
    safeColor
} from "../JS/functions";
import { stillPopup, stopStillPopup } from "../JS/popups";
import { addDays, getMonday, getSundayFromMonday, toYMD } from "../JS/dates";

let currentMonday: Date | null = null;
let isStillRunning = false;

export async function schedule(forceRefresh = false): Promise<void> {
    if (isStillRunning) return;
    isStillRunning = true;
    try {
        scrollMainPart();
        currentMonday = getMonday();
        const monday = currentMonday;
        const sunday = getSundayFromMonday(currentMonday);

        await updateSchedule(monday, sunday, forceRefresh);
    } finally {
        isStillRunning = false;
    }
}

export async function getSchedule(monday: string, sunday: string, forceRefresh: boolean = false): Promise<structures.LocalAgenda[] | undefined> {
    try {
        let agenda: structures.LocalAgenda[] | undefined;

        // saved monday <= today monday's week || no internet connection => not refresh past/today's schedule OR get the local schedule when no internet
        const isPastOrCurrentWeek = currentMonday !== null && currentMonday <= getMonday();
        if (isPastOrCurrentWeek || !(await CheckInternetConnection())) {
            agenda = await GetAgenda(monday, sunday);
            console.log("Chargement de l'agenda enregistré...");
        }

        let still: string | undefined
        if (!agenda || forceRefresh) {
            if (forceRefresh) {
                still = stillPopup("Rafraichissement forcé");
            }
            try {
                agenda = await RefreshAgenda(monday, sunday);
            } catch (e) {
                console.log(e);
            }
            if(still){
                stopStillPopup(still);
            }
        }
        return agenda;
    } catch (e) {
        console.log(e);
    }
}

async function updateSchedule(monday: Date, sunday: Date, forceRefresh: boolean): Promise<void> {
    clearSchedule();
    printScheduleTitle(monday, sunday);
    const agenda = await getSchedule(toYMD(monday), toYMD(sunday), forceRefresh);
    if (agenda) {
        agenda.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    }
    await printSchedule(agenda, monday, sunday);
}

function findClosestHour(courseStartDate: Date, possibleHours: string[]): string {
    let closestHour = possibleHours[0];
    let minDifference = Infinity;

    for (const hour of possibleHours) {
        const [h, m] = hour.split(':').map(Number);
        const possibleDate = new Date(courseStartDate);
        possibleDate.setUTCHours(h, m, 0, 0);

        const difference = Math.abs(courseStartDate.getTime() - possibleDate.getTime());

        if (difference < minDifference) {
            minDifference = difference;
            closestHour = hour;
        }
    }

    return closestHour;
}

async function printSchedule(agenda: structures.LocalAgenda[] | undefined, monday: Date, saturday: Date): Promise<void> {
    printScheduleTitle(monday, saturday);
    if (!agenda) return;

    // Effacer le contenu existant
    document.querySelectorAll<HTMLElement>('.day-column').forEach(column => column.innerHTML = '');

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const possibleHours = ["08:00", "09:45", "11:30", "13:00", "14:00", "15:45", "17:30", "19:15", "21:00"];

    function createEmptyEvent(hour: string): HTMLDivElement {
        const emptyEventElement = document.createElement('div');
        emptyEventElement.className = 'event empty';
        emptyEventElement.innerHTML = `<p>${hour}</p>`;
        return emptyEventElement;
    }

    function createDynamicDateArray(startDate: Date): Date[] {
        return possibleHours.map(hour => {
            const [hours, minutes] = hour.split(':').map(Number);
            return new Date(Date.UTC(
                startDate.getUTCFullYear(),
                startDate.getUTCMonth(),
                startDate.getUTCDate(),
                hours,
                minutes,
                0
            ));
        });
    }

    for (let dayIndex = 1; dayIndex <= 6; dayIndex++) { // 1 = lundi, 6 = samedi
        const dayColumn = document.getElementById(dayNames[dayIndex]);
        if (!dayColumn) continue;

        let currentHourIndex = 0;

        agenda.forEach(course => {
            const courseStartDate = new Date(course.start_date);
            const courseEndDate = new Date(course.end_date);
            const courseDayOfWeek = courseStartDate.getUTCDay();

            if (courseDayOfWeek === dayIndex) {
                const possibleHoursAsDate = createDynamicDateArray(courseStartDate);

                const closestHour = findClosestHour(courseStartDate, possibleHours);
                const closestHourIndex = possibleHours.indexOf(closestHour);

                while (currentHourIndex < closestHourIndex) {
                    dayColumn.appendChild(createEmptyEvent(possibleHours[currentHourIndex]));
                    currentHourIndex++;
                }

                const courseElement = document.createElement('div');
                courseElement.className = 'event';
                courseElement.setAttribute('data-info', String(course.agenda_id));

                if (course.room.name?.String) {
                    courseElement.innerHTML = `<p class="event-time">${toLocalHourString(courseStartDate)} - ${toLocalHourString(courseEndDate)} <span class="room">${escapeHtml(course.room.name.String)}</span></p>`;
                } else {
                    courseElement.innerHTML = `<p class="event-time">${toLocalHourString(courseStartDate)} - ${toLocalHourString(courseEndDate)}</p>`;
                }

                const delta = courseStartDate.getTime() - possibleHoursAsDate[currentHourIndex].getTime();
                const deltaMinutes = Math.floor(delta / (1000 * 60));
                const courseDuration = (courseEndDate.getTime() - courseStartDate.getTime()) / (1000 * 60);

                const isPauseTime = (courseStartDate.getUTCHours() >= 13) && (courseStartDate.getUTCHours() < 14);
                const standardDuration = isPauseTime ? 60 : 90;

                const course_name = clearAgendaName(course);

                const maxHeight = courseElement.style.height ? parseFloat(courseElement.style.height) : (isPauseTime ? 60 : 90);

                const translateYUp = `calc(${deltaMinutes}px ${isPauseTime ? "*1.5" : ""} + ${(courseDuration / standardDuration) - 2}px)`;
                const translateYDown = `calc(${deltaMinutes}px ${isPauseTime ? "*1.5" : ""} - ${(courseDuration / standardDuration) - 2}px)`;

                if (courseStartDate.getTime() > possibleHoursAsDate[currentHourIndex].getTime()) {
                    courseElement.style.transform = `translateY(${translateYUp})`;
                } else if (courseStartDate.getTime() < possibleHoursAsDate[currentHourIndex].getTime()) {
                    courseElement.style.transform = `translateY(${translateYDown})`;
                }

                if (courseDuration < standardDuration) {
                    const minutesDifference = standardDuration - courseDuration;
                    courseElement.style.height = `calc(${maxHeight - minutesDifference}% - ${(courseDuration / standardDuration) - 2}px)`;
                } else if (courseDuration > standardDuration) {
                    const minutesDifference = courseDuration - standardDuration;
                    courseElement.style.height = `calc(${maxHeight + minutesDifference}% - ${(courseDuration % standardDuration) - 2}px)`;
                }

                const title = document.createElement('h3');
                title.textContent = course.type === "Examen"
                    ? `${capitalizeFirstLetter(course_name)} - ${course.type}`
                    : capitalizeFirstLetter(course_name);
                title.style.color = safeColor(course.room.color?.Valid ? course.room.color.String : "");
                courseElement.appendChild(title);

                courseElement.addEventListener('click', () => {
                    console.log(course);
                    showModal(course);
                });

                dayColumn.appendChild(courseElement);

                currentHourIndex++;
            }
        });
    }

    setupModal();
}

function clearAgendaName(course: structures.LocalAgenda): string {
    return course.agenda_name.includes(" - ") ? course.agenda_name.split(" - ")[1] : course.agenda_name;
}

function clearSchedule(): void {
    const dayIds = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    dayIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });
}

function showModal(course: structures.LocalAgenda): void {
    const modal = document.getElementById('modal-event');
    const modalTitle = document.getElementById('modal-title');
    const modalInfo = document.getElementById('modal-info');

    if (!modal || !modalTitle || !modalInfo) {
        console.error("Modal elements are missing in the DOM.");
        return;
    }
    modalTitle.textContent = capitalizeFirstLetter(clearAgendaName(course)) || 'Cours';
    modalTitle.style.color = safeColor(course.room.color?.Valid ? course.room.color.String : "");
    modalInfo.innerHTML = `
        <p><strong>Type :</strong> ${escapeHtml(course.type || 'Non spécifié')}</p>
        <p><strong>Horaire :</strong> ${toLocalHourString(new Date(course.start_date))} - ${toLocalHourString(new Date(course.end_date))}</p>
        <p><strong>Salle :</strong> ${escapeHtml(formatRoom(course))}</p>
        <p><strong>Modalité :</strong> ${escapeHtml(course.modality || 'Non spécifiée')}</p>
        <p><strong>Discipline :</strong> ${escapeHtml(course.discipline?.trimester || 'Non spécifiée')}</p>
        <p><strong>Professeur(e) :</strong> ${escapeHtml(course.discipline?.Teacher?.teacher || 'Non spécifiée')}</p>
        <p><strong>Commentaire :</strong> ${escapeHtml(course.comment || 'Aucun')}</p>
    `;
    modal.style.display = 'block';
}

function formatRoom(course: structures.LocalAgenda): string {
    const room = `${course.room.name?.String ?? ''} ${course.room.campus?.String ?? ''}`.trim();
    if (!room) return 'Non spécifiée';
    return (course.type === "Examen" ? "Probably " : "") + room;
}

function setupModal(): void {
    const modal = document.getElementById('modal-event');
    const closeBtn = document.getElementsByClassName('close')[0] as HTMLElement | undefined;

    if (!modal || !closeBtn) return;

    closeBtn.onclick = function () {
        modal.style.display = 'none';
    };

    window.onclick = function (event: MouseEvent) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function printScheduleTitle(monday: Date, sunday: Date): void {
    const saturday = addDays(sunday, -1);

    const [mondayFormatted, mondayDayName] = getDateInfo(monday.toLocaleDateString('fr-FR'));
    const [saturdayFormatted, saturdayDayName] = getDateInfo(saturday.toLocaleDateString('fr-FR'));
    const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    const mondayDay = monday.getDate();
    const mondayMonth = mois[monday.getMonth()];
    const saturdayDay = saturday.getDate();
    const saturdayMonth = mois[saturday.getMonth()];

    const title = document.getElementById("week");
    if (title) {
        title.textContent = `🗓️ ${mondayDayName} ${mondayDay} ${capitalizeFirstLetter(mondayMonth)} au ${saturdayDayName} ${saturdayDay} ${capitalizeFirstLetter(saturdayMonth)} 🗓️`;
    }

    const daysElements = ["lun-day", "mar-day", "mer-day", "jeu-day", "ven-day", "sam-day"];
    let currentDate = new Date(monday);

    for (let i = 0; i < daysElements.length; i++) {
        const dayEl = document.getElementById(daysElements[i]);
        if (dayEl) {
            dayEl.innerHTML = " " + currentDate.getDate();
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
}

// -------------------- switch Week -------------------- //

export async function changeWeek(direction: number, forceRefresh = false): Promise<void> {
    if (!currentMonday) {
        currentMonday = getMonday();
    }

    currentMonday = addDays(currentMonday, direction * 7);
    const currentSunday = getSundayFromMonday(currentMonday);

    await updateSchedule(currentMonday, currentSunday, forceRefresh);
}

document.getElementById("prev-week")?.addEventListener("click", async () => {
    const stillPop = stillPopup("Chargement de la semaine précédente");

    hideScheduleButtons();

    try {
        await changeWeek(-1);
    } catch (e) {
        console.log(e);
    }

    showScheduleButtons();
    stopStillPopup(stillPop);
});

document.getElementById("next-week")?.addEventListener("click", async () => {
    const stillPop = stillPopup("Chargement de la semaine prochaine");

    hideScheduleButtons();

    try {
        await changeWeek(1);
    } catch (e) {
        console.log(e);
    }

    showScheduleButtons();
    stopStillPopup(stillPop);
});

export function showScheduleButtons(): void {
    const prevButton = document.getElementById("prev-week");
    const nextButton = document.getElementById("next-week");
    const nowButton = document.getElementById("force-now");
    const refreshButton = document.getElementById("force-refresh");

    [prevButton, nextButton, nowButton, refreshButton].forEach(btn => {
        if (btn) {
            btn.style.opacity = "1";
            btn.style.pointerEvents = "auto";
        }
    });
}

export function hideScheduleButtons(): void {
    const prevButton = document.getElementById("prev-week");
    const nextButton = document.getElementById("next-week");
    const nowButton = document.getElementById("force-now");
    const refreshButton = document.getElementById("force-refresh");

    [prevButton, nextButton, nowButton, refreshButton].forEach(btn => {
        if (btn) {
            btn.style.opacity = "0";
            btn.style.pointerEvents = "none";
        }
    });
}