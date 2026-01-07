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

// Types
export interface Course {
    _id: string;
    name: string;
    grade: number;
    credits: number;
    semester: string;
    recordHash: string;
    createdAt: string;
    updatedAt: string;
}

export interface CourseInput {
    name: string;
    grade: number;
    credits: number;
    semester: string;
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

const gpaService = {
    // Course CRUD
    getCourses: async (): Promise<Course[]> => {
        const response = await apiClient.get<Course[]>('/courses');
        return response.data;
    },

    createCourse: async (data: CourseInput): Promise<Course> => {
        const response = await apiClient.post<Course>('/courses', data);
        return response.data;
    },

    updateCourse: async (id: string, data: Partial<CourseInput>): Promise<Course> => {
        const response = await apiClient.put<Course>(`/courses/${id}`, data);
        return response.data;
    },

    deleteCourse: async (id: string): Promise<void> => {
        await apiClient.delete(`/courses/${id}`);
    },

    // GPA Calculation
    getCalculatedGPA: async (): Promise<GPACalculation> => {
        const response = await apiClient.get<GPACalculation>('/calculate');
        return response.data;
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
};

export default gpaService;
