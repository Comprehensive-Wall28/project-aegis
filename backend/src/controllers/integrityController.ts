import { Request, Response } from 'express';
import GPALog from '../models/GPALog';
import MerkleRegistry from '../models/MerkleRegistry';
import { calculateMerkleRoot, generateMerkleProof } from '../utils/merkle.utils';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

/**
 * Updates or creates a GPA record and recalculates the Merkle Root for the user.
 */
export const updateGPA = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { semester, gpa, recordHash } = req.body;
        const userId = req.user.id;

        if (!semester || gpa === undefined || !recordHash) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // 1. Update or create GPALog
        await GPALog.findOneAndUpdate(
            { userId: { $eq: userId }, semester: { $eq: semester } },
            { gpa, recordHash },
            { upsert: true, new: true }
        );

        // 2. Fetch all GPA logs for the user to rebuild the Merkle Tree
        const allLogs = await GPALog.find({ userId: { $eq: userId } }).sort({ semester: 1 });
        const hashes = allLogs.map(log => log.recordHash);

        // 3. Recalculate Merkle Root
        const newRoot = calculateMerkleRoot(hashes);

        // 4. Update MerkleRegistry
        await MerkleRegistry.findOneAndUpdate(
            { userId: { $eq: userId } },
            { merkleRoot: newRoot },
            { upsert: true, new: true }
        );

        logger.info(`Updated GPA integrity for user ${userId}. New root: ${newRoot}`);

        res.status(200).json({
            message: 'GPA record updated and Merkle Root synchronized',
            merkleRoot: newRoot
        });

    } catch (error) {
        console.error('Error updating GPA integrity:', error);
        res.status(500).json({ message: 'Server error' });
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

        const { semester } = req.query;
        const userId = req.user.id;

        if (!semester) {
            return res.status(400).json({ message: 'Missing semester' });
        }

        // 1. Fetch all GPA logs for the user to rebuild the tree
        const allLogs = await GPALog.find({ userId: { $eq: userId } }).sort({ semester: 1 });
        const hashes = allLogs.map(log => log.recordHash);

        // 2. Find the specific record
        const targetLog = allLogs.find(log => log.semester === semester);
        if (!targetLog) {
            return res.status(404).json({ message: 'GPA record not found for this semester' });
        }

        // 3. Generate Merkle Proof
        const proof = generateMerkleProof(hashes, targetLog.recordHash);

        // 4. Fetch current root from registry
        const registry = await MerkleRegistry.findOne({ userId: { $eq: userId } });

        res.status(200).json({
            semester: targetLog.semester,
            gpa: targetLog.gpa,
            recordHash: targetLog.recordHash,
            proof: proof,
            merkleRoot: registry?.merkleRoot || ''
        });

    } catch (error) {
        console.error('Error verifying GPA integrity:', error);
        res.status(500).json({ message: 'Server error' });
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

        const registry = await MerkleRegistry.findOne({ userId: req.user.id });

        if (!registry) {
            // Return a placeholder if no registry exists yet
            return res.status(200).json({
                merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
                lastUpdated: new Date().toISOString()
            });
        }

        res.status(200).json({
            merkleRoot: registry.merkleRoot,
            lastUpdated: (registry as any).updatedAt || new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching Merkle root:', error);
        res.status(500).json({ message: 'Server error' });
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

        const logs = await GPALog.find({ userId: req.user.id }).sort({ semester: 1 });

        res.status(200).json(logs);

    } catch (error) {
        console.error('Error fetching GPA logs:', error);
        res.status(500).json({ message: 'Server error' });
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

        // Fetch all GPA logs for the user
        const logs = await GPALog.find({ userId: req.user.id }).sort({ semester: 1 });

        // Calculate current GPA (average of all semesters)
        let currentGPA = 0;
        if (logs.length > 0) {
            const totalGPA = logs.reduce((sum, log) => sum + log.gpa, 0);
            currentGPA = totalGPA / logs.length;
        }

        // Fetch the Merkle root
        const registry = await MerkleRegistry.findOne({ userId: req.user.id });

        res.status(200).json({
            currentGPA: currentGPA,
            merkleRoot: registry?.merkleRoot || '0x0000000000000000000000000000000000000000000000000000000000000000',
            logs: logs
        });

    } catch (error) {
        console.error('Error verifying integrity:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

