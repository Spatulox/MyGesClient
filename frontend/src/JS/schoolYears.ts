import { GetAbsences, GetCourses, GetGrades, GetUserData } from "../../wailsjs/go/backend/App";
import { structures } from "../../wailsjs/go/models";

/*
 * School years for the Cours, Absences and Notes pages.
 *
 * A school year is identified like the backend and the MyGes API do it: by its
 * starting year ("2025" = 2025-2026, see /me/{year}/grades in api/GesApi.go).
 *
 * The backend picks the current year at startup (the latest one of /me/years,
 * App.initYear) and saves it as the user's last_year, which GetUserData returns
 * in `Year`. The Get* bindings always return the data of that year.
 */

export type Course = {
    name: string;
    teacher: string;
    student_group_name: string;
    trimester: string;
    year: string | number;
};

const YEAR_FORMAT = /^20\d{2}$/;

/** "2025" -> "2025-2026" */
export function formatSchoolYear(year: string): string {
    const start = parseInt(year, 10);
    return Number.isFinite(start) ? `${start}-${start + 1}` : year;
}

/** School year of a date: from September on, it's the year starting this year. */
function schoolYearOfDate(date: Date): string {
    const year = date.getFullYear();
    return String(date.getMonth() >= 8 ? year : year - 1);
}

/** The year the backend serves (same as App.getYear), or the one of today as a fallback. */
export async function getCurrentYear(): Promise<string> {
    // TODO(previous-years): use the future GetCurrentYear() binding.
    try {
        const user = await GetUserData();
        if (user && YEAR_FORMAT.test(user.Year)) {
            return user.Year;
        }
    } catch (e) {
        console.log(e);
    }
    return schoolYearOfDate(new Date());
}

/** Every year that can be displayed, most recent first. */
export async function getAvailableYears(): Promise<string[]> {
    // TODO(previous-years): return the future GetSchoolYears() binding
    // (start years of /me/years as strings, most recent first). Until then
    // only the current year is available, which hides the year select.
    return [await getCurrentYear()];
}

/*
 * TODO(previous-years): the fetchers below only serve the current year, with
 * the existing bindings. Plug the future ones here, with the same signatures:
 *   fetchGrades(y)   -> GetGradesForYear(y),   then RefreshGradesForYear(y) when online
 *   fetchAbsences(y) -> GetAbsencesForYear(y), then RefreshAbsencesForYear(y) when online
 *   fetchCourses(y)  -> GetCoursesForYear(y) (raw JSON, like GetCourses)
 * Get*ForYear reads the local cache (immediate), Refresh*ForYear asks MyGes.
 */
async function assertCurrentYear(year: string): Promise<void> {
    const current = await getCurrentYear();
    if (year !== current) {
        throw new Error(`Les données de l'année ${formatSchoolYear(year)} ne sont pas encore disponibles`);
    }
}

export async function fetchGrades(year: string): Promise<structures.LocalGrades[]> {
    await assertCurrentYear(year);
    return (await GetGrades() as structures.LocalGrades[] | null) ?? [];
}

export async function fetchAbsences(year: string): Promise<structures.LocalAbsences[]> {
    await assertCurrentYear(year);
    return (await GetAbsences() as structures.LocalAbsences[] | null) ?? [];
}

/** null when MyGes didn't answer */
export async function fetchCourses(year: string): Promise<Course[] | null> {
    await assertCurrentYear(year);
    const raw = await GetCourses();
    if (!raw) {
        return null;
    }
    const parsed = JSON.parse(raw) as { items?: Course[] | null };
    return parsed.items ?? [];
}
