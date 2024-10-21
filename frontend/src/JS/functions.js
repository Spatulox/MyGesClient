import {GetParentDir, WriteLogFile} from "../../wailsjs/go/backend/App";

// ------------------------------------------------ //

export function log(str) {

    GetParentDir().then((parentDir) => {
        const logDir = parentDir.split('\\src')[0] + "\\log"; // Utilisation de / au lieu de \\ pour la compatibilité multiplateforme
        const filePath = logDir + '\\log.txt';

        var today = new Date();
        let previousStr = `[${today.toLocaleDateString()} - ${today.toLocaleTimeString()}] `;

        //console.log(previousStr + str);
        WriteLogFile(filePath, previousStr + str + '\n')
            .then(()=>{
                console.log(previousStr + str + '\n')
            })
            .catch((err)=>{
                console.error("ERROR : Impossible to write the log file : "+err)
            })
    })
    .catch((error) => {
        console.error("Error getting parent directory:", error);
    });
}

// ------------------------------------------------ //

export function capitalizeFirstLetter(string) {
    // Séparer la chaîne et prendre la première partie
    let part = string.split(".html")[0];

    // Vérifier si la chaîne n'est pas vide
    if (part.length === 0) return part;

    // Mettre en majuscule la première lettre et la concaténer avec le reste de la chaîne
    return part.charAt(0).toUpperCase() + part.slice(1);
}

// ------------------------------------------------ //

export function todayDate(addedDays = 0){
    // Créer un nouvel objet Date
    const date = new Date();

    // Ajouter le nombre de jours au jour actuel
    date.setDate(date.getDate() + addedDays);

    // Récupérer le jour, le mois et l'année
    const jour = date.getDate();
    const mois = date.getMonth() + 1; // Les mois sont indexés à partir de 0, donc on ajoute 1
    const annee = date.getFullYear();

    // Afficher la date au format "jj/mm/aaaa"
    const dateFormatee = jour.toString().padStart(2, '0') + "/" + mois.toString().padStart(2, '0') + "/" + annee;


    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const jourDeLaSemaine = jours[date.getDay()];

    return [dateFormatee, jourDeLaSemaine];
}

// ------------------------------------------------ //

export function getDateInfo(dateString) {
    const parts = dateString.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month - 1, day); // Month is 0-based

    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const jourDeLaSemaine = jours[date.getDay()];

    const dateFormatee = day.toString().padStart(2, '0') + "/" + month.toString().padStart(2, '0') + "/" + year;

    return [dateFormatee, jourDeLaSemaine];
}

// ------------------------------------------------ //

export function getYear() {
    const currentDate = new Date();
    return currentDate.getFullYear();
}

// ------------------------------------------------ //

export function getMonday() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi

    // Si aujourd'hui est Dimanche (0), on ajoute 1 jour pour obtenir Lundi de la semaine prochaine
    const offset = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : -dayOfWeek + 1);

    // Calculer le Lundi
    today.setDate(today.getDate() + offset);
    today.setHours(0, 0, 0, 0); // Réinitialiser l'heure à minuit

    return today;
}

// ------------------------------------------------ //

export function getSaturday() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi

    // Si aujourd'hui est Dimanche (0), on ajoute 1 jour pour obtenir Samedi de la semaine prochaine
    const offset = dayOfWeek === 0 ? 6 : (dayOfWeek === 6 ? 0 : (6 - dayOfWeek));

    // Calculer le Samedi
    today.setDate(today.getDate() + offset);
    today.setHours(23, 59, 59, 999); // Réinitialiser l'heure à la fin de la journée

    return today;
}

// ------------------------------------------------ //

export function wait(seconds) {
    const start = Date.now();
    const milliseconds = seconds * 1000;
    while (Date.now() - start < milliseconds) {
        // Boucle active jusqu'à ce que le temps spécifié soit écoulé
    }
}

// ------------------------------------------------ //

export function dayjs(date) {
    const d = date ? new Date(date) : new Date();

    return {
        _date: d,

        format(formatStr) {
            const pad = (num) => String(num).padStart(2, '0');

            const formats = {
                YYYY: d.getFullYear(),
                MM: pad(d.getMonth() + 1),
                DD: pad(d.getDate()),
                HH: pad(d.getHours()),
                mm: pad(d.getMinutes()),
                ss: pad(d.getSeconds())
            };

            return formatStr.replace(/YYYY|MM|DD|HH|mm|ss/g, match => formats[match]);
        },

        add(value, unit) {
            const newDate = new Date(this._date);
            switch (unit) {
                case 'day':
                    newDate.setDate(newDate.getDate() + value);
                    break;
                case 'month':
                    newDate.setMonth(newDate.getMonth() + value);
                    break;
                case 'year':
                    newDate.setFullYear(newDate.getFullYear() + value);
                    break;
            }
            return dayjs(newDate);
        },

        subtract(value, unit) {
            return this.add(-value, unit);
        },

        isValid() {
            return !isNaN(this._date.getTime());
        }
    };
}

export function formatDateWithDay(dateString) {
    const date = new Date(dateString);
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${dayName} ${day} ${month} ${hours}:${minutes}`;
}

export function formatDate(dateString) {
    return dayjs(dateString).format('DD MMM');
}

export function formatTime(dateString) {
    return dayjs(dateString).format('HH:mm');
}

export function scrollMainPart(){
    const replace = document.getElementById("replace")
    replace.style.height = "auto"
}

export function alertDebug(e){
    console.log(e)
    alert(e.toString())
}

export function hasCommonClass(element1, element2) {
    const classes1 = element1.classList;
    const classes2 = element2.classList;

    for (let className of classes1) {
        if (classes2.contains(className)) {
            return true;
        }
    }
    return false;
}