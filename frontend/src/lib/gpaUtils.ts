import CryptoJS from 'crypto-js';

export interface CourseData {
    name: string;
    grade: number;
    credits: number;
    semester: string;
}

/**
 * Academic half-up rounding (standard in most universities)
 * Rounds 2.235 → 2.24 (not 2.23 as with banker's rounding)
 */
const roundHalfUp = (value: number, decimals: number = 2): number => {
    const multiplier = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};

/**
 * Calculate GPA using Normal 4.0 scale.
 * Formula: Sum(Grade × Credits) / Sum(Credits)
 */
export const calculateNormalGPA = (courses: Array<{ grade: number; credits: number }>): number => {
    if (courses.length === 0) return 0;
    const totalPoints = courses.reduce((sum, c) => sum + (c.grade * c.credits), 0);
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    return roundHalfUp(gpa, 2);
};

/**
 * Calculate GPA using German Modified Bavarian Formula.
 * Formula: 1 + 3 × (Nmax - Nd) / (Nmax - Nmin)
 * Where Nmax = 1.0 (best), Nmin = 4.0 (lowest pass), Nd = achieved grade
 */
export const calculateGermanGPA = (
    courses: Array<{ grade: number; credits: number }>,
    nMax: number = 1.0,
    nMin: number = 4.0
): number => {
    if (courses.length === 0) return 0;

    // Weight grades by credits first
    const totalPoints = courses.reduce((sum, c) => sum + (c.grade * c.credits), 0);
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    const weightedGrade = totalCredits > 0 ? totalPoints / totalCredits : 0;

    // Apply Bavarian formula
    const gpa = 1 + (3 * (nMax - weightedGrade) / (nMax - nMin));
    return roundHalfUp(Math.max(1.0, Math.min(4.0, gpa)), 2); // Clamp between 1.0 and 4.0
};

/**
 * Generate a SHA256 hash for a course record.
 */
export const generateCourseHash = (
    course: CourseData,
    userId: string
): string => {
    const data = `${userId}:${course.semester}:${course.name}:${course.grade}:${course.credits}`;
    return CryptoJS.SHA256(data).toString();
};

/**
 * Parse semester string into sortable components.
 * Format: "Season Year" (e.g., "Winter 2023", "Fall 2025")
 */
const parseSemester = (semester: string): { year: number; seasonOrder: number } => {
    const parts = semester.split(' ');
    const season = parts[0]?.toLowerCase() || '';
    const year = parseInt(parts[1] || '0', 10);

    // Season order within the same year: Spring (0) -> Summer (1) -> Fall (2) -> Winter (3)
    // This ensures Winter 23 < Spring 24 < Winter 24 < Spring 25
    const seasonMap: Record<string, number> = {
        spring: 0,
        summer: 1,
        fall: 2,
        winter: 3,
    };

    return { year, seasonOrder: seasonMap[season] ?? 0 };
};

/**
 * Sort semesters chronologically (oldest to newest).
 */
export const sortSemestersChronologically = (semesters: string[]): string[] => {
    return [...semesters].sort((a, b) => {
        const parsedA = parseSemester(a);
        const parsedB = parseSemester(b);

        // Sort by year first, then by season order
        if (parsedA.year !== parsedB.year) {
            return parsedA.year - parsedB.year;
        }
        return parsedA.seasonOrder - parsedB.seasonOrder;
    });
};

/**
 * Calculate semester GPA from a list of courses.
 */
export const calculateSemesterGPAs = (
    courses: Array<{ grade: number; credits: number; semester: string }>,
    gpaSystem: 'NORMAL' | 'GERMAN',
    nMax: number = 1.0,
    nMin: number = 4.0
): Array<{ semester: string; gpa: number; courseCount: number }> => {
    const semesters = sortSemestersChronologically([...new Set(courses.map(c => c.semester))]);

    return semesters.map(semester => {
        const semCourses = courses.filter(c => c.semester === semester);
        const gpa = gpaSystem === 'GERMAN'
            ? calculateGermanGPA(semCourses, nMax, nMin)
            : calculateNormalGPA(semCourses);
        return { semester, gpa, courseCount: semCourses.length };
    });
};

/**
 * Calculate cumulative GPA progression over semesters.
 */
export const calculateCumulativeProgression = (
    courses: Array<{ grade: number; credits: number; semester: string }>,
    gpaSystem: 'NORMAL' | 'GERMAN',
    nMax: number = 1.0,
    nMin: number = 4.0
): Array<{ semester: string; cumulativeGPA: number }> => {
    const semesters = sortSemestersChronologically([...new Set(courses.map(c => c.semester))]);
    const progression: Array<{ semester: string; cumulativeGPA: number }> = [];

    let runningCourses: Array<{ grade: number; credits: number }> = [];

    for (const semester of semesters) {
        runningCourses = [
            ...runningCourses,
            ...courses.filter(c => c.semester === semester).map(c => ({
                grade: c.grade,
                credits: c.credits,
            })),
        ];
        const cumGPA = gpaSystem === 'GERMAN'
            ? calculateGermanGPA(runningCourses, nMax, nMin)
            : calculateNormalGPA(runningCourses);
        progression.push({ semester, cumulativeGPA: cumGPA });
    }

    return progression;
};

/**
 * Get grade label based on value and system.
 */
export const getGradeLabel = (grade: number, system: 'NORMAL' | 'GERMAN'): string => {
    if (system === 'GERMAN') {
        if (grade <= 1.5) return 'Very Good';
        if (grade <= 2.5) return 'Good';
        if (grade <= 3.5) return 'Satisfactory';
        if (grade <= 4.0) return 'Sufficient';
        return 'Fail';
    } else {
        if (grade >= 3.7) return 'A';
        if (grade >= 3.3) return 'A-';
        if (grade >= 3.0) return 'B+';
        if (grade >= 2.7) return 'B';
        if (grade >= 2.3) return 'B-';
        if (grade >= 2.0) return 'C+';
        if (grade >= 1.7) return 'C';
        if (grade >= 1.3) return 'C-';
        if (grade >= 1.0) return 'D';
        return 'F';
    }
};

/**
 * Get valid grade range based on system.
 */
export const getGradeRange = (system: 'NORMAL' | 'GERMAN'): { min: number; max: number; step: number } => {
    if (system === 'GERMAN') {
        return { min: 1.0, max: 5.0, step: 0.1 };
    }
    return { min: 0, max: 4.0, step: 0.1 };
};
