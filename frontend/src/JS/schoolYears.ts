import {
    GetAbsencesForYear,
    GetCoursesForYear,
    GetCurrentYear,
    GetGradesForYear,
    GetSchoolYears,
    GetUserData,
    RefreshAbsencesForYear,
    RefreshGradesForYear,
} from "../../wailsjs/go/backend/App";
import { structures } from "../../wailsjs/go/models";

/*
 * School years for the Cours, Absences and Notes pages.
 *
 * A school year is identified like the backend and the MyGes API do it: by its
 * starting year ("2025" = 2025-2026, see /me/{year}/grades in api/GesApi.go).
 *
 * The backend picks the current year (the latest one of /me/years, App.initYear)
 * and lists the years of the student (GetSchoolYears). Grades and absences are
 * cached locally per year; courses are always asked to MyGes.
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

/**
 * The year the backend serves by default. Offline at startup, the backend may
 * not know it yet ("" or "1970"): fall back to the user's last year, then to today.
 */
export async function getCurrentYear(): Promise<string> {
    try {
        const year = await GetCurrentYear();
        if (YEAR_FORMAT.test(year)) {
            return year;
        }
        const user = await GetUserData();
        if (user && YEAR_FORMAT.test(user.Year)) {
            return user.Year;
        }
    } catch (e) {
        console.log(e);
    }
    return schoolYearOfDate(new Date());
}

/** Every year that can be displayed, most recent first (always contains the current one). */
export async function getAvailableYears(): Promise<string[]> {
    const current = await getCurrentYear();
    let years: string[] = [];
    try {
        years = ((await GetSchoolYears()) ?? []).map(String).filter(y => YEAR_FORMAT.test(y));
    } catch (e) {
        console.log(e);
    }
    if (!years.includes(current)) {
        years.push(current);
    }
    return [...new Set(years)].sort((a, b) => Number(b) - Number(a));
}

/**
 * Current year: the local cache, kept up to date by the backend every hour.
 * Previous year: ask MyGes (one request), and fall back to the local cache
 * when that fails (offline, or a refresh of the backend already running).
 */
async function fetchYear<T>(
    year: string,
    fromCache: (year: string) => Promise<T[] | null>,
    fromMyGes: (year: string) => Promise<T[] | null>,
): Promise<T[]> {
    if (year !== await getCurrentYear()) {
        try {
            return (await fromMyGes(year)) ?? [];
        } catch (e) {
            console.log(e);
        }
    }
    return (await fromCache(year)) ?? [];
}

export async function fetchGrades(year: string): Promise<structures.LocalGrades[]> {
    return fetchYear(year, GetGradesForYear, RefreshGradesForYear);
}

export async function fetchAbsences(year: string): Promise<structures.LocalAbsences[]> {
    return fetchYear(year, GetAbsencesForYear, RefreshAbsencesForYear);
}

/** null when MyGes didn't answer */
export async function fetchCourses(year: string): Promise<Course[] | null> {
    const raw = await GetCoursesForYear(year);
    if (!raw) {
        return null;
    }
    const parsed = JSON.parse(raw) as { items?: Course[] | null };
    return parsed.items ?? [];
}
