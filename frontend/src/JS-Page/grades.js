import {GetGrades} from "../../wailsjs/go/backend/App";
import {capitalizeFirstLetter, getYear, scrollMainPart} from "../JS/functions";

let isStillRunning = false

export async function grades() {
    if(isStillRunning){
        return
    }
    isStillRunning = true
    scrollMainPart()
    const gradesList1 = document.getElementById('grades-list-semester-1');
    const gradesList2 = document.getElementById('grades-list-semester-2');
    const tabButtons = document.querySelectorAll('.tab-button');
    const semester2Tab = document.querySelector('.tab-button[data-semester="2"]');

    let year = getYear();
    let gradeTmp
    try{
        gradeTmp = await GetGrades(year.toString())
    }catch(e){
        console.log(e)
        isStillRunning = false
        return
    }

    function populateGrades(gradesList, grades) {
        gradesList.innerHTML = ''; // Nettoyer la liste existante
        grades.forEach(grade => {

            let {gradeElement, courseName, gradesHtml, examHtml} = initGradesDisplay(grade)

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
            document.getElementById(`grades-list-semester-${semester}`).classList.add('active');
        });
    });
    isStillRunning = false
}


export function initGradesDisplay(grade){
    const gradeElement = document.createElement('div');
    gradeElement.className = 'grade-item';

    const gradesHtml = grade.grades != null ? grade.grades.join(', ') : "";
    const examHtml = grade.exam != null ? grade.exam : "";

    // Enlever le préfixe "S1 -" ou "S2 -" du nom du cours
    const courseName = grade.course.replace(/^S[12] - /, '');
    return {gradeElement, courseName, gradesHtml, examHtml}
}

