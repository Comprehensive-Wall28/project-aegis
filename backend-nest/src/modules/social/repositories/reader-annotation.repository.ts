import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReaderAnnotation } from '../schemas/reader-annotation.schema';

@Injectable()
export class ReaderAnnotationRepository {
  private readonly logger = new Logger(ReaderAnnotationRepository.name);

  constructor(
    @InjectModel(ReaderAnnotation.name)
    private readonly annotationModel: Model<ReaderAnnotation>,
  ) {}

  async create(data: {
    linkId: string;
    roomId: string;
    userId: string;
    paragraphId: string;
    highlightText: string;
    encryptedContent: string;
  }): Promise<ReaderAnnotation> {
    const annotation = new this.annotationModel({
      ...data,
      linkId: new Types.ObjectId(data.linkId),
      roomId: new Types.ObjectId(data.roomId),
      userId: new Types.ObjectId(data.userId),
    });
    return annotation.save();
  }

  async findByLinkId(linkId: string): Promise<ReaderAnnotation[]> {
    return this.annotationModel
      .find({ linkId: new Types.ObjectId(linkId) })
      .sort({ createdAt: 1 })
      .exec();
  }

  async countByParagraphForLink(
    linkId: string,
  ): Promise<Record<string, number>> {
    const results = await this.annotationModel.aggregate([
      { $match: { linkId: new Types.ObjectId(linkId) } },
      { $group: { _id: '$paragraphId', count: { $sum: 1 } } },
    ]);

    const counts: Record<string, number> = {};
    results.forEach((r) => {
      counts[r._id] = r.count;
    });
    return counts;
  }

  async findById(id: string): Promise<ReaderAnnotation | null> {
    return this.annotationModel.findById(id).exec();
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.annotationModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
