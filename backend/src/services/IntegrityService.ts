import { Request } from 'express';
import { BaseService, ServiceError } from './base/BaseService';
import { GPALogRepository } from '../repositories/GPALogRepository';
import { MerkleRegistryRepository } from '../repositories/MerkleRegistryRepository';
import { calculateMerkleRoot, generateMerkleProof } from '../utils/merkle.utils';
import { IGPALog } from '../models/GPALog';
import logger from '../utils/logger';

/**
 * IntegrityService handles GPA integrity and Merkle tree operations
 */
export class IntegrityService extends BaseService<IGPALog, GPALogRepository> {
    private merkleRepo: MerkleRegistryRepository;

    constructor() {
        super(new GPALogRepository());
        this.merkleRepo = new MerkleRegistryRepository();
    }

    /**
     * Update GPA record and recalculate Merkle root
     */
    async updateGPA(
        userId: string,
        semester: string,
        gpa: number,
        recordHash: string,
        req: Request
    ): Promise<{ merkleRoot: string }> {
        try {
            if (!semester || gpa === undefined || !recordHash) {
                throw new ServiceError('Missing required fields', 400);
            }

            // 1. Update or create GPALog
            await this.repository.upsertLog(userId, semester, gpa, recordHash);

            // 2. Fetch all GPA logs for the user to rebuild the Merkle Tree
            const allLogs = await this.repository.findByUser(userId);
            const hashes = allLogs.map(log => log.recordHash);

            // 3. Recalculate Merkle Root
            const newRoot = calculateMerkleRoot(hashes);

            // 4. Update MerkleRegistry
            await this.merkleRepo.upsertRoot(userId, newRoot);

            logger.info(`Updated GPA integrity for user ${userId}. New root: ${newRoot}`);

            return { merkleRoot: newRoot };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Update GPA integrity error:', error);
            throw new ServiceError('Failed to update GPA integrity', 500);
        }
    }

    /**
     * Generate Merkle proof for a specific GPA record
     */
    async verifyGPA(
        userId: string,
        semester: string
    ): Promise<{
        semester: string;
        gpa: number;
        recordHash: string;
        proof: any[];
        merkleRoot: string;
    }> {
        try {
            if (!semester) {
                throw new ServiceError('Missing semester', 400);
            }

            // 1. Fetch all GPA logs for the user to rebuild the tree
            const allLogs = await this.repository.findByUser(userId);
            const hashes = allLogs.map(log => log.recordHash);

            // 2. Find the specific record
            const targetLog = allLogs.find(log => log.semester === semester);
            if (!targetLog) {
                throw new ServiceError('GPA record not found for this semester', 404);
            }

            // 3. Generate Merkle Proof
            const proof = generateMerkleProof(hashes, targetLog.recordHash);

            // 4. Fetch current root from registry
            const registry = await this.merkleRepo.findByUser(userId);

            return {
                semester: targetLog.semester,
                gpa: targetLog.gpa,
                recordHash: targetLog.recordHash,
                proof: proof,
                merkleRoot: registry?.merkleRoot || ''
            };
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Verify GPA integrity error:', error);
            throw new ServiceError('Failed to verify GPA integrity', 500);
        }
    }

    /**
     * Get current Merkle root
     */
    async getMerkleRoot(userId: string): Promise<{ merkleRoot: string; lastUpdated: string }> {
        try {
            const registry = await this.merkleRepo.findByUser(userId);

            if (!registry) {
                return {
                    merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    lastUpdated: new Date().toISOString()
                };
            }

            return {
                merkleRoot: registry.merkleRoot,
                lastUpdated: (registry as any).updatedAt ? (registry as any).updatedAt.toISOString() : new Date().toISOString()
            };
        } catch (error) {
            logger.error('Get Merkle root error:', error);
            throw new ServiceError('Failed to fetch Merkle root', 500);
        }
    }

    /**
     * Get all GPA logs for user
     */
    async getGPALogs(userId: string): Promise<IGPALog[]> {
        try {
            return await this.repository.findByUser(userId);
        } catch (error) {
            logger.error('Get GPA logs error:', error);
            throw new ServiceError('Failed to fetch GPA logs', 500);
        }
    }

    /**
     * Verify integrity summary
     */
    async verifyIntegrity(userId: string): Promise<{
        currentGPA: number;
        merkleRoot: string;
        logs: IGPALog[];
    }> {
        try {
            // Fetch all GPA logs for the user
            const logs = await this.repository.findByUser(userId);

            // Calculate current GPA (average)
            let currentGPA = 0;
            if (logs.length > 0) {
                const totalGPA = logs.reduce((sum, log) => sum + log.gpa, 0);
                currentGPA = totalGPA / logs.length;
            }

            // Fetch the Merkle root
            const registry = await this.merkleRepo.findByUser(userId);

            return {
                currentGPA,
                merkleRoot: registry?.merkleRoot || '0x0000000000000000000000000000000000000000000000000000000000000000',
                logs
            };
        } catch (error) {
            logger.error('Verify integrity error:', error);
            throw new ServiceError('Failed to verify integrity', 500);
        }
    }
}
