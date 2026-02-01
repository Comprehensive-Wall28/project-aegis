import { encryptToken, decryptToken } from './cryptoUtils';

describe('CryptoUtils', () => {
  it('encryptToken should return the same string for now', () => {
    expect(encryptToken('test')).toBe('test');
  });

  it('decryptToken should return the same string for now', () => {
    expect(decryptToken('test')).toBe('test');
  });
});
