import { useContext } from 'react';
import { SocialContext } from '../components/social/SocialPageContext';
import type { SocialContextType } from '../types/social';

export const useSocial = (): SocialContextType => {
    const context = useContext(SocialContext);
    if (!context) {
        throw new Error('useSocial must be used within a SocialProvider');
    }
    return context;
};
