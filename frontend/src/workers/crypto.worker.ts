/// <reference lib="webworker" />
// @ts-ignore
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { bytesToHex, hexToBytes } from '../lib/cryptoUtils';

type CryptoMessage =
    | { type: 'ENCRYPT_NOTE'; payload: { content: any; title?: string; publicKey: string } }
    | { type: 'DECRYPT_NOTE'; payload: { encryptedContent: string; encapsulatedKey: string; encryptedSymmetricKey: string; privateKey: string } }
    | { type: 'GENERATE_HASH'; payload: { content: any; tags: string[]; title?: string } };

self.onmessage = async (e: MessageEvent<CryptoMessage>) => {
    const { type, payload } = e.data;

    try {
        if (type === 'ENCRYPT_NOTE') {
            const { content, title, publicKey } = payload;

            // 1. Generate AES-256-GCM key
            const aesKey = await self.crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // 2. Encapsulate with ML-KEM-768
            const pubKeyBytes = hexToBytes(publicKey);
            const { cipherText: encapsulatedKeyBytes, sharedSecret } = ml_kem768.encapsulate(pubKeyBytes);

            // 3. Create wrapping key and wrap AES key
            const wrappingKey = await self.crypto.subtle.importKey(
                'raw',
                sharedSecret.buffer.slice(
                    sharedSecret.byteOffset,
                    sharedSecret.byteOffset + sharedSecret.byteLength
                ) as ArrayBuffer,
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            );

            const ivKey = self.crypto.getRandomValues(new Uint8Array(12));
            const rawKey = await self.crypto.subtle.exportKey('raw', aesKey);
            const encryptedKeyBuffer = await self.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: ivKey },
                wrappingKey,
                rawKey
            );
            const encryptedSymmetricKey = bytesToHex(ivKey) + bytesToHex(new Uint8Array(encryptedKeyBuffer));

            // 4. Encrypt content
            const contentJson = JSON.stringify(content);
            const contentBytes = new TextEncoder().encode(contentJson);
            const ivContent = self.crypto.getRandomValues(new Uint8Array(12));
            const encryptedContentBuffer = await self.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: ivContent },
                aesKey,
                contentBytes
            );

            const combinedContent = new Uint8Array(ivContent.length + encryptedContentBuffer.byteLength);
            combinedContent.set(ivContent);
            combinedContent.set(new Uint8Array(encryptedContentBuffer), ivContent.length);

            // 5. Encrypt title if provided
            let encryptedTitle: string | undefined;
            if (title !== undefined) {
                const titleBytes = new TextEncoder().encode(title);
                const ivTitle = self.crypto.getRandomValues(new Uint8Array(12));
                const encryptedTitleBuffer = await self.crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv: ivTitle },
                    aesKey,
                    titleBytes
                );

                const combinedTitle = new Uint8Array(ivTitle.length + encryptedTitleBuffer.byteLength);
                combinedTitle.set(ivTitle);
                combinedTitle.set(new Uint8Array(encryptedTitleBuffer), ivTitle.length);
                encryptedTitle = btoa(String.fromCharCode(...combinedTitle));
            }

            self.postMessage({
                type: 'ENCRYPT_SUCCESS',
                payload: {
                    encryptedContent: btoa(String.fromCharCode(...combinedContent)),
                    encryptedTitle,
                    encapsulatedKey: bytesToHex(encapsulatedKeyBytes),
                    encryptedSymmetricKey
                }
            });

        } else if (type === 'DECRYPT_NOTE') {
            const { encryptedContent, encapsulatedKey, encryptedSymmetricKey, privateKey } = payload;

            // 1. Decapsulate to get shared secret
            const privKeyBytes = hexToBytes(privateKey);
            const encapsulatedKeyBytes = hexToBytes(encapsulatedKey);
            const sharedSecret = ml_kem768.decapsulate(encapsulatedKeyBytes, privKeyBytes);

            // 2. Unwrap the AES key
            const ivKeyHex = encryptedSymmetricKey.slice(0, 24);
            const cipherKeyHex = encryptedSymmetricKey.slice(24);
            const ivKey = hexToBytes(ivKeyHex);
            const cipherKey = hexToBytes(cipherKeyHex);

            const unwrappingKey = await self.crypto.subtle.importKey(
                'raw',
                sharedSecret.buffer.slice(
                    sharedSecret.byteOffset,
                    sharedSecret.byteOffset + sharedSecret.byteLength
                ) as ArrayBuffer,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            const rawAesKey = await self.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivKey as unknown as BufferSource },
                unwrappingKey,
                cipherKey as unknown as BufferSource
            );

            const aesKey = await self.crypto.subtle.importKey(
                'raw',
                rawAesKey,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            // 3. Decrypt content
            const binaryString = atob(encryptedContent);
            const combined = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                combined[i] = binaryString.charCodeAt(i);
            }

            const ivContent = combined.slice(0, 12);
            const cipherContent = combined.slice(12);

            const decryptedBuffer = await self.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivContent },
                aesKey,
                cipherContent
            );

            const contentJson = new TextDecoder().decode(decryptedBuffer);
            self.postMessage({
                type: 'DECRYPT_SUCCESS',
                payload: { content: JSON.parse(contentJson) }
            });

        } else if (type === 'GENERATE_HASH') {
            const { content, tags, title } = payload;
            const hashContent = `${JSON.stringify(content)}|${tags.sort().join(',')}|${title || ''}`;
            const msgUint8 = new TextEncoder().encode(hashContent);
            const hashBuffer = await self.crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            self.postMessage({
                type: 'HASH_SUCCESS',
                payload: { hash: hashHex }
            });
        }
    } catch (err: any) {
        self.postMessage({
            type: 'ERROR',
            payload: { message: err.message || 'Crypto worker error' }
        });
    }
};
