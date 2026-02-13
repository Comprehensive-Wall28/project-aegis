import { useState, useEffect, useCallback, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { usePreferenceStore } from '@/stores/preferenceStore';
import gpaService from '@/services/gpaService';
import type { Course, CourseInput } from '@/services/gpaService';
import { useCourseEncryption } from '@/hooks/useCourseEncryption';

export const useGPAActions = (showSnackbar: (msg: string, severity: 'success' | 'error' | 'info' | 'warning') => void) => {
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);
    const setGPASystem = usePreferenceStore((state) => state.setGPASystem);

    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const hasFetched = useRef(false);
    const { encryptCourseData, decryptCourses } = useCourseEncryption();

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);

            const [encryptedCourses, prefs] = await Promise.all([
                gpaService.getEncryptedCourses(),
                gpaService.getPreferences(),
            ]);

            if (encryptedCourses.length > 0) {
                try {
                    const decryptedCourses = await decryptCourses(encryptedCourses);
                    setCourses(decryptedCourses as Course[]);
                } catch (decryptErr) {
                    console.error('Decryption failed:', decryptErr);
                    setCourses([]);
                }
            } else {
                setCourses([]);
            }

            setGPASystem(prefs.gpaSystem);
        } catch (error: unknown) {
            console.error('Failed to fetch GPA data:', error);
            // Network errors are handled by global BackendStatusProvider
            // Only set empty courses for other errors
            setCourses([]);
        } finally {
            setIsLoading(false);
        }
    }, [setGPASystem, decryptCourses]);

    useEffect(() => {
        if (pqcEngineStatus === 'operational' && !hasFetched.current) {
            hasFetched.current = true;
            fetchData();
        }
    }, [pqcEngineStatus, fetchData]);

    const handleAddCourse = async (courseData: CourseInput) => {
        if (pqcEngineStatus !== 'operational') {
            showSnackbar('PQC Engine must be operational to add courses', 'warning');
            return;
        }

        try {
            setIsSaving(true);
            const encryptedPayload = await encryptCourseData(courseData);
            const newEncryptedCourse = await gpaService.createEncryptedCourse(encryptedPayload);

            const decryptedCourse = {
                ...courseData,
                _id: newEncryptedCourse._id,
                createdAt: newEncryptedCourse.createdAt,
                updatedAt: newEncryptedCourse.updatedAt,
            };

            setCourses((prev) => [decryptedCourse, ...prev]);
            showSnackbar('Course added securely with PQC encryption', 'success');
        } catch (error) {
            console.error('Failed to add course:', error);
            showSnackbar('Failed to add course', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        try {
            setIsSaving(true);
            await gpaService.deleteCourse(courseId);
            setCourses((prev) => prev.filter((c) => c._id !== courseId));
            showSnackbar('Course deleted successfully', 'success');
        } catch (error) {
            console.error('Failed to delete course:', error);
            showSnackbar('Failed to delete course', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return {
        courses,
        isLoading,
        isSaving,
        fetchData,
        handleAddCourse,
        handleDeleteCourse,
    };
};
