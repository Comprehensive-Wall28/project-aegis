export const validUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    pqcPublicKey: 'mock-pqc-public-key-12345',
};

export const anotherValidUserData = {
    username: 'testitem2',
    email: 'test2@example.com',
    password: 'password123',
    pqcPublicKey: 'mock-pqc-public-key-67890',
};

export const invalidUserData = {
    missingEmail: {
        username: 'noemail',
        password: 'password123',
        pqcPublicKey: 'key',
    },
    missingPassword: {
        username: 'nopassword',
        email: 'nopassword@example.com',
        pqcPublicKey: 'key',
    },
    missingUsername: {
        email: 'nousername@example.com',
        password: 'password123',
        pqcPublicKey: 'key',
    },
    weakPassword: {
        username: 'weakpass',
        email: 'weakpass@example.com',
        password: '123',
        pqcPublicKey: 'key',
    },
    invalidEmail: {
        username: 'bademail',
        email: 'not-an-email',
        password: 'password123',
        pqcPublicKey: 'key',
    },
};
