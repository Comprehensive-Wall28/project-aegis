import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Folder, FolderDocument } from './schemas/folder.schema';

@Injectable()
export class FolderRepository extends BaseRepository<FolderDocument> {
  constructor(@InjectModel(Folder.name) model: Model<FolderDocument>) {
    super(model);
  }
}
