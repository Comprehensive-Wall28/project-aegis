export class CollectionResponseDto {
  _id: string;
  roomId: string;
  name: string;
  order: number;
  type: 'links' | 'discussion';
  createdAt: Date;
  updatedAt: Date;
}
