import { popup } from "../JS/popups";
import { structures } from "../../wailsjs/go/models";
import { escapeHtml, scrollMainPart } from "../JS/functions";
import { fetchAbsences, getAvailableYears, getCurrentYear } from "../JS/schoolYears";
import { renderYearPicker } from "../JS/yearPicker";

let isStillRunning = false;
/** Incremented on each load, so a slow answer for a previous year is ignored */
let loadToken = 0;

type Filter = "all" | "unjustified" | "justified";

const FILTERS: [Filter, string][] = [
    ["all", "Toutes"],
    ["unjustified", "Non justifiées"],
    ["justified", "Justifiées"],
];

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const WEEKDAYS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

const CHECK_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 5 5 9-10"></path></svg>`;
const WARN_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M12 7v6"></path><path d="M12 17h.01"></path></svg>`;

type AbsenceView = {
    course: string;
    date: Date;
    justified: boolean;
    trimester: string;
};

type PageState = {
    years: string[];
    current: string;
    filter: Filter;
    items: AbsenceView[];
};

type Elements = {
    content: HTMLElement;
    picker: HTMLElement;
    select: HTMLSelectElement;
    banner: HTMLElement;
    titleRow: HTMLElement | null;
};

export async function absences(): Promise<void> {
    if (isStillRunning) {
        return;
    }
    isStillRunning = true;
    try {
        scrollMainPart();
        const page = document.getElementById("absences");
        const content = page?.querySelector<HTMLElement>("#absences-content");
        const picker = page?.querySelector<HTMLElement>("#absences-year-picker");
        const select = page?.querySelector<HTMLSelectElement>("#year-absences");
        const banner = page?.querySelector<HTMLElement>("#absences-archive");
        if (!page || !content || !picker || !select || !banner) {
            popup("Impossible de trouver la liste des absences.");
            return;
        }
        const el: Elements = { content, picker, select, banner, titleRow: page.querySelector<HTMLElement>(".page-title-row") };

        const current = await getCurrentYear();
        const state: PageState = { years: await getAvailableYears(), current, filter: "all", items: [] };

        // onclick: a single handler, even after several visits
        el.content.onclick = (event) => {
            const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-filter]");
            if (!button) return;
            state.filter = button.dataset.filter as Filter;
            updateFilters(el, state);
            renderList(el, state);
        };

        await loadYear(el, state, current);
    } finally {
        isStillRunning = false;
    }
}

async function loadYear(el: Elements, state: PageState, year: string): Promise<void> {
    const token = ++loadToken;
    state.filter = "all";
    renderYearPicker({
        picker: el.picker, select: el.select, banner: el.banner, titleRow: el.titleRow,
        years: state.years, current: state.current, selected: year,
        onChange: (newYear) => { void loadYear(el, state, newYear); },
    });

    let absences: structures.LocalAbsences[];
    try {
        absences = await fetchAbsences(year);
    } catch (e) {
        console.log(e);
        if (token === loadToken) {
            el.content.innerHTML = `<div class="absences-list"><div class="absences-empty">Une erreur s'est produite</div></div>`;
            popup("Une erreur est survenue");
        }
        return;
    }
    if (token !== loadToken) return;

    state.items = absences
        .map(a => ({
            course: String(a.course_name ?? ""),
            date: new Date(a.date),
            justified: Boolean(a.justified),
            trimester: String(a.trimester_name ?? ""),
        }))
        .sort((a, b) => (b.date.getTime() || 0) - (a.date.getTime() || 0));

    renderPage(el, state);
}

function renderPage(el: Elements, state: PageState): void {
    const unjustified = state.items.filter(a => !a.justified).length;
    const justified = state.items.length - unjustified;

    const counts = new Map<string, number>();
    state.items.forEach(a => counts.set(a.course, (counts.get(a.course) ?? 0) + 1));
    let topCourse: [string, number] | null = null;
    for (const [course, count] of counts) {
        if (!topCourse || count > topCourse[1]) topCourse = [course, count];
    }

    el.content.innerHTML = `
        <div class="absences-stats">
            <div class="absences-stat">
                <span class="absences-stat-label">Non justifiées</span>
                <span class="absences-stat-value absences-stat-warn">${unjustified}</span>
            </div>
            <div class="absences-stat">
                <span class="absences-stat-label">Justifiées</span>
                <span class="absences-stat-value">${justified}</span>
            </div>
            <div class="absences-stat">
                <span class="absences-stat-label">Cours le plus manqué</span>
                <span class="absences-stat-course">${topCourse ? escapeHtml(topCourse[0]) : "—"}</span>
                <span class="absences-stat-label">${topCourse ? `${topCourse[1]} ${topCourse[1] > 1 ? "absences" : "absence"}` : ""}</span>
            </div>
        </div>
        <div class="absences-filters" role="group" aria-label="Filtrer">
            ${FILTERS.map(([key, label]) => `<button type="button" class="tab-button" data-filter="${key}">${label}</button>`).join("")}
        </div>
        <div class="absences-list"></div>`;

    updateFilters(el, state);
    renderList(el, state);
}

/** Updates the buttons in place, so the clicked one keeps the focus */
function updateFilters(el: Elements, state: PageState): void {
    el.content.querySelectorAll<HTMLButtonElement>("button[data-filter]").forEach(button => {
        const active = button.dataset.filter === state.filter;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function renderList(el: Elements, state: PageState): void {
    const list = el.content.querySelector<HTMLElement>(".absences-list");
    if (!list) return;

    const shown = state.items.filter(a =>
        state.filter === "all" || (state.filter === "justified" ? a.justified : !a.justified));

    if (shown.length === 0) {
        const label = state.items.length === 0 ? "Aucune absence cette année." : "Aucune absence dans cette catégorie.";
        list.innerHTML = `<div class="absences-empty">${label}</div>`;
        return;
    }

    // Most recent first, one group per month
    const groups: { label: string; items: AbsenceView[] }[] = [];
    shown.forEach(a => {
        const label = isNaN(a.date.getTime()) ? "Date inconnue" : `${MONTHS[a.date.getMonth()]} ${a.date.getFullYear()}`;
        let last = groups[groups.length - 1];
        if (!last || last.label !== label) {
            last = { label, items: [] };
            groups.push(last);
        }
        last.items.push(a);
    });

    list.innerHTML = groups.map(group => `
        <section aria-label="${escapeHtml(group.label)}">
            <h2 class="absences-month">${escapeHtml(group.label)}</h2>
            <ul>${group.items.map(createAbsenceRow).join("")}</ul>
        </section>`).join("");
}

function createAbsenceRow(a: AbsenceView): string {
    const valid = !isNaN(a.date.getTime());
    const weekday = valid ? WEEKDAYS[a.date.getDay()] : "";
    const day = valid ? String(a.date.getDate()) : "?";
    const time = valid ? a.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
    const details = [time, a.trimester].filter(Boolean).map(escapeHtml).join(" · ");
    const status = a.justified
        ? `<span class="absence-pill absence-pill-ok">${CHECK_ICON}Justifiée</span>`
        : `<span class="absence-pill absence-pill-ko">${WARN_ICON}Non justifiée</span>`;

    return `
        <li class="absence-row">
            <div class="absence-day">
                <span class="absence-weekday">${weekday}</span>
                <span class="absence-daynum">${day}</span>
            </div>
            <div class="absence-info">
                <span class="absence-course">${escapeHtml(a.course)}</span>
                <span class="absence-details">${details}</span>
            </div>
            ${status}
        </li>`;
}
