import React, { createContext, useMemo } from 'react';
import { useSocialState } from '../../hooks/useSocialState';
import type { SocialContextType } from '../../types/social';
import { useSocialHandlers } from '../../hooks/useSocialHandlers';

const SocialContext = createContext<SocialContextType | null>(null);

export { SocialContext };

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
