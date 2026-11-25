import { DeleteEvent, GetAllEvents, GetEventsLike } from "../../wailsjs/go/backend/App";
import { structures } from "../../wailsjs/go/models";
import { safeColor, scrollMainPart } from "../JS/functions";
import { popup } from "../JS/popups";

type EventFilter = "upcoming" | "past" | "all";

type TimelineEvent = {
    event: structures.Event;
    start: Date;
    end: Date;
    past: boolean;
};

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];
const SHORT_MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const SHORT_DAYS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const DAY_MS = 86400000;

const TRASH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M4 7h16"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>
    <path d="M6 7l1 13h10l1-13"></path><path d="M9 7V4h6v3"></path></svg>`;

let isStillRunning = false;
let lastListRequest = 0;

let currentFilter: EventFilter = "upcoming";
// Last lists received: every event (for the "N à venir" count) and the ones matching the search
let allEvents: structures.Event[] = [];
let matchingEvents: structures.Event[] = [];
// Closes the delete confirmation currently open, so only one card asks at a time
let closeOpenConfirmation: (() => void) | null = null;

export async function events(): Promise<void> {
    if (isStillRunning) {
        return;
    }

    isStillRunning = true;
    try {
        scrollMainPart();

        const searchBar = getSearchBar();
        if (!searchBar) {
            popup("Impossible de trouver la barre de recherche des événements.");
            return;
        }

        // oninput / onclick : un seul handler, même après plusieurs visites
        searchBar.oninput = () => {
            void refreshEventList();
        };

        getFilterButtons().forEach(button => {
            button.onclick = () => {
                currentFilter = toFilter(button.dataset.filter);
                renderEventList();
            };
        });

        await refreshEventList();
    } finally {
        isStillRunning = false;
    }
}

function getSearchBar(): HTMLInputElement | null {
    return document.getElementById("searchBar") as HTMLInputElement | null;
}

function getFilterButtons(): HTMLButtonElement[] {
    return Array.from(document.querySelectorAll<HTMLButtonElement>("#event-filters button[data-filter]"));
}

function toFilter(value: string | undefined): EventFilter {
    return value === "past" || value === "all" ? value : "upcoming";
}

/**
 * Fetch every event, and the ones matching the search bar when it is filled,
 * then display them. Responses that arrive after a newer request are ignored,
 * so a slow search can't overwrite the result of the latest one.
 */
async function refreshEventList(): Promise<void> {
    const request = ++lastListRequest;
    const search = getSearchBar()?.value ?? "";

    let all: structures.Event[];
    let matching: structures.Event[];
    try {
        const [everyEvent, found] = await Promise.all([
            GetAllEvents(),
            search !== "" ? GetEventsLike(search) : Promise.resolve(null),
        ]);
        // Go sends null for an empty list
        all = everyEvent ?? [];
        matching = search !== "" ? (found ?? []) : all;
    } catch (e) {
        console.log(e);
        return;
    }

    if (request === lastListRequest) {
        allEvents = all;
        matchingEvents = matching;
        renderEventList();
    }
}

// --------------------------------------------------------------------------------------- //

function toTimelineEvent(event: structures.Event, now: Date): TimelineEvent | null {
    const start = new Date(event.start_date);
    if (isNaN(start.getTime())) return null;
    const parsedEnd = new Date(event.end_date);
    const end = isNaN(parsedEnd.getTime()) ? start : parsedEnd;
    return { event, start, end, past: end < now };
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Number of calendar days from `from` to `to` (0 = same day). */
function dayDifference(from: Date, to: Date): number {
    const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function formatHour(date: Date): string {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** "à 18:00", "18:00 – 20:00" or "12 déc. → 14 déc." (year added to the end when it differs). */
function formatWhen({ start, end }: TimelineEvent): string {
    if (isSameDay(start, end)) {
        return start.getTime() === end.getTime()
            ? `à ${formatHour(start)}`
            : `${formatHour(start)} – ${formatHour(end)}`;
    }
    const endYear = end.getFullYear() !== start.getFullYear() ? ` ${end.getFullYear()}` : "";
    return `${start.getDate()} ${SHORT_MONTHS[start.getMonth()]} → ${end.getDate()} ${SHORT_MONTHS[end.getMonth()]}${endYear}`;
}

/** Badge text and CSS modifier, relative to now. */
function relativeBadge(item: TimelineEvent, now: Date): { label: string; tone: string } {
    if (item.past) return { label: "Terminé", tone: "is-done" };
    if (item.start <= now) return { label: "En cours", tone: "is-now" };

    const days = dayDifference(now, item.start);
    if (days === 0) return { label: "Aujourd'hui", tone: "is-soon" };
    if (days === 1) return { label: "Demain", tone: "is-soon" };
    return { label: `Dans ${days} jours`, tone: "is-later" };
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

// --------------------------------------------------------------------------------------- //

function renderEventList(): void {
    const eventList = document.querySelector('.event-list') as HTMLElement | null;
    if (!eventList) return;

    getFilterButtons().forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.filter === currentFilter));
    });

    const now = new Date();
    const upcomingCount = allEvents
        .map(event => toTimelineEvent(event, now))
        .filter(item => item !== null && !item.past).length;
    const summary = document.getElementById("event-summary");
    if (summary) summary.textContent = `${upcomingCount} à venir`;

    const shown = matchingEvents
        .map(event => toTimelineEvent(event, now))
        .filter((item): item is TimelineEvent => {
            if (item === null) return false;
            if (currentFilter === "upcoming") return !item.past;
            if (currentFilter === "past") return item.past;
            return true;
        });
    // Most recent first for past events, chronological otherwise
    const direction = currentFilter === "past" ? -1 : 1;
    shown.sort((a, b) => direction * (a.start.getTime() - b.start.getTime()));

    closeOpenConfirmation = null;
    eventList.innerHTML = '';

    if (shown.length === 0) {
        eventList.appendChild(element("div", "event-empty", "Aucun évènement ne correspond."));
        return;
    }

    let currentLabel: string | null = null;
    let currentGroup: HTMLOListElement | null = null;
    shown.forEach(item => {
        const label = `${MONTHS[item.start.getMonth()]} ${item.start.getFullYear()}`;
        if (label !== currentLabel || !currentGroup) {
            const { section, list } = createMonthGroup(label);
            eventList.appendChild(section);
            currentLabel = label;
            currentGroup = list;
        }
        currentGroup.appendChild(createTimelineItem(item, now));
    });
}

function createMonthGroup(label: string): { section: HTMLElement; list: HTMLOListElement } {
    const section = element("section", "timeline-month-group");
    section.setAttribute("aria-label", label);

    const separator = element("div", "timeline-month");
    separator.setAttribute("aria-hidden", "true");
    separator.append(
        element("span", "timeline-month-line"),
        element("span", "timeline-month-label", label),
        element("span", "timeline-month-line"),
    );

    const list = element("ol", "timeline");
    section.append(separator, list);
    return { section, list };
}

function createTimelineItem(item: TimelineEvent, now: Date): HTMLLIElement {
    const { event, start } = item;
    const li = element("li", item.past ? "timeline-item is-past" : "timeline-item");

    const date = element("div", "timeline-date");
    date.append(
        element("span", "timeline-dow", SHORT_DAYS[start.getDay()]),
        element("span", "timeline-day", String(start.getDate())),
    );

    const rail = element("div", "timeline-rail");
    rail.setAttribute("aria-hidden", "true");
    const dot = element("div", "timeline-dot");
    const color = safeColor(event.color);
    if (color) dot.style.backgroundColor = color;
    rail.appendChild(dot);

    const card = element("article", "timeline-card");
    const head = element("div", "timeline-card-head");
    const badge = relativeBadge(item, now);
    head.append(
        element("h3", "timeline-name", event.name ?? ""),
        element("span", `timeline-badge ${badge.tone}`, badge.label),
    );
    card.append(head, element("span", "timeline-when", formatWhen(item)));
    if (event.description && event.description.trim() !== "") {
        card.appendChild(element("p", "timeline-description", event.description));
    }
    card.appendChild(createDeleteActions(event));

    li.append(date, rail, card);
    return li;
}

/**
 * Footer of a card: a trash button, replaced by an inline confirmation
 * ("Supprimer ?" Annuler / Supprimer) when clicked.
 */
function createDeleteActions(event: structures.Event): HTMLDivElement {
    const actions = element("div", "timeline-actions");
    const name = event.name ?? "";

    const showIdle = (focus: boolean): void => {
        actions.innerHTML = "";
        actions.classList.remove("event-confirm");

        const trash = element("button", "event-delete-button");
        trash.type = "button";
        trash.setAttribute("aria-label", `Supprimer ${name}`);
        trash.title = "Supprimer";
        trash.innerHTML = TRASH_ICON;
        trash.onclick = () => showConfirm();
        actions.appendChild(trash);
        if (focus) trash.focus();
    };

    const close = (): void => {
        if (closeOpenConfirmation === close) closeOpenConfirmation = null;
        showIdle(false);
    };

    const showConfirm = (): void => {
        // Only one card confirming at a time
        if (closeOpenConfirmation && closeOpenConfirmation !== close) closeOpenConfirmation();
        closeOpenConfirmation = close;

        actions.innerHTML = "";
        actions.classList.add("event-confirm");

        const question = element("span", "event-confirm-question", "Supprimer ?");
        const cancel = element("button", "btn btn-cancel", "Annuler");
        cancel.type = "button";
        const confirm = element("button", "btn btn-delete", "Supprimer");
        confirm.type = "button";

        cancel.onclick = () => {
            if (closeOpenConfirmation === close) closeOpenConfirmation = null;
            showIdle(true);
        };
        confirm.onclick = async () => {
            cancel.disabled = true;
            confirm.disabled = true;
            try {
                if (await DeleteEvent(Number(event.event_id))) {
                    popup("Suppression réussie !");
                    await refreshEventList();
                }
            } catch (e) {
                console.log(e);
                popup("Une erreur est survenue lors de la suppression d'un évènement");
            } finally {
                // Still there when the deletion failed
                cancel.disabled = false;
                confirm.disabled = false;
            }
        };

        actions.append(question, cancel, confirm);
        cancel.focus();
    };

    showIdle(false);
    return actions;
}
