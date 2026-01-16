import { Request, Response } from 'express';
import { IntegrityService, ServiceError } from '../services';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const integrityService = new IntegrityService();

/**
 * Updates or creates a GPA record and recalculates the Merkle Root for the user.
 */
export const updateGPA = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { semester, gpa, recordHash } = req.body;
        const result = await integrityService.updateGPA(
            req.user.id,
            semester,
            gpa,
            recordHash,
            req
        );

        res.status(200).json({
            message: 'GPA record updated and Merkle Root synchronized',
            merkleRoot: result.merkleRoot
        });
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Returns the Merkle Path (proof) for a specific GPA record.
 */
export const verifyGPA = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const semester = req.query.semester as string;
        const result = await integrityService.verifyGPA(req.user.id, semester);

        res.status(200).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Returns the current Merkle Root for the authenticated user.
 */
export const getMerkleRoot = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const result = await integrityService.getMerkleRoot(req.user.id);
        res.status(200).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Returns all GPA logs for the authenticated user.
 */
export const getGPALogs = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const logs = await integrityService.getGPALogs(req.user.id);
        res.status(200).json(logs);
    } catch (error) {
        handleError(error, res);
    }
};

/**
 * Verifies integrity and returns GPA summary for the authenticated user.
 */
export const verifyIntegrity = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const result = await integrityService.verifyIntegrity(req.user.id);
        res.status(200).json(result);
    } catch (error) {
        handleError(error, res);
    }
};

function handleError(error: unknown, res: Response): void {
    if (error instanceof ServiceError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }
    logger.error('Controller error:', error);
    res.status(500).json({ message: 'Server error' });
}
