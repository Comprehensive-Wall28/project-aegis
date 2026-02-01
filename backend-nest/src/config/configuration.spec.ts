import { validate, Environment } from './configuration';

describe('Configuration Validation', () => {
  it('should validate a correct configuration', () => {
    const config = {
      NODE_ENV: 'development',
      MONGO_URI: 'mongodb://localhost:27017/test',
    };
    const result = validate(config);
    expect(result).toBeDefined();
    expect(result.NODE_ENV).toBe(Environment.Development);
    expect(result.MONGO_URI).toBe('mongodb://localhost:27017/test');
  });

  it('should use default values', () => {
    const config = {};
    const result = validate(config);
    expect(result.PORT).toBe(5000);
    expect(result.API_RATE_LIMIT).toBe(500);
  });

  it('should throw error for invalid enum', () => {
    const config = {
      NODE_ENV: 'invalid_env',
    };
    expect(() => validate(config)).toThrow();
  });

  it('should require specific variables in production', () => {
    const config = {
      NODE_ENV: 'production',
      // Missing MONGO_URI, JWT_SECRET etc
    };
    expect(() => validate(config)).toThrow(
      /Missing required environment variables/,
    );
  });

  it('should pass production validation when all required vars are present', () => {
    const config = {
      NODE_ENV: 'production',
      MONGO_URI: 'mongodb://prod',
      AUDIT_MONGO_URI: 'mongodb://audit',
      JWT_SECRET: 'secret',
      CLIENT_ORIGIN: 'https://app.com',
      RP_ID: 'app.com',
      CSRF_SECRET: 'csrf',
    };
    expect(validate(config)).toBeDefined();
  });
});
