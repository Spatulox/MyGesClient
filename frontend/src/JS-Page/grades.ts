import { structures } from "../../wailsjs/go/models";
import { cleanCourseName, escapeHtml, scrollMainPart } from "../JS/functions";
import { formatGrade, semesterOf } from "../JS/gradesCalc";
import { CourseEntry, CoursePart, Period, buildEntries, periodAverage } from "../JS/gradesPeriods";
import { popup } from "../JS/popups";
import { fetchGrades, formatSchoolYear, getAvailableYears, getCurrentYear } from "../JS/schoolYears";
import { renderYearPicker } from "../JS/yearPicker";

let isStillRunning = false;
/** Incremented on each load, so a slow answer for a previous year is ignored */
let loadToken = 0;

/** Height of a 20/20 bar in the chart, in px (the 10 line is at half of it, see pagesRework.css) */
const CHART_HEIGHT = 150;

const PERIODS: [Period, string][] = [
    [1, "Semestre 1"],
    [2, "Semestre 2"],
    ["year", "Année complète"],
];

type PageState = {
    years: string[];
    current: string;
    year: string;
    grades: structures.LocalGrades[];
    hasSemester2: boolean;
    period: Period;
    entries: CourseEntry[];
    selected: number;
};

type Elements = {
    tabs: HTMLElement;
    content: HTMLElement;
    picker: HTMLElement;
    select: HTMLSelectElement;
    banner: HTMLElement;
};

export async function grades(): Promise<void> {
    if (isStillRunning) {
        return;
    }
    isStillRunning = true;
    try {
        scrollMainPart();

        // Every query is scoped to the page, never to the whole document
        const page = document.getElementById("grades");
        const tabs = page?.querySelector<HTMLElement>("#grades-tabs");
        const content = page?.querySelector<HTMLElement>("#grades-page-content");
        const picker = page?.querySelector<HTMLElement>("#grades-year-picker");
        const select = page?.querySelector<HTMLSelectElement>("#year-grades");
        const banner = page?.querySelector<HTMLElement>("#grades-archive");
        if (!tabs || !content || !picker || !select || !banner) {
            return;
        }
        const el: Elements = { tabs, content, picker, select, banner };

        const current = await getCurrentYear();
        const state: PageState = {
            years: await getAvailableYears(),
            current,
            year: current,
            grades: [],
            hasSemester2: false,
            period: 1,
            entries: [],
            selected: 0,
        };

        tabs.innerHTML = PERIODS.map(([period, label]) =>
            `<button type="button" class="tab-button" data-period="${period}">${label}</button>`).join("");

        // onclick: a single handler, even after several visits
        tabs.onclick = (event) => {
            const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-period]");
            if (!button) return;
            const value = button.dataset.period;
            state.period = value === "year" ? "year" : value === "2" ? 2 : 1;
            state.selected = 0;
            updateTabs(el, state);
            renderContent(el, state);
        };

        content.onclick = (event) => {
            const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-course]");
            if (!button) return;
            state.selected = Number(button.dataset.course) || 0;
            updateSelection(el, state);
        };

        await loadYear(el, state, current);
    } finally {
        isStillRunning = false;
    }
}

async function loadYear(el: Elements, state: PageState, year: string): Promise<void> {
    const token = ++loadToken;
    state.year = year;
    state.selected = 0;
    renderYearPicker({
        picker: el.picker, select: el.select, banner: el.banner,
        years: state.years, current: state.current, selected: year,
        onChange: (newYear) => { void loadYear(el, state, newYear); },
    });

    let grades: structures.LocalGrades[];
    try {
        grades = await fetchGrades(year);
    } catch (e) {
        console.log(e);
        if (token === loadToken) {
            el.content.innerHTML = `<div class="grades-empty">Une erreur s'est produite</div>`;
            popup("Impossible de récupérer vos notes");
        }
        return;
    }
    if (token !== loadToken) return;

    state.grades = grades;
    state.hasSemester2 = grades.some(grade => semesterOf(grade) === 2);
    if (state.period === 2 && !state.hasSemester2) {
        state.period = 1;
    }
    updateTabs(el, state);
    renderContent(el, state);
}

