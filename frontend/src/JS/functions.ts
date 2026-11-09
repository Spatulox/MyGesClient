const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/**
 * Escape a value before inserting it in an HTML template.
 * Every value coming from MyGes, the local DB or the user must go through it.
 */
export function escapeHtml(value: unknown): string {
    return String(value ?? "").replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
}

/**
 * Return the color if it is a valid CSS color, the fallback otherwise.
 */
export function safeColor(color: string | null | undefined, fallback: string = ""): string {
    if (!color) return fallback;
    return CSS.supports("color", color) ? color : fallback;
}

// ------------------------------------------------ //

export function capitalizeFirstLetter(str: string): string {
    const part = str.split(".html")[0];
    if (part.length === 0) return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
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

export function toLocalHourString(date_hour: Date): string {
    return date_hour.toLocaleTimeString('fr-FR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
}

// ------------------------------------------------ //

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

export function scrollMainPart(): void {
    const replace = document.getElementById("replace") as HTMLElement | null;
    if (replace) {
        replace.style.height = "auto";
    }
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
