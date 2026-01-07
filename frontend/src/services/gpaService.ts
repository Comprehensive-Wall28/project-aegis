import axios from 'axios';
import tokenService from './tokenService';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api/gpa`;

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add Authorization header if token exists
apiClient.interceptors.request.use((config) => {
    const token = tokenService.getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Clear token on 401 responses (auto-logout)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            tokenService.removeToken();
        }
        return Promise.reject(error);
    }
);

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
        const response = await apiClient.get<EncryptedCourse[]>('/courses');
        return response.data;
    },

    createEncryptedCourse: async (data: EncryptedCoursePayload): Promise<EncryptedCourse> => {
        const response = await apiClient.post<EncryptedCourse>('/courses', data);
        return response.data;
    },

    deleteCourse: async (id: string): Promise<void> => {
        await apiClient.delete(`/courses/${id}`);
    },

    // Preferences
    getPreferences: async (): Promise<Preferences> => {
        const response = await apiClient.get<Preferences>('/preferences');
        return response.data;
    },

    updatePreferences: async (data: Preferences): Promise<Preferences> => {
        const response = await apiClient.put<Preferences>('/preferences', data);
        return response.data;
    },

    // Migration endpoints
    getUnmigratedCourses: async (): Promise<UnmigratedCourse[]> => {
        const response = await apiClient.get<UnmigratedCourse[]>('/courses/unmigrated');
        return response.data;
    },

    migrateCourse: async (id: string, data: EncryptedCoursePayload): Promise<EncryptedCourse> => {
        const response = await apiClient.put<EncryptedCourse>(`/courses/${id}/migrate`, data);
        return response.data;
    },
};

export default gpaService;

