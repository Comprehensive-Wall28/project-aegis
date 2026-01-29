import mongoose from 'mongoose';
import LinkPost from '../../models/LinkPost';
import { ServiceError } from '../base/BaseService';

/**
 * Optimized helper to verify link access in a single query.
 * Jointly checks LinkPost, Collection, and Room membership.
 */
export async function verifyLinkAccess(linkId: string, userId: string) {
    const results = await LinkPost.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(linkId)
            }
        },
        {
            $lookup: {
                from: 'collections',
                localField: 'collectionId',
                foreignField: '_id',
                as: 'collection'
            }
        },
        { $unwind: '$collection' },
        {
            $lookup: {
                from: 'rooms',
                localField: 'collection.roomId',
                foreignField: '_id',
                as: 'room'
            }
        },
        { $unwind: '$room' },
        {
            $match: {
                'room.members.userId': new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $project: {
                _id: 1,
                collectionId: 1,
                userId: 1,
                url: 1,
                previewData: 1,
                createdAt: 1,
                'collection._id': 1,
                'collection.roomId': 1,
                'collection.name': 1,
                'collection.type': 1,
                'room._id': 1,
                'room.name': 1,
                'room.members': 1
            }
        }
    ]);

    if (!results || results.length === 0) {
        throw new ServiceError('Link not found or access denied', 404);
    }

    const result = results[0];
    return {
        link: result,
        collectionId: result.collectionId.toString(),
        roomId: result.collection.roomId.toString(),
        room: result.room
    };
}
