import { useState, useCallback } from 'react';
import gpaService from '@/services/gpaService';
import { useCourseEncryption } from './useCourseEncryption';
import { useSessionStore } from '@/stores/sessionStore';

export interface MigrationProgress {
    total: number;
    migrated: number;
    failed: number;
    inProgress: boolean;
}

export interface MigrationResult {
    success: boolean;
    migrated: number;
    failed: number;
    errors: string[];
}

export const useCourseMigration = () => {
    const [progress, setProgress] = useState<MigrationProgress>({
        total: 0,
        migrated: 0,
        failed: 0,
        inProgress: false,
    });
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);
    const { encryptCourseData } = useCourseEncryption();

    /**
     * Check if there are unmigrated courses that need encryption.
     */
    const checkMigrationNeeded = useCallback(async (): Promise<number> => {
        try {
            const unmigrated = await gpaService.getUnmigratedCourses();
            return unmigrated.length;
        } catch (error) {
            console.error('Failed to check migration status:', error);
            return 0;
        }
    }, []);

    /**
     * Migrate all unmigrated courses to encrypted format.
     * Returns a result object with migration statistics.
     */
    const migrateAllCourses = useCallback(async (): Promise<MigrationResult> => {
        if (pqcEngineStatus !== 'operational') {
            return {
                success: false,
                migrated: 0,
                failed: 0,
                errors: ['PQC Engine must be operational to migrate data'],
            };
        }

        const errors: string[] = [];
        let migrated = 0;
        let failed = 0;

        try {
            // Fetch all unmigrated courses
            const unmigratedCourses = await gpaService.getUnmigratedCourses();

            if (unmigratedCourses.length === 0) {
                return { success: true, migrated: 0, failed: 0, errors: [] };
            }

            setProgress({
                total: unmigratedCourses.length,
                migrated: 0,
                failed: 0,
                inProgress: true,
            });

            // Migrate each course one by one
            for (const course of unmigratedCourses) {
                try {
                    // Encrypt the plaintext course data
                    const encryptedPayload = await encryptCourseData({
                        name: course.name,
                        grade: course.grade,
                        credits: course.credits,
                        semester: course.semester,
                    });

                    // Send encrypted data to backend to update the course
                    await gpaService.migrateCourse(course._id, encryptedPayload);

                    migrated++;
                    setProgress((prev) => ({
                        ...prev,
                        migrated: prev.migrated + 1,
                    }));
                } catch (err: any) {
                    failed++;
                    errors.push(`Failed to migrate "${course.name}": ${err.message}`);
                    setProgress((prev) => ({
                        ...prev,
                        failed: prev.failed + 1,
                    }));
                }
            }

            setProgress((prev) => ({ ...prev, inProgress: false }));

            return {
                success: failed === 0,
                migrated,
                failed,
                errors,
            };
        } catch (error: any) {
            setProgress((prev) => ({ ...prev, inProgress: false }));
            return {
                success: false,
                migrated,
                failed,
                errors: [`Migration failed: ${error.message}`],
            };
        }
    }, [pqcEngineStatus, encryptCourseData]);

    return {
        progress,
        checkMigrationNeeded,
        migrateAllCourses,
    };
};
