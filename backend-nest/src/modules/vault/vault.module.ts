import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GridFsService } from './gridfs.service';

@Global()
@Module({
    imports: [MongooseModule],
    providers: [GridFsService],
    exports: [GridFsService],
})
export class VaultModule { }
