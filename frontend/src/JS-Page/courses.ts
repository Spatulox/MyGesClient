import { escapeHtml, scrollMainPart } from "../JS/functions";
import { popup } from "../JS/popups";
import { Course, fetchCourses, getAvailableYears, getCurrentYear } from "../JS/schoolYears";
import { renderYearPicker } from "../JS/yearPicker";

let isStillRunning = false;
/** Incremented on each load, so a slow answer for a previous year is ignored */
let loadToken = 0;

const ALL = "all";
const TILE_COLORS = 5;

type CourseView = Course & { trimesterKey: string };

type PageState = {
    years: string[];
    current: string;
    year: string;
    trimester: string;
    trimesters: string[];
    items: CourseView[];
};

type Elements = {
    search: HTMLInputElement;
    grid: HTMLElement;
    filters: HTMLElement;
    count: HTMLElement;
    loading: HTMLElement | null;
    picker: HTMLElement;
    select: HTMLSelectElement;
    banner: HTMLElement;
};

export async function courses(): Promise<void> {
    if (isStillRunning) {
        return;
    }
    isStillRunning = true;
    try {
        scrollMainPart();
        const page = document.getElementById("courses");
        const el = page && getElements(page);
        if (!el) {
            popup("Impossible d'accéder à certains éléments du DOM");
            return;
        }

        const current = await getCurrentYear();
        const state: PageState = {
            years: await getAvailableYears(),
            current,
            year: current,
            trimester: ALL,
            trimesters: [],
            items: [],
        };

        // oninput / onclick: a single handler, even after several visits
        el.search.oninput = () => render(el, state);
        el.filters.onclick = (event) => {
            const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-trimester]");
            if (!button) return;
            state.trimester = button.dataset.trimester ?? ALL;
            updateFilters(el, state);
            render(el, state);
        };

        await loadYear(el, state, current);
    } finally {
        isStillRunning = false;
    }
}

function getElements(page: HTMLElement): Elements | null {
    const search = page.querySelector<HTMLInputElement>("#search-bar-courses");
    const grid = page.querySelector<HTMLElement>("#courseGrid");
    const filters = page.querySelector<HTMLElement>("#courses-filters");
    const count = page.querySelector<HTMLElement>("#courses-count");
    const picker = page.querySelector<HTMLElement>("#courses-year-picker");
    const select = page.querySelector<HTMLSelectElement>("#year-courses");
    const banner = page.querySelector<HTMLElement>("#courses-archive");
    if (!search || !grid || !filters || !count || !picker || !select || !banner) {
        return null;
    }
    return { search, grid, filters, count, picker, select, banner, loading: page.querySelector<HTMLElement>("#loadingCourses") };
}

async function loadYear(el: Elements, state: PageState, year: string): Promise<void> {
    const token = ++loadToken;
    state.year = year;
    state.trimester = ALL;
    renderYearPicker({
        picker: el.picker, select: el.select, banner: el.banner,
        years: state.years, current: state.current, selected: year,
        onChange: (newYear) => { void loadYear(el, state, newYear); },
    });

    if (el.loading) el.loading.hidden = false;
    try {
        const items = await fetchCourses(year);
        if (token !== loadToken) return;
        if (!items) {
            popup("Impossible de lister vos Cours");
        }
        state.items = (items ?? []).map(course => ({ ...course, trimesterKey: String(course.trimester ?? "").trim() }));
        state.trimesters = [...new Set(state.items.map(c => c.trimesterKey))]
            .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
        renderFilters(el, state);
        render(el, state);
    } catch (e) {
        console.log(e);
        if (token !== loadToken) return;
        state.items = [];
        state.trimesters = [];
        el.filters.replaceChildren();
        el.count.textContent = "";
        el.grid.innerHTML = `<div class="courses-empty">Une erreur s'est produite</div>`;
    } finally {
        if (token === loadToken && el.loading) el.loading.hidden = true;
    }
}

/** Filters: "Tous" + one per trimester present in the data */
function renderFilters(el: Elements, state: PageState): void {
    el.filters.innerHTML = [ALL, ...state.trimesters].map(key => {
        const label = key === ALL ? "Tous" : trimesterLabel(key);
        return `<button type="button" class="tab-button" data-trimester="${escapeHtml(key)}">${escapeHtml(label)}</button>`;
    }).join("");
    updateFilters(el, state);
}

/** Updates the buttons in place, so the clicked one keeps the focus */
function updateFilters(el: Elements, state: PageState): void {
    el.filters.querySelectorAll<HTMLButtonElement>("button[data-trimester]").forEach(button => {
        const active = button.dataset.trimester === state.trimester;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
}

function render(el: Elements, state: PageState): void {
    const trimesters = state.trimesters;
    const query = el.search.value.trim().toLowerCase();
    const shown = state.items.filter(course => {
        if (state.trimester !== ALL && course.trimesterKey !== state.trimester) return false;
        return !query
            || String(course.name ?? "").toLowerCase().includes(query)
            || String(course.teacher ?? "").toLowerCase().includes(query);
    });
    el.count.textContent = `${shown.length} cours`;

    if (shown.length === 0) {
        el.grid.innerHTML = `<div class="courses-empty">Aucun cours ne correspond.</div>`;
        return;
    }

    el.grid.innerHTML = trimesters.map(key => {
        const items = shown.filter(course => course.trimesterKey === key);
        if (items.length === 0) return "";
        const label = escapeHtml(trimesterLabel(key));
        return `
            <section class="courses-group" aria-label="${label}">
                <h2>${label} <span class="courses-group-count">· ${items.length}</span></h2>
                <ul class="courses-cards">${items.map(createCourseCard).join("")}</ul>
            </section>`;
    }).join("");
}

/** "1" -> "Trimestre 1"; other values (e.g. "Trimestre 1", period ids) are shown as MyGes sends them */
function trimesterLabel(key: string): string {
    if (key === "") return "Autres";
    return /^\d{1,2}$/.test(key) ? `Trimestre ${key}` : key;
}

function initials(name: string): string {
    const words = name.replace(/['’]/g, " ").split(/\s+/)
        .filter(w => w.length > 2 || /^[A-ZÀ-Ý]/.test(w));
    const letters = words.slice(0, 2).map(w => w[0].toUpperCase()).join("");
    return letters || name.trim().charAt(0).toUpperCase() || "?";
}

/** Same color for the same course, whatever the order */
function tileColor(name: string): number {
    let hash = 0;
    for (const char of name) {
        hash = (hash * 31 + char.charCodeAt(0)) | 0;
    }
    return Math.abs(hash) % TILE_COLORS;
}

function createCourseCard(course: CourseView): string {
    const name = String(course.name ?? "");
    return `
        <li class="course-tile-card">
            <div class="course-tile tile-color-${tileColor(name)}" aria-hidden="true">${escapeHtml(initials(name))}</div>
            <div class="course-tile-body">
                <span class="course-tile-name">${escapeHtml(name)}</span>
                <span class="course-tile-teacher">${escapeHtml(course.teacher)}</span>
                <span class="course-tile-group">${escapeHtml(course.student_group_name)}</span>
            </div>
        </li>`;
}
