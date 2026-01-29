import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { useSocial } from './SocialPageContext';
import { SocialSidebar } from './SocialSidebar';
import { LinksContainer } from './LinksContainer';
import { SocialErrorBoundary } from './SocialErrorBoundary';

export const RoomContentView: React.FC = () => {
    const {
        currentCollectionId
    } = useSocial();

    // Ref for links container to scroll to top on collection change
    const linksContainerRef = useRef<HTMLDivElement>(null);

    // Scroll links to top when collection changes
    useEffect(() => {
        linksContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentCollectionId]);


    return (
        <Box
            key="room-content"
            sx={{ display: 'flex', gap: 2, height: '100%' }}
        >
            <SocialErrorBoundary componentName="Sidebar">
                <SocialSidebar />
            </SocialErrorBoundary>

            <Box sx={{ flex: 1, minWidth: 0, height: '100%' }}>
                <SocialErrorBoundary componentName="Links Container">
                    <LinksContainer
                        ref={linksContainerRef}
                    />
                </SocialErrorBoundary>
            </Box>
        </Box>
    );
};
