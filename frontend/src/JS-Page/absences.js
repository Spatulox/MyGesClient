import {popup} from "../JS/popups";
import {GetAbsences} from "../../wailsjs/go/backend/App";
import {getYear} from "../JS/functions";

let isStillRunning = false

export async function absences(){
    if(isStillRunning){
        return
    }
    isStillRunning = true
    try{
        const tableBody = document.querySelector('#coursesTable tbody');
        tableBody.innerHTML = ""

        let absence = await GetAbsences()

        absence.forEach(course => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${course.course_name}</td>
            <td>${new Date(course.date).toLocaleString()}</td>
            <td class="${course.justified ? 'justified' : 'not-justified'}">${course.justified ? 'Oui' : 'Non'}</td>
            <td>${course.trimester_name}</td>
            <td>${course.year}</td>
        `;
            tableBody.appendChild(row);
        });

    } catch (e) {
        console.log(e)
        popup("Une erreur est survenue")
    }
    isStillRunning = false
}