import { GetAgenda, RefreshAgenda } from "../../wailsjs/go/backend/App";
import { capitalizeFirstLetter, getDateInfo, getSundayFromMonday, /*getMonday, getSunday,*/ scrollMainPart, toLocalHourString } from "../JS/functions";
import { popup, stillPopup, stopStillPopup } from "../JS/popups";

let currentMonday;

export async function schedule(forceRefresh = false){
    scrollMainPart()
    currentMonday = getMonday()
    const monday = currentMonday
    const sunday = getSundayFromMonday(currentMonday)

    updateSchedule(monday, sunday)
}

async function getSchedule(monday, saturday){
    clearSchedule()
    let agenda = await GetAgenda(`${monday}`, `${saturday}`)
    if(!agenda){
        return await RefreshAgenda(`${monday}`, `${saturday}`)
    }
    return agenda
}

async function updateSchedule(monday, sunday){
    printScheduleTitle(monday, sunday)
    const agenda = await getSchedule(monday.toISOString().split("T")[0], sunday.toISOString().split("T")[0])
    if(agenda){
        agenda.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    }
    await printSchedule(agenda, monday, sunday)
}

function findClosestHour(courseStartDate, possibleHours) {
    let closestHour = possibleHours[0];
    let minDifference = Infinity;

    for (const hour of possibleHours) {
        const [h, m] = hour.split(':').map(Number);
        const possibleDate = new Date(courseStartDate);
        possibleDate.setUTCHours(h, m, 0, 0);
        
        const difference = Math.abs(courseStartDate - possibleDate);
        
        if (difference < minDifference) {
            minDifference = difference;
            closestHour = hour;
        }
    }

    return closestHour;
}


async function printSchedule(agenda, monday, saturday) {
    printScheduleTitle(monday, saturday);
    if(!agenda){
        return
    }
    // Effacer le contenu existant
    document.querySelectorAll('.day-column').forEach(column => column.innerHTML = '');

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const possibleHours = ["08:00", "09:45", "11:30", "13:00", "14:00", "15:45", "17:30", "19:15", "21:00"];

    function createEmptyEvent(hour) {
        const emptyEventElement = document.createElement('div');
        emptyEventElement.className = 'event empty';
        emptyEventElement.innerHTML = `<p>${hour}</p>`;
        return emptyEventElement;
    }

    function createDynamicDateArray(startDate) {
        const dynamicArray = [];
        possibleHours.forEach(hour => {
            const [hours, minutes] = hour.split(':').map(Number);
            const date = new Date(Date.UTC(
                startDate.getUTCFullYear(),
                startDate.getUTCMonth(),
                startDate.getUTCDate(),
                hours,
                minutes,
                0
            ));
            dynamicArray.push(date);
        });
        return dynamicArray;
    }

    for (let dayIndex = 1; dayIndex <= 6; dayIndex++) { // 1 = lundi, 6 = samedi
        const dayColumn = document.getElementById(dayNames[dayIndex]);

        if (dayColumn) {
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
                    courseElement.setAttribute('data-info', course.agenda_id);
                    
                    courseElement.innerHTML = `<p class="event-time">${toLocalHourString(courseStartDate)} - ${toLocalHourString(courseEndDate)}</p>`
                    
                    const delta = courseStartDate.getTime() - possibleHoursAsDate[currentHourIndex].getTime();
                    const deltaMinutes = Math.floor(delta / (1000 * 60));
                    const courseDuration = (courseEndDate.getTime() - courseStartDate.getTime()) / (1000 * 60);

                    // Later
                    if(courseStartDate.getTime() > possibleHoursAsDate[currentHourIndex].getTime()){
                        courseElement.style.transform = `translateY(${deltaMinutes}px)`
                    }
                    // ealier
                    else if (courseStartDate.getTime() < possibleHoursAsDate[currentHourIndex].getTime()){
                        courseElement.style.transform = `translateY(${deltaMinutes}px)`
                    }

                    const standardDuration = 90; // 1h30 en minutes
                    const maxHeight = courseElement.style.height || 90; // always 90px, height in the CSS part, line 52 in schedule.css

                    if (courseDuration < standardDuration) {
                        const minutesDifference = standardDuration - courseDuration;
                        courseElement.style.height = `${maxHeight - minutesDifference}%`;
                    }
                    else if (courseDuration > standardDuration) {
                        const minutesDifference = courseDuration - standardDuration;
                        courseElement.style.height = `${maxHeight + minutesDifference}%`;
                    }

                    const course_name = clearAgendaName(course)
                    if(course.type === "Examen"){
                        courseElement.innerHTML += `<h3 ${course.room.color.Valid ? 'style="color:'+course.room.color.String+'"' : ""} >${capitalizeFirstLetter(course_name)} - ${course.type}</h3>`;
                    } else {
                        courseElement.innerHTML += `<h3 ${course.room.color.Valid ? 'style="color:'+course.room.color.String+'"' : ""} >${capitalizeFirstLetter(course_name)}</h3>`;
                    }

            
                    courseElement.addEventListener('click', function() {
                        console.log(course)
                        showModal(course);
                    });
                    
                    dayColumn.appendChild(courseElement);

                    currentHourIndex++;
                } else {
                    return
                }
            });
        }
    }

    setupModal()
}

function clearAgendaName(course){
    return course.agenda_name.includes(" - ") ? course.agenda_name.split(" - ")[1] : course.agenda_name;
}

