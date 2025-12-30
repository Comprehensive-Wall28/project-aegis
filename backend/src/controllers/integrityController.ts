import { Request, Response } from 'express';
import GPALog from '../models/GPALog';
import MerkleRegistry from '../models/MerkleRegistry';
import { calculateMerkleRoot, generateMerkleProof } from '../utils/merkle.utils';
import logger from '../utils/logger';

/**
 * Updates or creates a GPA record and recalculates the Merkle Root for the user.
 */
export const updateGPA = async (req: Request, res: Response) => {
    try {
        const { userId, semester, gpa, recordHash } = req.body;

        if (!userId || !semester || gpa === undefined || !recordHash) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // 1. Update or create GPALog
        await GPALog.findOneAndUpdate(
            { userId, semester },
            { gpa, recordHash },
            { upsert: true, new: true }
        );

        // 2. Fetch all GPA logs for the user to rebuild the Merkle Tree
        const allLogs = await GPALog.find({ userId }).sort({ semester: 1 });
        const hashes = allLogs.map(log => log.recordHash);

        // 3. Recalculate Merkle Root
        const newRoot = calculateMerkleRoot(hashes);

        // 4. Update MerkleRegistry
        await MerkleRegistry.findOneAndUpdate(
            { userId },
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
export const verifyGPA = async (req: Request, res: Response) => {
    try {
        const { userId, semester } = req.query;

        if (!userId || !semester) {
            return res.status(400).json({ message: 'Missing userId or semester' });
        }

        // 1. Fetch all GPA logs for the user to rebuild the tree
        const allLogs = await GPALog.find({ userId }).sort({ semester: 1 });
        const hashes = allLogs.map(log => log.recordHash);

        // 2. Find the specific record
        const targetLog = allLogs.find(log => log.semester === semester);
        if (!targetLog) {
            return res.status(404).json({ message: 'GPA record not found for this semester' });
        }

        // 3. Generate Merkle Proof
        const proof = generateMerkleProof(hashes, targetLog.recordHash);

        // 4. Fetch current root from registry
        const registry = await MerkleRegistry.findOne({ userId });

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
