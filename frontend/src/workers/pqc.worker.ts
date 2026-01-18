// @ts-ignore
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

/**
 * PQC Web Worker for heavy cryptographic operations.
 * This prevents blocking the main UI thread during ML-KEM-768 key generation.
 */

self.onmessage = async (event: MessageEvent) => {
    const { type, password, email, seed, id } = event.data;

    try {
        if (type === 'derive_pqc_seed') {
            const encoder = new TextEncoder();
            const salt = email ? `${email}aegis-pqc-salt-v2` : "aegis-pqc-salt-v1";
            const data = encoder.encode(password + salt);
            const hashBuffer = await self.crypto.subtle.digest('SHA-512', data);
            const seedArray = new Uint8Array(hashBuffer);

            self.postMessage({
                type: 'derive_pqc_seed_result',
                seed: seedArray,
                id
            }, [seedArray.buffer] as any);
        }
        else if (type === 'get_discovery_key') {
            const encoder = new TextEncoder();
            const salt = email ? `${email}aegis-pqc-salt-v2` : "aegis-pqc-salt-v1";
            const data = encoder.encode(password + salt);
            const hashBuffer = await self.crypto.subtle.digest('SHA-512', data);
            const seedArray = new Uint8Array(hashBuffer);

            const { publicKey } = ml_kem768.keygen(seedArray);

            // Convert to hex
            const hex = Array.from(publicKey)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            self.postMessage({
                type: 'get_discovery_key_result',
                publicKey: hex,
                id
            });
        }
        else if (type === 'keygen') {
            // ML-KEM-768 keygen is the expensive part (~50-100ms)
            const { publicKey, secretKey } = seed ? ml_kem768.keygen(seed) : ml_kem768.keygen();

            // Send back the results as Uint8Arrays
            self.postMessage({
                type: 'keygen_result',
                publicKey,
                secretKey,
                id
            }, [publicKey.buffer, secretKey.buffer] as any);
        }
        else if (type === 'encapsulate') {
            const { publicKey } = event.data;
            const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey);

            self.postMessage({
                type: 'encapsulate_result',
                cipherText,
                sharedSecret,
                id
            }, [cipherText.buffer, sharedSecret.buffer] as any);
        } else if (type === 'decapsulate') {
            const { cipherText, privateKey } = event.data;
            const sharedSecret = ml_kem768.decapsulate(cipherText, privateKey);

            self.postMessage({
                type: 'decapsulate_result',
                sharedSecret,
                id
            }, [sharedSecret.buffer] as any);
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error instanceof Error ? error.message : String(error),
            id
        });
    }
};

export { };
