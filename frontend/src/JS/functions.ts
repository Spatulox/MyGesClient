import { GetParentDir, WriteLogFile } from "../../wailsjs/go/backend/App";

// ------------------------------------------------ //

export function log(str: string): void {
    GetParentDir()
        .then((parentDir: string) => {
            const logDir = parentDir.split('\\src')[0] + "\\log";
            const filePath = logDir + '\\log.txt';

            const today = new Date();
            const previousStr = `[${today.toLocaleDateString()} - ${today.toLocaleTimeString()}] `;

            WriteLogFile(filePath, previousStr + str + '\n')
                .then(() => {
                    console.log(previousStr + str + '\n');
                })
                .catch((err: any) => {
                    console.error("ERROR : Impossible to write the log file : " + err);
                });
        })
        .catch((error: any) => {
            console.error("Error getting parent directory:", error);
        });
}

// ------------------------------------------------ //

export function capitalizeFirstLetter(str: string): string {
    const part = str.split(".html")[0];
    if (part.length === 0) return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
}

// ------------------------------------------------ //

export function todayDate(addedDays: number = 0): [string, string] {
    const date = new Date();
    date.setDate(date.getDate() + addedDays);

    const jour = date.getDate();
    const mois = date.getMonth() + 1;
    const annee = date.getFullYear();

    const dateFormatee = jour.toString().padStart(2, '0') + "/" +
        mois.toString().padStart(2, '0') + "/" + annee;

    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const jourDeLaSemaine = jours[date.getDay()];

    return [dateFormatee, jourDeLaSemaine];
}

// ------------------------------------------------ //

export function getDateInfo(dateString: string): [string, string] {
    const parts = dateString.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month - 1, day);

    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const jourDeLaSemaine = jours[date.getDay()];

    const dateFormatee = day.toString().padStart(2, '0') + "/" +
        month.toString().padStart(2, '0') + "/" + year;

    return [dateFormatee, jourDeLaSemaine];
}

// ------------------------------------------------ //

export function getYear(): number {
    return new Date().getFullYear();
}

// ------------------------------------------------ //

export function getMonday(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
    const offset = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : -dayOfWeek + 1);
    today.setDate(today.getDate() + offset);
    today.setHours(0, 0, 0, 0);
    return today;
}

// ------------------------------------------------ //

/**
 * DEPRECATED
 * PLZ USE : getSundayFromMonday
 * @returns {Date} get the current saturday
 */
export function getSaturday(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const offset = dayOfWeek === 0 ? 6 : (dayOfWeek === 6 ? 0 : (6 - dayOfWeek));
    today.setDate(today.getDate() + offset);
    today.setHours(23, 59, 59, 999);
    return today;
}

export function getSundayFromMonday(currentMonday: Date): Date {
    const currentSunday = new Date(currentMonday);
    currentSunday.setUTCDate(currentMonday.getDate() + 6);
    currentSunday.setUTCHours(5, 0, 0, 0);
    return currentSunday;
}

// ------------------------------------------------ //

export function getSunday(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const offset = dayOfWeek === 0 ? 0 : (7 - dayOfWeek);
    today.setDate(today.getDate() + offset);
    today.setHours(23, 59, 59, 999);
    return today;
}

export function toLocalHourString(date_hour: Date): string {
    return date_hour.toLocaleTimeString('fr-FR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
}

// ------------------------------------------------ //

export function wait(seconds: number): void {
    const start = Date.now();
    const milliseconds = seconds * 1000;
    while (Date.now() - start < milliseconds) {
        // Boucle active jusqu'à ce que le temps spécifié soit écoulé
    }
}

// ------------------------------------------------ //

type DayjsUnit = 'day' | 'month' | 'year';

export function dayjs(date?: Date | string): {
    _date: Date;
    format: (formatStr: string) => string;
    add: (value: number, unit: DayjsUnit) => ReturnType<typeof dayjs>;
    subtract: (value: number, unit: DayjsUnit) => ReturnType<typeof dayjs>;
    isValid: () => boolean;
} {
    const d = date ? new Date(date) : new Date();

    return {
        _date: d,

        format(formatStr: string): string {
            const pad = (num: number) => String(num).padStart(2, '0');

            const formats: Record<string, string | number> = {
                YYYY: d.getFullYear(),
                MM: pad(d.getMonth() + 1),
                DD: pad(d.getDate()),
                HH: pad(d.getHours()),
                mm: pad(d.getMinutes()),
                ss: pad(d.getSeconds())
            };

            return formatStr.replace(/YYYY|MM|DD|HH|mm|ss/g, match => String(formats[match]));
        },

        add(value: number, unit: DayjsUnit) {
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

        subtract(value: number, unit: DayjsUnit) {
            return this.add(-value, unit);
        },

        isValid() {
            return !isNaN(this._date.getTime());
        }
    };
}

export function formatDateWithDay(dateString: string): string {
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

export function formatDate(dateString: string): string {
    return dayjs(dateString).format('DD MMM');
}

export function formatTime(dateString: string): string {
    return dayjs(dateString).format('HH:mm');
}

export function scrollMainPart(): void {
    const replace = document.getElementById("replace") as HTMLElement | null;
    if (replace) {
        replace.style.height = "auto";
    }
}

export function alertDebug(e: unknown): void {
    console.log(e);
    alert(String(e));
}

export function hasCommonClass(element1: Element, element2: Element): boolean {
    const classes1 = element1.classList;
    const classes2 = element2.classList;

    for (const className of classes1) {
        if (classes2.contains(className)) {
            return true;
        }
    }
    return false;
}
