import { RoomResponseDto } from './room-response.dto';
import { CollectionResponseDto } from './collection-response.dto';
import { LinkPostDocument } from '../schemas/link-post.schema';

export class RoomContentResponseDto {
  room: RoomResponseDto;
  collections: CollectionResponseDto[];
  links: any[]; // LinkPostDocument usually contains sensitive info, ideally we'd use a DTO here
  viewedLinkIds: string[];
  commentCounts: Record<string, number>;
  unviewedCounts: Record<string, number>;
}
