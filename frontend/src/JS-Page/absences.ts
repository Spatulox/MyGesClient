import { popup } from "../JS/popups";
import { GetAbsences } from "../../wailsjs/go/backend/App";
import { escapeHtml } from "../JS/functions";

// Typage d'une absence
interface Absence {
    course_name: string;
    date: string;
    justified: boolean;
    trimester_name: string;
    year: string;
}

let isStillRunning = false;

export async function absences(): Promise<void> {
    if (isStillRunning) {
        return;
    }
    isStillRunning = true;
    try {
        try {
            const tableBody = document.querySelector('#coursesTable tbody') as HTMLTableSectionElement | null;
            if (!tableBody) {
                popup("Impossible de trouver le tableau des absences.");
                return;
            }
            tableBody.innerHTML = "";

            const absence: Absence[] | null = await GetAbsences();

            if (!absence) {
                return;
            }

            absence.forEach((course: Absence) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${escapeHtml(course.course_name)}</td>
                    <td>${escapeHtml(new Date(course.date).toLocaleString())}</td>
                    <td class="${course.justified ? 'justified' : 'not-justified'}">${course.justified ? 'Oui' : 'Non'}</td>
                    <td>${escapeHtml(course.trimester_name)}</td>
                    <td>${escapeHtml(course.year)}</td>
                `;
                tableBody.appendChild(row);
            });

        } catch (e) {
            console.log(e);
            popup("Une erreur est survenue");
        }
    } finally {
        isStillRunning = false;
    }
}
