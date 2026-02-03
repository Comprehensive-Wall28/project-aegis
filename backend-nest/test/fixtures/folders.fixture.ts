/**
 * Folder fixtures for E2E testing
 * Provides valid and invalid folder data for different test scenarios
 */

export interface FolderData {
    name: string;
    parentId?: string | null;
    encryptedSessionKey: string;
    color?: string;
}

// Base valid folder data
export const validFolderData: FolderData = {
    name: 'Test Folder',
    encryptedSessionKey: 'test_encrypted_session_key_base64',
    color: null
};

// Root level folder (no parent)
export const rootFolder: FolderData = {
    name: 'Root Test Folder',
    parentId: null,
    encryptedSessionKey: 'root_folder_session_key',
    color: '#3f51b5'
};

// Folder with custom color
export const coloredFolder: FolderData = {
    name: 'Colored Folder',
    encryptedSessionKey: 'colored_folder_session_key',
    color: '#ff5722'
};

// Folder for hierarchy testing
export const parentFolder: FolderData = {
    name: 'Parent Folder',
    encryptedSessionKey: 'parent_folder_session_key',
    color: '#4caf50'
};

export const childFolder: FolderData = {
    name: 'Child Folder',
    encryptedSessionKey: 'child_folder_session_key',
    color: '#2196f3'
};

export const grandchildFolder: FolderData = {
    name: 'Grandchild Folder',
    encryptedSessionKey: 'grandchild_folder_session_key',
    color: '#9c27b0'
};

// Multiple folders for listing tests
export const multipleFolders: FolderData[] = [
    { name: 'Alpha Folder', encryptedSessionKey: 'alpha_key', color: '#f44336' },
    { name: 'Beta Folder', encryptedSessionKey: 'beta_key', color: '#e91e63' },
    { name: 'Gamma Folder', encryptedSessionKey: 'gamma_key', color: '#9c27b0' },
    { name: 'Delta Folder', encryptedSessionKey: 'delta_key', color: '#673ab7' },
    { name: 'Epsilon Folder', encryptedSessionKey: 'epsilon_key', color: '#3f51b5' }
];

// Invalid folder data for validation testing
export const invalidFolderData = {
    missingName: {
        encryptedSessionKey: 'test_session_key'
        // Missing name
    },
    
    missingEncryptedSessionKey: {
        name: 'Test Folder'
        // Missing encryptedSessionKey
    },
    
    emptyName: {
        name: '',
        encryptedSessionKey: 'test_session_key'
    },
    
    whitespaceName: {
        name: '   ',
        encryptedSessionKey: 'test_session_key'
    },
    
    invalidParentId: {
        name: 'Test Folder',
        parentId: 'invalid-id-format',
        encryptedSessionKey: 'test_session_key'
    },
    
    nonExistentParentId: {
        name: 'Test Folder',
        parentId: '507f1f77bcf86cd799439011', // Valid format but doesn't exist
        encryptedSessionKey: 'test_session_key'
    }
};

// Folders for move files testing
export const sourceFolder: FolderData = {
    name: 'Source Folder',
    encryptedSessionKey: 'source_folder_session_key',
    color: '#ff9800'
};

export const targetFolder: FolderData = {
    name: 'Target Folder',
    encryptedSessionKey: 'target_folder_session_key',
    color: '#00bcd4'
};
