import { Module, Global } from '@nestjs/common';
import { CryptoUtils } from './utils/crypto.utils';

@Global()
@Module({
  providers: [CryptoUtils],
  exports: [CryptoUtils],
})
export class CommonModule {}
