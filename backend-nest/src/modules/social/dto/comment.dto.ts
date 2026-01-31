import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCommentDto {
    @IsString()
    @IsNotEmpty()
    content!: string;
}

export class CommentResponseDto {
    _id!: string;
    linkId!: string;
    userId!: string;
    username?: string;
    content!: string;
    createdAt!: Date;
    updatedAt!: Date;
}
