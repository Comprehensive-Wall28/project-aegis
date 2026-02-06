import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LinkPostDocument = LinkPost & Document;

@Schema({ timestamps: true })
export class LinkPost {
    @Prop({ type: Types.ObjectId, ref: 'Collection', required: true })
    collectionId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    url: string;

    @Prop({
        type: {
            title: { type: String, default: '' },
            description: { type: String, default: '' },
            image: { type: String, default: '' },
            favicon: { type: String, default: '' },
            scrapeStatus: { type: String, enum: ['success', 'blocked', 'failed', 'scraping', ''], default: '' }
        },
        default: {}
    })
    previewData: {
        title: string;
        description: string;
        image: string;
        favicon: string;
        scrapeStatus: string;
    };
}

export const LinkPostSchema = SchemaFactory.createForClass(LinkPost);
LinkPostSchema.index({ collectionId: 1, createdAt: -1 });
