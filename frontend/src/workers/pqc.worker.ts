// @ts-ignore
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

/**
 * PQC Web Worker for heavy cryptographic operations.
 * This prevents blocking the main UI thread during ML-KEM-768 key generation.
 */

self.onmessage = async (event: MessageEvent) => {
    const { type, seed } = event.data;

    if (type === 'keygen') {
        try {
            // ML-KEM-768 keygen is the expensive part (~50-100ms)
            const { publicKey, secretKey } = seed ? ml_kem768.keygen(seed) : ml_kem768.keygen();

            // Send back the results as Uint8Arrays
            // We use transferables for zero-copy if possible, though these buffers are small
            self.postMessage({
                type: 'keygen_result',
                publicKey,
                secretKey
            }, [publicKey.buffer, secretKey.buffer] as any);
        } catch (error) {
            self.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
};

export { };