/** Updates the tabs in place, so the clicked one keeps the focus */
function updateTabs(el: Elements, state: PageState): void {
    el.tabs.querySelectorAll<HTMLButtonElement>("button[data-period]").forEach(button => {
        const period = button.dataset.period;
        const active = period === String(state.period);
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
        // No S2 tab when S2 has no course
        button.hidden = period === "2" && !state.hasSemester2;
    });
}

// ------------------------------------------------ //

/** "below 10" orange, "14 and more" light blue */
function toneClass(value: number | null): string {
    if (value === null) return "tone-none";
    if (value < 10) return "tone-low";
    if (value >= 14) return "tone-high";
    return "";
}

function badgeClass(value: number | null): string {
    if (value === null) return "badge-none";
    if (value < 10) return "badge-low";
    if (value >= 14) return "badge-high";
    return "badge-mid";
}

function gradeOrDash(value: number | null): string {
    return value === null ? "—" : formatGrade(value);
}

function periodLabel(state: PageState): string {
    return state.period === "year" ? `année ${formatSchoolYear(state.year)}` : `semestre ${state.period}`;
}

function semesterTag(entry: CourseEntry): string {
    return [...new Set(entry.parts.map(p => `S${p.semester}`))].join(" + ");
}

// ------------------------------------------------ //

function renderContent(el: Elements, state: PageState): void {
    state.entries = buildEntries(state.grades, state.period);
    state.selected = Math.min(state.selected, Math.max(state.entries.length - 1, 0));

    if (state.entries.length === 0) {
        el.content.innerHTML = `<div class="grades-empty">Aucune note pour l'instant</div>`;
        return;
    }

    el.content.innerHTML = `
        <section class="grades-summary" aria-label="Résumé">
            ${renderAverageCard(state)}
            ${renderEctsCard(state)}
            ${state.period === "year" ? renderSemestersCard(state) : ""}
        </section>
        <div class="grades-layout">
            <ul class="grades-courses" aria-label="Matières">
                ${state.entries.map((entry, index) => renderCourseButton(entry, index, state.period === "year")).join("")}
            </ul>
            <section class="grades-detail" aria-label="Détail de la matière"></section>
        </div>`;

    updateSelection(el, state);
}

function renderAverageCard(state: PageState): string {
    const average = periodAverage(state.entries);
    return `
        <div class="grades-card grades-card-average">
            <span class="grades-muted">Moyenne générale · ${escapeHtml(periodLabel(state))}</span>
            <span class="grades-big ${toneClass(average)}">${average === null ? "—" : average.toFixed(2).replace(".", ",")}<span class="grades-big-unit"> / 20</span></span>
            <span class="grades-muted">Pondérée par les coefficients</span>
        </div>`;
}

function renderEctsCard(state: PageState): string {
    const entries = state.entries;
    const total = entries.reduce((sum, e) => sum + e.ects, 0);
    const onTrack = entries.filter(e => e.average !== null && e.average >= 10).reduce((sum, e) => sum + e.ects, 0);
    const pending = entries.filter(e => e.average === null).reduce((sum, e) => sum + e.ects, 0);
    const aria = `${formatGrade(onTrack)} ECTS sur ${formatGrade(total)} en bonne voie, ${formatGrade(pending)} pas encore notés`;

    const segments = entries.map(e => {
        const status = e.average === null ? "ects-pending" : e.average < 10 ? "ects-low" : "ects-ok";
        const title = `${e.name} · ${formatGrade(e.ects)} ECTS`;
        // Width proportional to the ECTS of the course
        return `<div class="ects-segment ${status}" style="flex: ${Math.max(e.ects, 0)} 1 0" title="${escapeHtml(title)}"></div>`;
    }).join("");

    return `
        <div class="grades-card grades-card-ects">
            <div class="grades-card-head">
                <span class="grades-muted">ECTS · ${escapeHtml(periodLabel(state))}</span>
                <span class="grades-muted">${formatGrade(pending)} ECTS pas encore notés</span>
            </div>
            <span class="grades-big">${formatGrade(onTrack)}<span class="grades-big-unit"> / ${formatGrade(total)} en bonne voie</span></span>
            <div class="ects-bar" role="img" aria-label="${escapeHtml(aria)}">${segments}</div>
            <div class="ects-legend" aria-hidden="true">
                <span><span class="ects-swatch ects-ok"></span>10 et plus</span>
                <span><span class="ects-swatch ects-low"></span>Sous 10</span>
                <span><span class="ects-swatch ects-pending"></span>Pas encore noté</span>
            </div>
        </div>`;
}

