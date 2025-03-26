import { GetAgenda, RefreshAgenda } from "../../wailsjs/go/backend/App";
import { capitalizeFirstLetter, getDateInfo, scrollMainPart } from "../JS/functions";

export async function schedule(forceRefresh = false){
    console.log("schedule")

    scrollMainPart()
    
    const monday = getMonday()
    const saturday = getSunday()

    printScheduleTitle(monday, saturday)

    const agenda = await getSchedule(monday.toISOString().split("T")[0], saturday.toISOString().split("T")[0])
    agenda.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    printSchedule(agenda, monday, saturday)
}

async function getSchedule(monday, saturday){
    return RefreshAgenda(`${monday}`, `${saturday}`)
    return await GetAgenda(`${timestampDebut}`, `${timestampFin}`)
}

async function printSchedule(agenda, monday, saturday) {
    printScheduleTitle(monday, saturday);

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
    console.log(agenda)
    for (let dayIndex = 1; dayIndex <= 6; dayIndex++) { // 1 = lundi, 6 = samedi
        const dayColumn = document.getElementById(dayNames[dayIndex]);

        if (dayColumn) {
            let currentHourIndex = 0;
            
            agenda.forEach(course => {
                const courseStartDate = new Date(course.start_date);
                const courseDayOfWeek = courseStartDate.getUTCDay();
                
                if (courseDayOfWeek === dayIndex) {
                    const possibleHoursAsDate = createDynamicDateArray(courseStartDate);
                    
                    while (currentHourIndex < possibleHours.length && 
                        possibleHoursAsDate[currentHourIndex].getTime() < courseStartDate.getTime()) {
                        dayColumn.appendChild(createEmptyEvent(possibleHours[currentHourIndex]));
                        currentHourIndex++;
                    }
                 
                 

                    const courseElement = document.createElement('div');
                    courseElement.className = 'event';
                    courseElement.setAttribute('data-info', course.agenda_id);
            
                    const course_name = clearAgendaName(course)
                    courseElement.innerHTML = `<h3 ${course.room.color.Valid ? 'style="color:'+course.room.color.String+'"' : ""} >${capitalizeFirstLetter(course_name)}</h3>`;

            
                    courseElement.addEventListener('click', function() {
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

function showModal(course) {
    const modal = document.getElementById('modal-event');
    const modalTitle = document.getElementById('modal-title');
    const modalInfo = document.getElementById('modal-info');

    if (!modal || !modalTitle || !modalInfo) {
        console.error("Modal elements are missing in the DOM.");
        return;
    }
    console.log(course)
    modalTitle.textContent = capitalizeFirstLetter(clearAgendaName(course)) || 'Cours';
    modalTitle.style.color = course.room.color.Valid ? course.room.color.String : ""
    modalInfo.innerHTML = `
        <p><strong>Type :</strong> ${course.type || 'Non spécifié'}</p>
        <p><strong>Horaire :</strong> ${new Date(course.start_date).toLocaleTimeString('fr-FR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} - ${new Date(course.end_date).toLocaleTimeString('fr-FR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}</p>
        <p><strong>Salle :</strong> ${course.room.name?.String + " " + course.room.campus?.String || 'Non spécifiée'}</p>
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
    //const dateDebut = new Date(2025, 1, 17); // cours heure bizarre
    const dateDebut = new Date(2025, 0, 20); // cours heure bizarre2
    //const dateDebut = new Date(2025, 2, 17); // Cours avec des salles attitrée
    //const dateDebut = new Date(2025, 5, 9); // cours Samedi
    return dateDebut;
    return timestampDebut
}

function getSunday(){
    //const dateFin = new Date(2025, 3, 19, 20, 0, 0);
    //const dateFin = new Date(2025, 1, 22, 20, 0, 0); // Cours à des heures bizarre
    const dateFin = new Date(2025, 0, 26, 20, 0, 0); // Cours à des heures bizarre2
    //const dateFin = new Date(2025, 2, 23, 20, 0, 0); // Cours avec des salles attitrée
    //const dateFin = new Date(2025, 5, 15, 20, 0, 0); // Cours samedi
    return dateFin;
    return timestampFin
}