import { structures } from "../../wailsjs/go/models";
import { cleanCourseName } from "./functions";

/*
 * Grade averages, shared by the dashboard recap and the grades page.
 *
 * Rule (issue #51): per course, cc = mean of the continuous assessment grades;
 * average = (cc + exam) / 2 when both exist, the one that exists otherwise.
 * A course without any grade is "not graded" and left out of every average.
 * The general average is the mean of the course averages weighted by their
 * coefficient. The bonus is not added.
 */

export type Semester = 1 | 2;

export type CourseSummary = {
    name: string;
    coef: number;
    ects: number;
    /** null when the course has no grade yet */
    average: number | null;
};

export type GradedCourse = CourseSummary & { average: number };

export type SemesterSummary = {
    courses: CourseSummary[];
    /** Courses with an average, lowest first */
    graded: GradedCourse[];
    /** null when no course is graded */
    average: number | null;
    ectsTotal: number;
    /** ECTS of the courses with an average >= 10 */
    ectsOnTrack: number;
    belowTen: number;
    best: GradedCourse | null;
};

/**
 * Parse a number sent as a string by MyGes ("2", "1,5", "", null...).
 * Anything that isn't a finite number counts as 0.
 */
export function parseNumber(value: unknown): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value !== "string") return 0;
    const parsed = parseFloat(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
}

/** Same split as the grades page: "S2 -" courses are S2, everything else S1. */
export function semesterOf(grade: structures.LocalGrades): Semester {
    return grade.course.startsWith("S2 -") ? 2 : 1;
}

export function gradesOfSemester(grades: structures.LocalGrades[], semester: Semester): structures.LocalGrades[] {
    return grades.filter(grade => semesterOf(grade) === semester);
}

function isGrade(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

/** Average of one course, or null when it has no grade. */
export function courseAverage(grade: structures.LocalGrades): number | null {
    const notes = (grade.grades ?? []).filter(isGrade);
    const cc = notes.length > 0 ? notes.reduce((sum, n) => sum + n, 0) / notes.length : null;
    const exam = isGrade(grade.exam) ? grade.exam : null;

    if (cc !== null && exam !== null) return (cc + exam) / 2;
    return exam ?? cc;
}

export function summarizeCourse(grade: structures.LocalGrades): CourseSummary {
    return {
        name: cleanCourseName(grade.course),
        coef: parseNumber(grade.coef),
        ects: parseNumber(grade.ects),
        average: courseAverage(grade),
    };
}

/**
 * Mean of the course averages weighted by their coefficient.
 * When every graded course has a coefficient of 0 (missing on MyGes), falls
 * back to the plain mean so the average isn't lost.
 */
export function generalAverage(courses: CourseSummary[]): number | null {
    const graded = courses.filter((c): c is GradedCourse => c.average !== null);
    if (graded.length === 0) return null;

    const totalCoef = graded.reduce((sum, c) => sum + c.coef, 0);
    if (totalCoef > 0) {
        return graded.reduce((sum, c) => sum + c.average * c.coef, 0) / totalCoef;
    }
    return graded.reduce((sum, c) => sum + c.average, 0) / graded.length;
}

export function summarizeSemester(grades: structures.LocalGrades[]): SemesterSummary {
    const courses = grades.map(summarizeCourse);
    const graded = courses
        .filter((c): c is GradedCourse => c.average !== null)
        .sort((a, b) => a.average - b.average);

    return {
        courses,
        graded,
        average: generalAverage(courses),
        ectsTotal: courses.reduce((sum, c) => sum + c.ects, 0),
        ectsOnTrack: graded.filter(c => c.average >= 10).reduce((sum, c) => sum + c.ects, 0),
        belowTen: graded.filter(c => c.average < 10).length,
        best: graded.length > 0 ? graded[graded.length - 1] : null,
    };
}

/** French number with at most 2 decimals: 12.5 -> "12,5", 13.333 -> "13,33". */
export function formatGrade(value: number): string {
    return (Math.round(value * 100) / 100).toString().replace(".", ",");
}
