import { Module, Global } from '@nestjs/common';
import { QuerySanitizer } from './database/query-sanitizer';

@Global()
@Module({
    providers: [QuerySanitizer],
    exports: [QuerySanitizer],
})
export class CommonModule { }
