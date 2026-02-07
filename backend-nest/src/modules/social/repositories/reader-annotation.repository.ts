import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import {
  ReaderAnnotation,
  ReaderAnnotationDocument,
} from '../schemas/reader-annotation.schema';
import { SafeFilter } from '../../../common/repositories/types';

@Injectable()
export class ReaderAnnotationRepository extends BaseRepository<ReaderAnnotationDocument> {
  constructor(
    @InjectModel(ReaderAnnotation.name, 'primary')
    readonly readerAnnotationModel: Model<ReaderAnnotationDocument>,
  ) {
    super(readerAnnotationModel);
  }

  async deleteByRoom(roomId: string): Promise<number> {
    const validatedId = this.validateId(roomId);
    return this.deleteMany({
      roomId: { $eq: validatedId },
    } as unknown as SafeFilter<ReaderAnnotationDocument>);
  }

  async findByLinkId(linkId: string): Promise<ReaderAnnotationDocument[]> {
    const validatedId = this.validateId(linkId);
    return this.findMany(
      {
        linkId: { $eq: validatedId },
      } as unknown as SafeFilter<ReaderAnnotationDocument>,
      {
        sort: { createdAt: 1 },
      },
    );
  }

  async countByParagraphForLink(
    linkId: string,
  ): Promise<Record<string, number>> {
    const validatedId = this.validateId(linkId);
    const annotations = await this.findMany({
      linkId: { $eq: validatedId },
    } as unknown as SafeFilter<ReaderAnnotationDocument>);

    const counts: Record<string, number> = {};
    annotations.forEach((annotation) => {
      const paragraphId = annotation.paragraphId;
      counts[paragraphId] = (counts[paragraphId] || 0) + 1;
    });

    return counts;
  }

  async createAnnotation(data: {
    linkId: string;
    roomId: string;
    userId: string;
    paragraphId: string;
    highlightText: string;
    encryptedContent: string;
  }): Promise<ReaderAnnotationDocument> {
    return this.create({
      linkId: new Types.ObjectId(data.linkId),
      roomId: new Types.ObjectId(data.roomId),
      userId: new Types.ObjectId(data.userId),
      paragraphId: data.paragraphId,
      highlightText: data.highlightText,
      encryptedContent: data.encryptedContent,
    } as any);
  }
}
