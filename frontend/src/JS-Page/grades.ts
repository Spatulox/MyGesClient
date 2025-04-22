import { GetGrades } from "../../wailsjs/go/backend/App";
import { structures } from "../../wailsjs/go/models";
import { capitalizeFirstLetter, getYear, scrollMainPart } from "../JS/functions";

let isStillRunning = false;

export async function grades(): Promise<void> {
    if (isStillRunning) {
        return;
    }
    isStillRunning = true;
    scrollMainPart();

    const gradesList1 = document.getElementById('grades-list-semester-1') as HTMLElement | null;
    const gradesList2 = document.getElementById('grades-list-semester-2') as HTMLElement | null;
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-button');
    const semester2Tab = document.querySelector<HTMLButtonElement>('.tab-button[data-semester="2"]');

    if (!gradesList1 || !gradesList2 || !semester2Tab) {
        isStillRunning = false;
        return;
    }

    let gradeTmp: structures.LocalGrades[] = [];
    try {
        gradeTmp = await GetGrades() as structures.LocalGrades[];
    } catch (e) {
        console.log(e);
        isStillRunning = false;
        return;
    }

    function populateGrades(gradesList: HTMLElement, grades: structures.LocalGrades[]): void {
        gradesList.innerHTML = ''; // Nettoyer la liste existante
        grades.forEach(grade => {
            const { gradeElement, courseName, gradesHtml, examHtml } = initGradesDisplay(grade);

            gradeElement.innerHTML = `
                <span>${capitalizeFirstLetter(courseName)}</span>
                <span>${grade.ects}</span>
                <span>${grade.coef}</span>
                <span>${grade.teacher_name}</span>
                <span>${gradesHtml}</span>
                <span>${examHtml}</span>
                <span>${grade.bonus}</span>
            `;

            gradesList.appendChild(gradeElement);
        });
    }

    // Séparer les notes par semestre
    const semester1Grades = gradeTmp.filter(grade => grade.course.startsWith('S1 -'));
    const semester2Grades = gradeTmp.filter(grade => grade.course.startsWith('S2 -'));

    // Remplir initialement les deux semestres
    populateGrades(gradesList1, semester1Grades);
    populateGrades(gradesList2, semester2Grades);

    // Cacher le deuxième semestre s'il n'y a pas de notes
    if (semester2Grades.length === 0) {
        gradesList2.style.display = 'none';
        semester2Tab.style.display = 'none';
    } else {
        gradesList2.style.display = '';
        semester2Tab.style.display = '';
    }

    // Gérer les clics sur les onglets
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const semester = button.getAttribute('data-semester');
            document.querySelectorAll('.grades-list').forEach(list => list.classList.remove('active'));
            const list = document.getElementById(`grades-list-semester-${semester}`);
            if (list) list.classList.add('active');
        });
    });

    isStillRunning = false;
}

export function initGradesDisplay(grade: structures.LocalGrades): {
    gradeElement: HTMLDivElement;
    courseName: string;
    gradesHtml: string;
    examHtml: string;
} {
    const gradeElement = document.createElement('div');
    gradeElement.className = 'grade-item';

    const gradesHtml = grade.grades != null ? grade.grades.join(', ') : "";
    const examHtml = grade.exam != null ? String(grade.exam) : "";

    // Enlever le préfixe "S1 -" ou "S2 -" du nom du cours
    const courseName = grade.course.replace(/^S[12] - /, '');
    return { gradeElement, courseName, gradesHtml, examHtml };
}