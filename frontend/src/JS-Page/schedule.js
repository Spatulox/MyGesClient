import { CheckXTimeInternetConnection, GetAgenda, RefreshAgenda } from "../../wailsjs/go/backend/App";
import {capitalizeFirstLetter, log} from "../JS/functions";


function printReservations(reservations) {

    reservations = JSON.parse(reservations)
    // Parcourir chaque réservation
    reservations.forEach(reservation => {
        console.log(`Reservation ID: ${reservation.reservation_id}`);
        console.log(`Type: ${reservation.type}`);
        console.log(`Modality: ${reservation.modality || 'N/A'}`);
        console.log(`Author ID: ${reservation.author}`);
        console.log(`Start Date: ${new Date(reservation.start_date).toLocaleString()}`);
        console.log(`End Date: ${new Date(reservation.end_date).toLocaleString()}`);
        console.log(`State: ${reservation.state}`);
        console.log(`Comment: ${reservation.comment || 'N/A'}`);
        console.log(`Name: ${reservation.name}`);

        // Afficher les informations sur les salles
        reservation.rooms.forEach(room => {
            console.log(`  Room ID: ${room.room_id}`);
            console.log(`  Room Name: ${room.name}`);
            console.log(`  Floor: ${room.floor}`);
            console.log(`  Campus: ${room.campus}`);
            console.log(`  Color: ${room.color}`);
            console.log(`  Latitude: ${room.latitude}`);
            console.log(`  Longitude: ${room.longitude}`);
        });

        // Afficher les informations sur la discipline
        if (reservation.discipline) {
            console.log(`Discipline Name: ${reservation.discipline.name || 'N/A'}`);
            console.log(`Teacher: ${reservation.teacher || 'N/A'}`);
            console.log(`Number of Students: ${reservation.discipline.nb_students || 'N/A'}`);
            console.log('-----------------------------------------');
        }
    });
}


export async  function schedule(){
    const laStillPopup =  stillPopup('Connecting to myGes api')

    try{
        if(!(await CheckXTimeInternetConnection(5))){
            log('Definitely no Internet connection')
            popup('No internet connection')
            stopStillPopup(laStillPopup)
        }
    } catch (e) {
        popup(e)
        stopStillPopup(laStillPopup)
        return
    }

    editStillPopup(laStillPopup, 'Refreshing Schedule')

    // Get the full week schedule

    try{
        const agendaBeta = await GetAgenda("2024-09-23", "2024-09-28")
        console.log(agendaBeta)
        //printReservations(agendaBeta)
    } catch (e) {
        popup(e)
        stopStillPopup(laStillPopup)
        return
    }

    stopStillPopup(laStillPopup)
}

/*
    Is used to fill the schedule in dashboard.html and schedule.html
 */
export async function updateSchedule(agenda, finalHtmlElement) {
    const now = new Date();
    const isAfter6PM = now.getHours() >= 18;
    const scheduleDate = isAfter6PM ? new Date(now.setDate(now.getDate() + 1)) : now;

    finalHtmlElement.innerHTML = `<h3>${capitalizeFirstLetter(scheduleDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>`;

    agenda.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.className = 'course-item';
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
