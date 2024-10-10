import {GetAgenda, GetGrades} from "../../wailsjs/go/backend/App";
import {getYear, capitalizeFirstLetter} from "../JS/functions";
import {updateSchedule} from "./schedule";

export async function dashboard(){

    const now = new Date();

    // Créer une date pour aujourd'hui à minuit UTC
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Créer une date pour aujourd'hui à 23:00 UTC
    const todayNight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23));
    console.log(today.toISOString(), todayNight.toISOString());

    //const agenda = await GetAgenda(today.toISOString().split("T")[0], todayNight.toISOString().split("T")[0])
    const agenda = await GetAgenda("2024-09-23", "2024-09-23")
    const htmlElement = document.getElementById("schedule-content")

    const grades = await GetGrades(getYear().toString())
    const htmlGradeElement = document.getElementById("grades-content")

    if(agenda){
        await updateSchedule(agenda, htmlElement)
        await recapGrades(htmlGradeElement, grades)
    } else {
        alert("Pas d'agenda")
    }

    /* Animate buttons */
    document.querySelectorAll('.navigation-buttons button').forEach(button => {
        button.addEventListener('click', function() {
            // Ajoute la classe 'clicked' pour déclencher l'animation
            this.classList.add('clicked');

            // Retire la classe après l'animation pour permettre une nouvelle animation
            setTimeout(() => {
                this.classList.remove('clicked');
            }, 600); // Durée de l'animation en millisecondes
        });
    });
}


async function recapGrades(gradesList, grades) {
    // Fonction pour obtenir 3 éléments aléatoires d'un tableau
    function getRandomElements(array, count) {
        let shuffled = array.slice(0), i = array.length, min = i - count, temp, index;
        while (i-- > min) {
            index = Math.floor((i + 1) * Math.random());
            temp = shuffled[index];
            shuffled[index] = shuffled[i];
            shuffled[i] = temp;
        }
        return shuffled.slice(min);
    }

    // Fonction pour afficher les notes
    function displayGrades() {
        gradesList.innerHTML = ''; // Nettoyer la liste existante
        const selectedGrades = getRandomElements(grades, 3);

        selectedGrades.forEach(grade => {
            const gradeElement = document.createElement('div');
            gradeElement.className = 'grade-item';

            const gradesHtml = grade.grades != null ? grade.grades.join(', ') : "";
            const examHtml = grade.exam != null ? grade.exam.join(', ') : "";

            // Enlever le préfixe "S1 -" ou "S2 -" du nom du cours
            const courseName = grade.course.replace(/^S[12] - /, '');

            gradeElement.innerHTML = `
                <span>${capitalizeFirstLetter(courseName)}</span>
                <span>${grade.coef}</span>
                <span>${grade.teacher_name}</span>
                <span>${gradesHtml}</span>
                <span>${examHtml}</span>
            `;

            gradesList.appendChild(gradeElement);
        });
    }

    // Afficher les notes initiales
    displayGrades();

    // Mettre à jour les notes toutes les 6 secondes
    setInterval(displayGrades, 10000);
}
