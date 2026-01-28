import { Request, Response } from 'express';
import { IntegrityService } from '../services';
import logger from '../utils/logger';
import { withAuth } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const integrityService = new IntegrityService();

/**
 * Updates or creates a GPA record and recalculates the Merkle Root for the user.
 */
export const updateGPA = withAuth(async (req: AuthRequest, res: Response) => {
    const { semester, gpa, recordHash } = req.body;
    const result = await integrityService.updateGPA(
        req.user!.id,
        semester,
        gpa,
        recordHash,
        req
    );

    res.status(200).json({
        message: 'GPA record updated and Merkle Root synchronized',
        merkleRoot: result.merkleRoot
    });
});

/**
 * Returns the Merkle Path (proof) for a specific GPA record.
 */
export const verifyGPA = withAuth(async (req: AuthRequest, res: Response) => {
    const semester = req.query.semester as string;
    const result = await integrityService.verifyGPA(req.user!.id, semester);

    res.status(200).json(result);
});

/**
 * Returns the current Merkle Root for the authenticated user.
 */
export const getMerkleRoot = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await integrityService.getMerkleRoot(req.user!.id);
    res.status(200).json(result);
});

/**
 * Returns all GPA logs for the authenticated user.
 */
export const getGPALogs = withAuth(async (req: AuthRequest, res: Response) => {
    const logs = await integrityService.getGPALogs(req.user!.id);
    res.status(200).json(logs);
});

/**
 * Verifies integrity and returns GPA summary for the authenticated user.
 */
export const verifyIntegrity = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await integrityService.verifyIntegrity(req.user!.id);
    res.status(200).json(result);
});