function clearSchedule(){
    const monday = document.getElementById("monday")
    const tuesday = document.getElementById("tuesday")
    const wednesday = document.getElementById("wednesday")
    const thursday = document.getElementById("thursday")
    const friday = document.getElementById("friday")
    const saturday = document.getElementById("saturday")
    monday.innerHTML = ""
    tuesday.innerHTML = ""
    wednesday.innerHTML = ""
    thursday.innerHTML = ""
    friday.innerHTML = ""
    saturday.innerHTML = ""
}

function showModal(course) {
    const modal = document.getElementById('modal-event');
    const modalTitle = document.getElementById('modal-title');
    const modalInfo = document.getElementById('modal-info');

    if (!modal || !modalTitle || !modalInfo) {
        console.error("Modal elements are missing in the DOM.");
        return;
    }
    modalTitle.textContent = capitalizeFirstLetter(clearAgendaName(course)) || 'Cours';
    modalTitle.style.color = course.room.color.Valid ? course.room.color.String : ""
    modalInfo.innerHTML = `
        <p><strong>Type :</strong> ${course.type || 'Non spécifié'}</p>
        <p><strong>Horaire :</strong> ${toLocalHourString(new Date(course.start_date))} - ${toLocalHourString(new Date(course.end_date))}</p>
        <p><strong>Salle :</strong> ${ (course.type ==="Examen" ? "Probably " : "") + course.room.name?.String + " " + course.room.campus?.String || 'Non spécifiée'}</p>
        <p><strong>Modalité :</strong> ${course.modality || 'Non spécifiée'}</p>
        <p><strong>Discipline :</strong> ${course.discipline?.trimester || 'Non spécifiée'}</p>
        <p><strong>Professeur(e) :</strong> ${course.discipline?.Teacher?.teacher || 'Non spécifiée'}</p>
        <p><strong>Commentaire :</strong> ${course.comment || 'Aucun'}</p>
    
    `;
    modal.style.display = 'block';
}

function setupModal(){
    const modal = document.getElementById('modal-event');
    const closeBtn = document.getElementsByClassName('close')[0];

    closeBtn.onclick = function () {
        modal.style.display = 'none';
    };

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

function printScheduleTitle(monday, saturday) {
    const [mondayFormatted, mondayDay] = getDateInfo(monday.toLocaleDateString('fr-FR'));
    const [saturdayFormatted, saturdayDay] = getDateInfo(saturday.toLocaleDateString('fr-FR'));

    const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    const mondayParts = mondayFormatted.split('/');
    const saturdayParts = saturdayFormatted.split('/');

    const mondayMonth = mois[parseInt(mondayParts[1]) - 1];
    const saturdayMonth = mois[parseInt(saturdayParts[1]) - 1];

    const title = document.getElementById("week");
    title.textContent = `🗓️ ${mondayDay} ${mondayParts[0]} ${capitalizeFirstLetter(mondayMonth)} au ${saturdayDay} ${saturdayParts[0]} ${capitalizeFirstLetter(saturdayMonth)} 🗓️`;
}

function getMonday(){
    //const dateDebut = new Date(2025, 3, 14);
    const dateDebut = new Date(2025, 1, 17); // cours heure bizarre
    //const dateDebut = new Date(2025, 0, 20); // cours heure bizarre2
    //const dateDebut = new Date(2025, 2, 17); // Cours avec des salles attitrée
    //const dateDebut = new Date(2025, 5, 9); // cours Samedi
    return dateDebut;
    return timestampDebut
}

function getSunday(){
    //const dateFin = new Date(2025, 3, 19, 20, 0, 0);
    const dateFin = new Date(2025, 1, 23, 20, 0, 0); // Cours à des heures bizarre
    //const dateFin = new Date(2025, 0, 26, 20, 0, 0); // Cours à des heures bizarre2
    //const dateFin = new Date(2025, 2, 23, 20, 0, 0); // Cours avec des salles attitrée
    //const dateFin = new Date(2025, 5, 15, 20, 0, 0); // Cours samedi
    return dateFin;
    return timestampFin
}




// -------------------- switch Week -------------------- //

async function changeWeek(direction) {
    // direction: -1 pour semaine précédente, 1 pour semaine suivante
    currentMonday.setDate(currentMonday.getDate() + direction * 7); // Ajuste le lundi
    const currentSunday = getSundayFromMonday(currentMonday)

    await updateSchedule(currentMonday, currentSunday)
}

document.getElementById("prev-week").addEventListener("click", async () => {
    const stillPop = stillPopup("Chargement")
    const prevButton = document.getElementById("prev-week");
    const nextButton = document.getElementById("next-week");
    
    prevButton.style.opacity = 0;
    nextButton.style.opacity = 0;
    prevButton.style.pointerEvents = 'none';
    nextButton.style.pointerEvents = 'none';
    
    try{
        await changeWeek(-1);
    } catch (e){
        console.log(e)
    }
    
    prevButton.style.opacity = 1;
    nextButton.style.opacity = 1;
    prevButton.style.pointerEvents = 'auto';
    nextButton.style.pointerEvents = 'auto';
    stopStillPopup(stillPop)
});

document.getElementById("next-week").addEventListener("click", async () => {
    const stillPop = stillPopup("Chargement")
    const prevButton = document.getElementById("prev-week");
    const nextButton = document.getElementById("next-week");
    
    prevButton.style.opacity = 0;
    nextButton.style.opacity = 0;
    prevButton.style.pointerEvents = 'none';
    nextButton.style.pointerEvents = 'none';
    
    try{
        await changeWeek(1);
    } catch (e){
        console.log(e)
    }
    
    prevButton.style.opacity = 1;
    nextButton.style.opacity = 1;
    prevButton.style.pointerEvents = 'auto';
    nextButton.style.pointerEvents = 'auto';
    stopStillPopup(stillPop)
});