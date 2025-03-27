import {DeleteEvent, GetAllEvents, GetEvents, GetEventsLike, SaveEvents} from "../../wailsjs/go/backend/App";
import {formatDateWithDay, scrollMainPart} from "../JS/functions";
import {popup} from "../JS/popups";
let personnalEvents
let displayEventsId = []
let specificEvent = false
let isStillRunning = false

export async function events(){

    if(isStillRunning){
        return
    }
    isStillRunning = true
    if(specificEvent){
        return
    }
    scrollMainPart()

    const searchBar = document.getElementById("searchBar")

    try{
        personnalEvents = await GetAllEvents()
    } catch (e) {
        console.log(e)
        isStillRunning = false
        return
    }

    populateCalendar(personnalEvents);

    searchBar.addEventListener("input", async()=>{
        if(searchBar.value === ""){
            specificEvent = false
        } else {
            specificEvent = true
        }
        const searchedEvents = await GetEventsLike(searchBar.value)
        populateCalendar(searchedEvents)
    })

    if(displayEventsId.length === 0){
        displayEventsId.push(setInterval(events, 20000))
    }

    isStillRunning = false
}

function createEventElement(event) {
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

    return {eventElement, eventId : event.event_id};
}

function getMonthName(date) {
    const d = new Date(date);
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    return monthNames[d.getMonth()];
}

function createWeekSeparator(weekNumber) {
    const separator = document.createElement('div');
    separator.className = 'week-separator';
    separator.innerHTML = `<hr><span>${weekNumber}</span><hr>`;
    return separator;
}

function populateCalendar(eventv) {
    const eventList = document.querySelector('.event-list');
    eventList.innerHTML = ''; // Effacer les événements existants

    let currentWeek = null;

    if(!eventv){
        return
    }

    eventv.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    eventv.forEach(event => {
        const eventDate = new Date(event.start_date);
        const weekNumber = getMonthName(eventDate);

        if (weekNumber !== currentWeek) {
            eventList.appendChild(createWeekSeparator(weekNumber));
            currentWeek = weekNumber;
        }

        const eventElement = createEventElement(event);
        eventList.appendChild(eventElement.eventElement);

        document.getElementById(`event-${eventElement.eventId}`).addEventListener("click", async ()=>{
            try{
                if(await DeleteEvent(eventElement.eventId)){
                    popup("Supression réussie !")
                    events()
                }
            } catch (e) {
                console.log(e)
                popup("Une erreur est survenue lors de la suppression d'un évènement")
            }
        })
    });
}


// Fonction pour arrêter le setTimeout
export function stopDisplayingEvents() {
    while (displayEventsId.length > 0) {
        const timeoutId = displayEventsId.pop();
        clearTimeout(timeoutId);
    }
}