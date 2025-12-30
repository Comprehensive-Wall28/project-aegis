import { MerkleTree } from 'merkletreejs';
import CryptoJS from 'crypto-js';

/**
 * Generates a Merkle Tree from a list of hashes.
 * @param hashes Array of SHA256 hashes.
 * @returns MerkleTree instance.
 */
export const generateMerkleTree = (hashes: string[]): MerkleTree => {
    return new MerkleTree(hashes, CryptoJS.SHA256, { sortPairs: true });
};

/**
 * Calculates the Merkle Root for a list of hashes.
 * @param hashes Array of SHA256 hashes.
 * @returns The Merkle Root as a hex string.
 */
export const calculateMerkleRoot = (hashes: string[]): string => {
    if (hashes.length === 0) return '';
    const tree = generateMerkleTree(hashes);
    return tree.getRoot().toString('hex');
};

/**
 * Generates a Merkle Proof for a specific hash within a list of hashes.
 * @param hashes Array of SHA256 hashes.
 * @param targetHash The hash to generate a proof for.
 * @returns The Merkle Proof as an array of objects.
 */
export const generateMerkleProof = (hashes: string[], targetHash: string) => {
    const tree = generateMerkleTree(hashes);
    const leaf = CryptoJS.SHA256(targetHash).toString(); 
    const proof = tree.getProof(targetHash);
    return proof;
};
