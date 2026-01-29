import React, { createContext, useContext, useMemo } from 'react';
import { useSocialState } from '../../hooks/useSocialState';
import type { SocialState } from '../../hooks/useSocialState';
import { useSocialHandlers } from '../../hooks/useSocialHandlers';

export type SocialContextType = SocialState & ReturnType<typeof useSocialHandlers>;

const SocialContext = createContext<SocialContextType | null>(null);

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const state = useSocialState();
    const handlers = useSocialHandlers(state);

    const value = useMemo(() => ({
        ...state,
        ...handlers
    }), [state, handlers]);

    return (
        <SocialContext.Provider value={value}>
            {children}
        </SocialContext.Provider>
    );
};

export const useSocial = () => {
    const context = useContext(SocialContext);
    if (!context) {
        throw new Error('useSocial must be used within a SocialProvider');
    }
    return context;
};
