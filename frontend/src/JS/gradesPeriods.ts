import { structures } from "../../wailsjs/go/models";
import { cleanCourseName } from "./functions";
import { CourseSummary, Semester, courseAverage, generalAverage, parseNumber, semesterOf } from "./gradesCalc";

/*
 * Courses of the grades page for a period: one semester, or the whole year.
 * The per-course average and the general average come from gradesCalc.ts.
 *
 * In the "year" view, the courses with the same (cleaned) name in S1 and S2
 * are merged: coef, ECTS and bonus are summed, and the yearly average is the
 * mean of the semester averages weighted by their coef. The bonus is never
 * added to an average.
 */

export type Period = Semester | "year";

/** One course in one semester */
export type CoursePart = {
    semester: Semester;
    teacher: string;
    coef: number;
    ects: number;
    bonus: number;
    /** Continuous assessment grades */
    notes: number[];
    /** Mean of the notes, null without notes */
    cc: number | null;
    exam: number | null;
    average: number | null;
};

/** One line of the course list: a course, or the same course merged over both semesters */
export type CourseEntry = CourseSummary & {
    teacher: string;
    bonus: number;
    parts: CoursePart[];
    merged: boolean;
    /** Coef of the graded parts only: weight of the entry in the general average */
    gradedCoef: number;
};

function isGrade(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function toPart(grade: structures.LocalGrades): CoursePart {
    const notes = (grade.grades ?? []).filter(isGrade);
    return {
        semester: semesterOf(grade),
        teacher: String(grade.teacher_name ?? "").trim(),
        coef: parseNumber(grade.coef),
        ects: parseNumber(grade.ects),
        bonus: parseNumber(grade.bonus),
        notes,
        cc: notes.length > 0 ? notes.reduce((sum, n) => sum + n, 0) / notes.length : null,
        exam: isGrade(grade.exam) ? grade.exam : null,
        average: courseAverage(grade),
    };
}

function toEntry(name: string, parts: CoursePart[]): CourseEntry {
    const parts1 = [...parts].sort((a, b) => a.semester - b.semester);
    const teachers = [...new Set(parts1.map(p => p.teacher).filter(Boolean))];
    const average = generalAverage(parts1.map(p => ({ name, coef: p.coef, ects: p.ects, average: p.average })));
    return {
        name,
        teacher: teachers.join(" / "),
        coef: parts1.reduce((sum, p) => sum + p.coef, 0),
        ects: parts1.reduce((sum, p) => sum + p.ects, 0),
        bonus: parts1.reduce((sum, p) => sum + p.bonus, 0),
        average,
        parts: parts1,
        merged: parts1.length > 1,
        gradedCoef: parts1.filter(p => p.average !== null).reduce((sum, p) => sum + p.coef, 0),
    };
}

/** The courses of a period, sorted by name. */
export function buildEntries(grades: structures.LocalGrades[], period: Period): CourseEntry[] {
    const entries: CourseEntry[] = [];

    if (period === "year") {
        const byName = new Map<string, { name: string; parts: CoursePart[] }>();
        grades.forEach(grade => {
            const name = cleanCourseName(grade.course);
            const key = name.toLocaleLowerCase("fr");
            const group = byName.get(key) ?? { name, parts: [] };
            group.parts.push(toPart(grade));
            byName.set(key, group);
        });
        byName.forEach(group => entries.push(toEntry(group.name, group.parts)));
    } else {
        grades
            .filter(grade => semesterOf(grade) === period)
            .forEach(grade => entries.push(toEntry(cleanCourseName(grade.course), [toPart(grade)])));
    }

    return entries.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * General average of a period: mean of the course averages weighted by coef,
 * ungraded courses left out. A merged course weighs the coef of its graded
 * semesters only, so the year average is the same as averaging every graded
 * course of both semesters.
 */
export function periodAverage(entries: CourseEntry[]): number | null {
    return generalAverage(entries.map(e => ({ name: e.name, coef: e.gradedCoef, ects: e.ects, average: e.average })));
}