function renderSemestersCard(state: PageState): string {
    const semesters = state.hasSemester2 ? [1, 2] as const : [1] as const;
    const rows = semesters.map(semester => {
        const average = periodAverage(buildEntries(state.grades, semester));
        return `
            <div class="grades-semester-row">
                <span>Semestre ${semester}</span>
                <span class="grades-semester-average ${toneClass(average)}">${gradeOrDash(average)}</span>
            </div>`;
    }).join("");

    return `
        <div class="grades-card grades-card-semesters">
            <span class="grades-muted">Par semestre</span>
            ${rows}
        </div>`;
}

function renderCourseButton(entry: CourseEntry, index: number, showTag: boolean): string {
    return `
        <li>
            <button type="button" class="grades-course" data-course="${index}" aria-pressed="false">
                <span class="grades-course-text">
                    <span class="grades-course-name">${escapeHtml(entry.name)}</span>
                    ${showTag ? `<span class="grades-course-tag">${semesterTag(entry)}</span>` : ""}
                </span>
                <span class="grades-badge ${badgeClass(entry.average)}">${gradeOrDash(entry.average)}</span>
            </button>
        </li>`;
}

/** Highlights the selected course and shows its detail */
function updateSelection(el: Elements, state: PageState): void {
    el.content.querySelectorAll<HTMLButtonElement>("button[data-course]").forEach(button => {
        const active = Number(button.dataset.course) === state.selected;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });

    const detail = el.content.querySelector<HTMLElement>(".grades-detail");
    const entry = state.entries[state.selected];
    if (detail && entry) {
        detail.innerHTML = renderDetail(entry, state.period === "year");
    }
}

// ------------------------------------------------ //

type Bar = { value: number; caption: string; exam: boolean; gap: boolean };

