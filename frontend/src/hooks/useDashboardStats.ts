import { useState, useEffect, useCallback, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { usePreferenceStore } from '@/stores/preferenceStore';
import gpaService from '@/services/gpaService';
import { useCourseEncryption } from '@/hooks/useCourseEncryption';
import { calculateNormalGPA, calculateGermanGPA } from '@/lib/gpaUtils';

/**
 * Hook for fetching GPA-related dashboard stats.
 * Note: Merkle root is fetched by IntegrityMonitor widget.
 * Note: Recent activity is fetched by LiveActivityWidget.
 */
export const useDashboardStats = () => {
    const [currentGPA, setCurrentGPA] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const hasFetched = useRef(false);

    const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);
    const gpaSystem = usePreferenceStore((state) => state.gpaSystem);
    const { decryptCourses } = useCourseEncryption();

    const fetchGPAData = useCallback(async () => {
        try {
            setIsLoading(true);
            setHasError(false);

            const encryptedCourses = await gpaService.getEncryptedCourses();

            // Decrypt courses using the optimized batch worker path
            if (encryptedCourses.length > 0) {
                const decryptedCourses = await decryptCourses(encryptedCourses);
                const gpa = gpaSystem === 'GERMAN'
                    ? calculateGermanGPA(decryptedCourses)
                    : calculateNormalGPA(decryptedCourses);
                setCurrentGPA(gpa);
            } else {
                setCurrentGPA(0);
            }
        } catch (err) {
            console.error('GPA data fetch failed:', err);
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, [gpaSystem, decryptCourses]);

    useEffect(() => {
        if (isAuthenticated && pqcEngineStatus === 'operational' && !hasFetched.current) {
            hasFetched.current = true;
            fetchGPAData();
        }
    }, [isAuthenticated, pqcEngineStatus, fetchGPAData]);

    return {
        currentGPA,
        isLoading,
        hasError,
        refresh: fetchGPAData
    };
};

