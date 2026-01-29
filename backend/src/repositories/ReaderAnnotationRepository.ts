import { BaseRepository } from './base/BaseRepository';
import { ReaderAnnotation, IReaderAnnotation } from '../models/ReaderAnnotation';
import { SafeFilter } from './base/types';
import mongoose from 'mongoose';

/**
 * ReaderAnnotationRepository handles ReaderAnnotation database operations
 * for paragraph-level annotations in reader mode
 */
export class ReaderAnnotationRepository extends BaseRepository<IReaderAnnotation> {
    constructor() {
        super(ReaderAnnotation);
    }

    /**
     * Find all annotations for a link with user population
     */
    async findByLinkId(linkId: string): Promise<IReaderAnnotation[]> {
        return this.findMany(
            { linkId: { $eq: linkId as any } } as SafeFilter<IReaderAnnotation>,
            {
                sort: { createdAt: 1 }, // Oldest first for display order
                populate: { path: 'userId', select: 'username' }
            }
        );
    }

    /**
     * Find annotations by link ID with room membership verification
     */
    async findByLinkAndRoom(linkId: string, roomId: string): Promise<IReaderAnnotation[]> {
        return this.findMany(
            {
                linkId: { $eq: linkId as any },
                roomId: { $eq: roomId as any }
            } as SafeFilter<IReaderAnnotation>,
            {
                sort: { createdAt: 1 },
                populate: { path: 'userId', select: 'username' }
            }
        );
    }

    /**
     * Count annotations by paragraph for a link
     */
    async countByParagraphForLink(linkId: string): Promise<Record<string, number>> {
        const objectId = new mongoose.Types.ObjectId(linkId);

        const results = await this.aggregate<{ _id: string; count: number }>([
            { $match: { linkId: objectId } },
            { $group: { _id: '$paragraphId', count: { $sum: 1 } } }
        ]);

        const countMap: Record<string, number> = {};
        results.forEach(r => {
            countMap[r._id] = r.count;
        });
        return countMap;
    }

    /**
     * Create a new annotation with user populated
     */
    async createAnnotation(data: {
        linkId: string;
        roomId: string;
        userId: string;
        paragraphId: string;
        highlightText: string;
        encryptedContent: string;
    }): Promise<IReaderAnnotation> {
        const annotation = await this.create({
            linkId: data.linkId as any,
            roomId: data.roomId as any,
            userId: data.userId as any,
            paragraphId: data.paragraphId,
            highlightText: data.highlightText,
            encryptedContent: data.encryptedContent
        });
        await annotation.populate('userId', 'username');
        return annotation;
    }

    /**
     * Delete annotation by ID if owned by user
     */
    async deleteByIdAndUser(annotationId: string, userId: string): Promise<boolean> {
        const annotation = await this.findById(annotationId);
        if (!annotation) return false;

        if (annotation.userId.toString() === userId) {
            return this.deleteById(annotationId);
        }
        return false;
    }

    /**
     * Delete all annotations for a link (when link is deleted)
     */
    async deleteByLinkId(linkId: string): Promise<number> {
        return this.deleteMany({
            linkId: { $eq: linkId as any }
        } as SafeFilter<IReaderAnnotation>);
    }

    /**
     * Delete all annotations for a room
     */
    async deleteByRoom(roomId: string): Promise<number> {
        return this.deleteMany({
            roomId: { $eq: roomId as any }
        } as SafeFilter<IReaderAnnotation>);
    }
}
