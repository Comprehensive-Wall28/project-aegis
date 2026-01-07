import apiClient from './api';

const PREFIX = '/gpa';



// Types for plaintext course data (after decryption)
export interface Course {
    _id: string;
    name: string;
    grade: number;
    credits: number;
    semester: string;
    createdAt: string;
    updatedAt: string;
}

export interface CourseInput {
    name: string;
    grade: number;
    credits: number;
    semester: string;
}

// Types for encrypted course data (from/to backend)
export interface EncryptedCoursePayload {
    encryptedData: string;
    encapsulatedKey: string;
    encryptedSymmetricKey: string;
}

export interface EncryptedCourse extends EncryptedCoursePayload {
    _id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export interface SemesterGPA {
    semester: string;
    gpa: number;
    courseCount: number;
}

export interface CumulativeProgression {
    semester: string;
    cumulativeGPA: number;
}

export interface GPACalculation {
    gpaSystem: 'NORMAL' | 'GERMAN';
    cumulativeGPA: number;
    totalCourses: number;
    totalCredits: number;
    semesterGPAs: SemesterGPA[];
    cumulativeProgression: CumulativeProgression[];
}

export interface Preferences {
    gpaSystem: 'NORMAL' | 'GERMAN';
}

// Legacy unmigrated course (plaintext from old schema)
export interface UnmigratedCourse {
    _id: string;
    name: string;
    grade: number;
    credits: number;
    semester: string;
    createdAt: string;
    updatedAt: string;
}

const gpaService = {
    // Course CRUD - now handles encrypted data
    getEncryptedCourses: async (): Promise<EncryptedCourse[]> => {
        const response = await apiClient.get<EncryptedCourse[]>(`${PREFIX}/courses`);
        return response.data;
    },

    createEncryptedCourse: async (data: EncryptedCoursePayload): Promise<EncryptedCourse> => {
        const response = await apiClient.post<EncryptedCourse>(`${PREFIX}/courses`, data);
        return response.data;
    },

    deleteCourse: async (id: string): Promise<void> => {
        await apiClient.delete(`${PREFIX}/courses/${id}`);
    },

    // Preferences
    getPreferences: async (): Promise<Preferences> => {
        const response = await apiClient.get<Preferences>(`${PREFIX}/preferences`);
        return response.data;
    },

    updatePreferences: async (data: Preferences): Promise<Preferences> => {
        const response = await apiClient.put<Preferences>(`${PREFIX}/preferences`, data);
        return response.data;
    },

    // Migration endpoints
    getUnmigratedCourses: async (): Promise<UnmigratedCourse[]> => {
        const response = await apiClient.get<UnmigratedCourse[]>(`${PREFIX}/courses/unmigrated`);
        return response.data;
    },

    migrateCourse: async (id: string, data: EncryptedCoursePayload): Promise<EncryptedCourse> => {
        const response = await apiClient.put<EncryptedCourse>(`${PREFIX}/courses/${id}/migrate`, data);
        return response.data;
    },
};

export default gpaService;

