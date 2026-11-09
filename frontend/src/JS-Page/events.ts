import { DeleteEvent, GetAllEvents, GetEventsLike } from "../../wailsjs/go/backend/App";
import { structures } from "../../wailsjs/go/models";
import { escapeHtml, formatDateWithDay, safeColor, scrollMainPart } from "../JS/functions";
import { popup } from "../JS/popups";


let isStillRunning = false;
let lastListRequest = 0;

export async function events(): Promise<void> {
    if (isStillRunning) {
        return;
    }

    isStillRunning = true;
    try {
        scrollMainPart();

        const searchBar = getSearchBar();
        if (!searchBar) {
            popup("Impossible de trouver la barre de recherche des événements.");
            return;
        }

        // oninput : un seul handler, même après plusieurs visites
        searchBar.oninput = () => {
            void refreshEventList();
        };

        await refreshEventList();
    } finally {
        isStillRunning = false;
    }
}

function getSearchBar(): HTMLInputElement | null {
    return document.getElementById("searchBar") as HTMLInputElement | null;
}

/**
 * Display every event, or only the ones matching the search bar when it is
 * filled. Responses that arrive after a newer request are ignored, so a slow
 * search can't overwrite the result of the latest one.
 */
async function refreshEventList(): Promise<void> {
    const request = ++lastListRequest;
    const search = getSearchBar()?.value ?? "";

    let list: structures.Event[];
    try {
        list = search !== "" ? await GetEventsLike(search) : await GetAllEvents();
    } catch (e) {
        console.log(e);
        return;
    }

    if (request === lastListRequest) {
        populateCalendar(list);
    }
}

function createEventElement(event: structures.Event): { eventElement: HTMLDivElement; eventId: string } {
    const eventElement = document.createElement('div');
    eventElement.className = 'event-item';
    eventElement.style.borderColor = safeColor(event.color);

    const startDate = formatDateWithDay(event.start_date);
    const endDate = formatDateWithDay(event.end_date);
    eventElement.innerHTML = `
        <div class="event-header">
            <span class="event-name">${escapeHtml(event.name)}</span>
        </div>
        <p class="event-description">${escapeHtml(event.description)}</p>
        <div class="event-time">
            <span class="event-date">${startDate} - ${endDate}</span>
        </div>
        <button class="marginTop10 btn btn-delete" id="event-${Number(event.event_id)}" value="Supprimer">Supprimer</button>
    `;

    return { eventElement, eventId: String(event.event_id) };
}

function getMonthName(date: Date): string {
    const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    return monthNames[date.getMonth()];
}

function createWeekSeparator(weekNumber: string): HTMLDivElement {
    const separator = document.createElement('div');
    separator.className = 'week-separator';
    separator.innerHTML = `<hr><span>${weekNumber}</span><hr>`;
    return separator;
}

function populateCalendar(eventv: structures.Event[]): void {
    const eventList = document.querySelector('.event-list') as HTMLElement | null;
    if (!eventList) return;

    eventList.innerHTML = ''; // Effacer les événements existants

    let currentWeek: string | null = null;

    if (!eventv) {
        return;
    }

    // Tri des événements par date
    eventv.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    eventv.forEach(event => {
        const eventDate = new Date(event.start_date);
        const weekNumber = getMonthName(eventDate);

        if (weekNumber !== currentWeek) {
            eventList.appendChild(createWeekSeparator(weekNumber));
            currentWeek = weekNumber;
        }

        const eventElement = createEventElement(event);
        eventList.appendChild(eventElement.eventElement);

        const deleteBtn = document.getElementById(`event-${eventElement.eventId}`) as HTMLButtonElement | null;
        if (deleteBtn) {
            deleteBtn.addEventListener("click", async () => {
                try {
                    if (await DeleteEvent(Number(eventElement.eventId))) {
                        popup("Suppression réussie !");
                        await refreshEventList();
                    }
                } catch (e) {
                    console.log(e);
                    popup("Une erreur est survenue lors de la suppression d'un évènement");
                }
            });
        }
    });
}
