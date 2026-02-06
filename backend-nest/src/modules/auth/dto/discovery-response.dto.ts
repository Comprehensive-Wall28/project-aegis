import { Expose } from 'class-transformer';

export class DiscoveryResponseDto {
    @Expose()
    username: string;

    @Expose()
    pqcPublicKey: string;
}
