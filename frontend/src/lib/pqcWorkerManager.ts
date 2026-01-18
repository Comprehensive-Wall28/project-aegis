/**
 * PQC Worker Manager - Singleton manager for the PQC Web Worker.
 * Provides a Promise-based API for expensive cryptographic operations.
 */

class PQCWorkerManager {
    private worker: Worker | null = null;
    private messageId = 0;
    private pendingRequests = new Map<number, { resolve: (data: any) => void; reject: (err: any) => void }>();

    constructor() {
        if (typeof window !== 'undefined') {
            this.worker = new Worker(new URL('../workers/pqc.worker.ts', import.meta.url), { type: 'module' });
            this.worker.onmessage = this.handleMessage.bind(this);
        }
    }

    private handleMessage(event: MessageEvent) {
        const { type, error, id } = event.data;

        const requestId = id !== undefined ? id : -1;
        const request = this.pendingRequests.get(requestId);

        if (type === 'error') {
            if (request) {
                request.reject(new Error(error));
                this.pendingRequests.delete(requestId);
            }
            return;
        }

        if (type === 'keygen_result' || type === 'derive_pqc_seed_result' || type === 'get_discovery_key_result' || type === 'encapsulate_result' || type === 'decapsulate_result') {
            if (request) {
                request.resolve(event.data);
                this.pendingRequests.delete(requestId);
            }
        }
    }

    private sendRequest(type: string, data: any): Promise<any> {
        if (!this.worker) return Promise.reject(new Error('Worker not supported'));

        const id = this.messageId++;
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.worker!.postMessage({ ...data, type, id });
        });
    }

    /**
     * Expensive: Derive PQC seed from password and salt
     */
    async derivePQCSeed(password: string, email?: string): Promise<Uint8Array> {
        const result = await this.sendRequest('derive_pqc_seed', { password, email });
        return result.seed;
    }

    /**
     * Expensive: Generate PQC public key (discovery key)
     */
    async getPQCDiscoveryKey(password: string, email?: string): Promise<string> {
        const result = await this.sendRequest('get_discovery_key', { password, email });
        return result.publicKey;
    }

    /**
     * Expensive: Generate ML-KEM-768 keypair
     */
    async generateKeys(seed?: Uint8Array): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array }> {
        const result = await this.sendRequest('keygen', { seed });
        return {
            publicKey: result.publicKey,
            secretKey: result.secretKey
        };
    }
    /**
     * Expensive: Decrypt room key using ML-KEM-768 decapsulation
     */
    async decryptRoomKey(encryptedRoomKeyHex: string, privateKeyHex: string): Promise<Uint8Array> {
        // Helper to convert hex to Uint8Array
        const hexToBytes = (hex: string) =>
            new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

        const cipherText = hexToBytes(encryptedRoomKeyHex);
        const privateKey = hexToBytes(privateKeyHex);

        const result = await this.sendRequest('decapsulate', { cipherText, privateKey });
        return result.sharedSecret;
    }

    /**
     * Expensive: Encrypt room key using ML-KEM-768 encapsulation
     */
    async encryptRoomKey(publicKeyHex: string): Promise<{ sharedSecret: Uint8Array; cipherText: Uint8Array }> {
        // Helper to convert hex to Uint8Array
        const hexToBytes = (hex: string) =>
            new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

        const publicKey = hexToBytes(publicKeyHex);
        const result = await this.sendRequest('encapsulate', { publicKey });

        return {
            sharedSecret: result.sharedSecret,
            cipherText: result.cipherText
        };
    }
}

export const pqcWorkerManager = new PQCWorkerManager();
