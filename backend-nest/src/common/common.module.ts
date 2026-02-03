import { Module, Global } from '@nestjs/common';
import { QuerySanitizer } from './database/query-sanitizer';
import { CryptoService } from './services/crypto.service';

@Global()
@Module({
    providers: [QuerySanitizer, CryptoService],
    exports: [QuerySanitizer, CryptoService],
})
export class CommonModule { }
