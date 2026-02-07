import { Types } from 'mongoose';

export class FolderResponseDto {
  _id: string | Types.ObjectId;
  ownerId: string | Types.ObjectId;
  name: string;
  parentId?: string | Types.ObjectId | null;
  encryptedSessionKey: string;
  isShared: boolean;
  color?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  path?: any[];
}
