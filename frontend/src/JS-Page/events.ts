import { DeleteEvent, GetAllEvents, GetEventsLike } from "../../wailsjs/go/backend/App";
import { structures } from "../../wailsjs/go/models";
import { formatDateWithDay, scrollMainPart } from "../JS/functions";
import { popup } from "../JS/popups";


let personnalEvents: structures.Event[] = [];
//let displayEventsId: number[] = [];
let specificEvent = false;
let isStillRunning = false;

export async function events(): Promise<void> {
    if (isStillRunning) {
        return;
    }

    isStillRunning = true;
    if (specificEvent) {
        isStillRunning = false;
        return;
    }
    scrollMainPart();

    const searchBar = document.getElementById("searchBar") as HTMLInputElement | null;
    if (!searchBar) {
        popup("Impossible de trouver la barre de recherche des événements.");
        isStillRunning = false;
        return;
    }

    try {
        personnalEvents = await GetAllEvents() as structures.Event[];
    } catch (e) {
        console.log(e);
        isStillRunning = false;
        return;
    }

    populateCalendar(personnalEvents);

    searchBar.addEventListener("input", async () => {
        specificEvent = searchBar.value !== "";
        const searchedEvents = await GetEventsLike(searchBar.value) as structures.Event[];
        populateCalendar(searchedEvents);
    });

    /*if (displayEventsId.length === 0) {
        displayEventsId.push(window.setInterval(events, 20000));
    }*/

    isStillRunning = false;
}

function createEventElement(event: structures.Event): { eventElement: HTMLDivElement; eventId: string } {
    const eventElement = document.createElement('div');
    eventElement.className = 'event-item';
    eventElement.style.borderColor = event.color;

    const startDate = formatDateWithDay(event.start_date);
    const endDate = formatDateWithDay(event.end_date);
    eventElement.innerHTML = `
        <div class="event-header">
            <span class="event-name">${event.name}</span>
        </div>
        <p class="event-description">${event.description}</p>
        <div class="event-time">
            <span class="event-date">${startDate} - ${endDate}</span>
        </div>
        <button class="marginTop10 btn btn-delete" id="event-${event.event_id}" value="Supprimer">Supprimer</button>
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
                        await events();
                    }
                } catch (e) {
                    console.log(e);
                    popup("Une erreur est survenue lors de la suppression d'un évènement");
                }
            });
        }
    });
}
/*
// Fonction pour arrêter le setInterval
export function stopDisplayingEvents(): void {
    while (displayEventsId.length > 0) {
        const timeoutId = displayEventsId.pop();
        if (timeoutId !== undefined) {
            clearInterval(timeoutId);
        }
    }
}
*/