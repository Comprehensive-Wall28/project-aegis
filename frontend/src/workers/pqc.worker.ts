import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
// @ts-ignore
import argon2 from 'argon2-browser/dist/argon2-bundled.min.js';

/**
 * PQC Web Worker for heavy cryptographic operations.
 * This prevents blocking the main UI thread during ML-KEM-768 key generation.
 */

const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
};

async function calculateMerkleRootInternal(hashes: string[]): Promise<string> {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    const newLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left;
        newLevel.push(await simpleHash(left + right));
    }
    return calculateMerkleRootInternal(newLevel);
}

async function simpleHash(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await self.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

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
        else if (type === 'hash_argon2') {
            const { password, salt } = event.data;
            try {
                const result = await argon2.hash({
                    pass: password,
                    salt: salt,
                    time: 2, // iterations
                    mem: 65536, // 64MB
                    hashLen: 32,
                    parallelism: 1,
                    type: argon2.ArgonType.Argon2id
                });

                self.postMessage({
                    type: 'hash_argon2_result',
                    hash: result.hashHex,
                    id
                });
            } catch (err) {
                throw new Error(`Argon2 hashing failed: ${err}`);
            }
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
        } else if (type === 'batch_decrypt_courses') {
            const { courses, privateKey } = event.data;
            const decryptedCourses = [];
            const decoder = new TextDecoder();

            for (const course of courses) {
                try {
                    // 1. Decapsulate
                    const encapsulatedKeyBytes = hexToBytes(course.encapsulatedKey);
                    const sharedSecret = ml_kem768.decapsulate(encapsulatedKeyBytes, privateKey);

                    // 2. Decrypt AES Key
                    const encryptedSymmetricKeyBytes = hexToBytes(course.encryptedSymmetricKey);
                    const keyIv = encryptedSymmetricKeyBytes.slice(0, 12);
                    const encryptedKey = encryptedSymmetricKeyBytes.slice(12);

                    const unwrappingKey = await self.crypto.subtle.importKey(
                        'raw',
                        sharedSecret as any,
                        { name: 'AES-GCM' },
                        false,
                        ['decrypt']
                    );

                    const rawKey = await self.crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv: keyIv } as any,
                        unwrappingKey,
                        encryptedKey
                    );

                    const aesKey = await self.crypto.subtle.importKey(
                        'raw',
                        rawKey,
                        { name: 'AES-GCM' },
                        false,
                        ['decrypt']
                    );

                    // 3. Decrypt Course Data
                    const [ivHex, ciphertextHex] = course.encryptedData.split(':');
                    const iv = hexToBytes(ivHex);
                    const ciphertext = hexToBytes(ciphertextHex);

                    const decryptedBuffer = await self.crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv } as any,
                        aesKey,
                        ciphertext as any
                    );

                    const courseJson = decoder.decode(decryptedBuffer);
                    const courseData = JSON.parse(courseJson);

                    decryptedCourses.push({
                        ...courseData,
                        _id: course._id,
                        createdAt: course.createdAt,
                        updatedAt: course.updatedAt,
                    });
                } catch (err) {
                    console.error('Worker failed to decrypt course:', course._id, err);
                }
            }

            self.postMessage({
                type: 'batch_decrypt_courses_result',
                courses: decryptedCourses,
                id
            });
        } else if (type === 'calculate_merkle_root') {
            const { hashes } = event.data;
            const root = await calculateMerkleRootInternal(hashes);
            self.postMessage({
                type: 'calculate_merkle_root_result',
                root,
                id
            });
        } else if (type === 'batch_decrypt_tasks') {
            const { tasks, privateKey } = event.data;
            const decryptedTasks = [];
            const decoder = new TextDecoder();

            for (const task of tasks) {
                try {
                    // 1. Decapsulate
                    const encapsulatedKeyBytes = hexToBytes(task.encapsulatedKey);
                    const sharedSecret = ml_kem768.decapsulate(encapsulatedKeyBytes, privateKey);

                    // 2. Decrypt AES Key
                    // encryptedSymmetricKey is IV (12 bytes/24 hex) + Ciphertext
                    const encryptedSymmetricKeyBytes = hexToBytes(task.encryptedSymmetricKey);
                    const keyIv = encryptedSymmetricKeyBytes.slice(0, 12);
                    const encryptedKey = encryptedSymmetricKeyBytes.slice(12);

                    const unwrappingKey = await self.crypto.subtle.importKey(
                        'raw',
                        sharedSecret as any, // TypedArray expected
                        { name: 'AES-GCM' },
                        false,
                        ['decrypt']
                    );

                    const rawKey = await self.crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv: keyIv as any },
                        unwrappingKey,
                        encryptedKey
                    );

                    const aesKey = await self.crypto.subtle.importKey(
                        'raw',
                        rawKey,
                        { name: 'AES-GCM' },
                        false,
                        ['decrypt']
                    );

                    // 3. Decrypt Task Data
                    const [ivHex, ciphertextHex] = task.encryptedData.split(':');
                    const iv = hexToBytes(ivHex);
                    const ciphertext = hexToBytes(ciphertextHex);

                    const decryptedBuffer = await self.crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv: iv as any },
                        aesKey,
                        ciphertext as any
                    );

                    const taskJson = decoder.decode(decryptedBuffer);
                    const taskData = JSON.parse(taskJson);

                    decryptedTasks.push({
                        ...taskData,
                        _id: task._id,
                        userId: task.userId,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        status: task.status,
                        order: task.order,
                        recordHash: task.recordHash,
                        createdAt: task.createdAt,
                        updatedAt: task.updatedAt,
                    });
                } catch (err) {
                    console.error('Worker failed to decrypt task:', task._id, err);
                }
            }

            self.postMessage({
                type: 'batch_decrypt_tasks_result',
                tasks: decryptedTasks,
                id
            });
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
