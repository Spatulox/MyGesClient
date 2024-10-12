import {GetEvents, GetEventsLike, SaveEvents} from "../../wailsjs/go/backend/App";
import {formatDateWithDay} from "../JS/functions";
let personnalEvents

export async function events(){

    const searchBar = document.getElementById("searchBar")

    try{
        personnalEvents = await GetEvents()
    } catch (e) {
        console.log(e)
        return
    }

    populateCalendar(personnalEvents);

    searchBar.addEventListener("input", async()=>{
        const searchedEvents = await GetEventsLike(searchBar.value)
        populateCalendar(searchedEvents)
        console.log(searchBar.value)
        console.log(searchedEvents)
    })
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
    `;

    return eventElement;
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

function populateCalendar(events) {
    const eventList = document.querySelector('.event-list');
    eventList.innerHTML = ''; // Effacer les événements existants

    let currentWeek = null;

    events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    events.forEach(event => {
        const eventDate = new Date(event.start_date);
        const weekNumber = getMonthName(eventDate);

        if (weekNumber !== currentWeek) {
            eventList.appendChild(createWeekSeparator(weekNumber));
            currentWeek = weekNumber;
        }

        const eventElement = createEventElement(event);
        eventList.appendChild(eventElement);
    });
}
