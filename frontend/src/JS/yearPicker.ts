import { formatSchoolYear } from "./schoolYears";

/*
 * "Année" select and archive banner shared by the Cours, Absences and Notes pages.
 * The select is hidden when only one year is available, so the banner can't show either.
 */

export type YearPickerOptions = {
    /** Wrapper of the label and the select */
    picker: HTMLElement;
    select: HTMLSelectElement;
    /** Placeholder of the "(archive)" banner */
    banner: HTMLElement;
    /** Gets the "has-year-picker" class when the select is shown */
    titleRow?: HTMLElement | null;
    years: string[];
    current: string;
    selected: string;
    onChange: (year: string) => void;
};

export function renderYearPicker(options: YearPickerOptions): void {
    const { picker, select, banner, titleRow, years, current, selected, onChange } = options;
    const several = years.length > 1;

    picker.hidden = !several;
    titleRow?.classList.toggle("has-year-picker", several);

    select.replaceChildren(...years.map(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year === current ? `${formatSchoolYear(year)} (en cours)` : formatSchoolYear(year);
        return option;
    }));
    select.value = selected;
    // onchange / onclick: a single handler, even after several visits
    select.onchange = () => onChange(select.value);

    banner.replaceChildren();
    banner.hidden = !several || selected === current;
    if (banner.hidden) {
        return;
    }

    const text = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = formatSchoolYear(selected);
    text.append("Affichage de l'année ", strong, " (archive).");

    const back = document.createElement("button");
    back.type = "button";
    back.className = "tab-button active";
    back.textContent = `Revenir à ${formatSchoolYear(current)}`;
    back.onclick = () => onChange(current);

    banner.append(text, back);
}