function renderDetail(entry: CourseEntry, yearView: boolean): string {
    const bars: Bar[] = [];
    entry.parts.forEach((part, partIndex) => {
        const prefix = yearView ? `S${part.semester} ` : "";
        // Gap between the semesters
        let gap = partIndex > 0;
        part.notes.forEach((note, i) => {
            bars.push({ value: note, caption: `${prefix}N${i + 1}`, exam: false, gap });
            gap = false;
        });
        if (part.exam !== null) {
            bars.push({ value: part.exam, caption: `${prefix}Exam`, exam: true, gap });
        }
    });

    const coef = entry.merged ? entry.parts.map(p => formatGrade(p.coef)).join(" + ") : formatGrade(entry.coef);
    const bonus = entry.bonus > 0 ? `+${formatGrade(entry.bonus)}` : "0";

    const parts = entry.merged ? `
        <div class="grades-parts">
            ${entry.parts.map(part => `
                <span class="grades-part">
                    <strong>S${part.semester}</strong>
                    <span class="grades-muted">coef ${formatGrade(part.coef)}</span>
                    <span class="grades-part-average ${toneClass(part.average)}">${gradeOrDash(part.average)}</span>
                </span>`).join("")}
        </div>` : "";

    return `
        <div class="grades-detail-head">
            <h3>${escapeHtml(entry.name)}</h3>
            <span>${escapeHtml(entry.teacher)}</span>
        </div>
        <div class="grades-detail-body">
            <dl class="grades-tiles">
                <div class="grades-tile">
                    <dt>${entry.merged ? "Moyenne annuelle" : "Moyenne"}</dt>
                    <dd class="${toneClass(entry.average)}">${gradeOrDash(entry.average)}</dd>
                </div>
                <div class="grades-tile">
                    <dt>Coefficient</dt>
                    <dd>${coef}</dd>
                </div>
                <div class="grades-tile">
                    <dt>ECTS</dt>
                    <dd>${formatGrade(entry.ects)}</dd>
                </div>
                <div class="grades-tile">
                    <dt>Bonus</dt>
                    <dd class="${entry.bonus > 0 ? "tone-high" : ""}">${bonus}</dd>
                </div>
            </dl>
            ${parts}
            <div class="grades-notes">
                <h4>Notes</h4>
                ${bars.length === 0 ? `<div class="grades-notes-empty">Aucune note pour l'instant</div>` : renderChart(bars)}
            </div>
            <div class="grades-calc">
                <span class="grades-muted">Calcul</span>
                ${formulas(entry).map(text => `<span>${escapeHtml(text)}</span>`).join("")}
            </div>
        </div>`;
}

function renderChart(bars: Bar[]): string {
    const label = "Notes : " + bars.map(b => `${b.caption} ${formatGrade(b.value)}`).join(", ");
    const height = (value: number) => (Math.min(Math.max(value, 0), 20) / 20 * CHART_HEIGHT).toFixed(1);
    const columns = bars.map(b => {
        const barClass = b.exam ? "grade-bar-exam" : b.value < 10 ? "grade-bar-low" : "";
        return `
            <div class="grade-column${b.gap ? " grade-gap" : ""}">
                <span class="grade-value ${toneClass(b.value)}">${formatGrade(b.value)}</span>
                <div class="grade-bar ${barClass}" style="height: ${height(b.value)}px"></div>
            </div>`;
    }).join("");
    const captions = bars.map(b => `<span class="grade-caption${b.gap ? " grade-gap" : ""}">${b.caption}</span>`).join("");

    return `
        <div class="grades-chart-scroll">
            <div class="grades-chart" role="img" aria-label="${escapeHtml(label)}">
                <div class="grades-chart-ten" aria-hidden="true"><span>10</span></div>
                <div class="grades-chart-bars" aria-hidden="true">${columns}</div>
            </div>
            <div class="grades-chart-captions" aria-hidden="true">${captions}</div>
        </div>`;
}

function partFormula(part: CoursePart, prefix: string): string {
    if (part.cc !== null && part.exam !== null) {
        return `${prefix}moyenne des notes ${formatGrade(part.cc)} × 50 % + exam ${formatGrade(part.exam)} × 50 % = ${gradeOrDash(part.average)}`;
    }
    if (part.cc !== null) return `${prefix}pas encore d'exam : moyenne des notes = ${formatGrade(part.cc)}`;
    if (part.exam !== null) return `${prefix}exam seul = ${formatGrade(part.exam)}`;
    return `${prefix}aucune note`;
}

function formulas(entry: CourseEntry): string[] {
    const lines = entry.parts.map(part => partFormula(part, entry.merged ? `Semestre ${part.semester} : ` : ""));
    if (entry.merged) {
        const graded = entry.parts.filter(p => p.average !== null);
        lines.push(graded.length === 0
            ? "Année : aucune note"
            : "Année : " + graded.map(p => `${formatGrade(p.average!)} × coef ${formatGrade(p.coef)}`).join(" + ") + ` → ${gradeOrDash(entry.average)}`);
    }
    return lines;
}

// ------------------------------------------------ //

/**
 * Kept for the dashboard grades recap (dashbord.ts), which still uses it on this branch.
 */
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
    const courseName = cleanCourseName(grade.course);
    return { gradeElement, courseName, gradesHtml, examHtml };
}
