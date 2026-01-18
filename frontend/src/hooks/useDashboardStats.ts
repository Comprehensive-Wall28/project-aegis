import { useState, useEffect, useCallback, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { usePreferenceStore } from '@/stores/preferenceStore';
import gpaService from '@/services/gpaService';
import integrityService from '@/services/integrityService';
import { useCourseEncryption } from '@/hooks/useCourseEncryption';
import { calculateNormalGPA, calculateGermanGPA } from '@/lib/gpaUtils';

export const useDashboardStats = () => {
    const [currentGPA, setCurrentGPA] = useState<number | null>(null);
    const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const hasFetched = useRef(false);

    const { isAuthenticated, fetchRecentActivity } = useSessionStore();
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);
    const gpaSystem = usePreferenceStore((state) => state.gpaSystem);
    const { decryptCourses } = useCourseEncryption();

    const fetchAllData = useCallback(async () => {
        try {
            setIsLoading(true);
            setHasError(false);

            // Parallelize all network requests
            const [encryptedCourses, rootData] = await Promise.all([
                gpaService.getEncryptedCourses(),
                integrityService.getMerkleRoot(),
                fetchRecentActivity() // Returns a promise
            ]);

            setMerkleRoot(rootData.merkleRoot);

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
            console.error('Dashboard data fetch failed:', err);
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, [gpaSystem, decryptCourses, fetchRecentActivity]);

    useEffect(() => {
        if (isAuthenticated && pqcEngineStatus === 'operational' && !hasFetched.current) {
            hasFetched.current = true;
            fetchAllData();
        }
    }, [isAuthenticated, pqcEngineStatus, fetchAllData]);

    return {
        currentGPA,
        merkleRoot,
        isLoading,
        hasError,
        refresh: fetchAllData
    };
};
