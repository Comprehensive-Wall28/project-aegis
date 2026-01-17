import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DialogPortalProps {
    children: ReactNode;
}

/**
 * A reusable portal component that renders its children into document.body.
 * Centralizing this logic makes components cleaner and facilitates testing.
 */
export const DialogPortal = ({ children }: DialogPortalProps) => {
    return createPortal(children, document.body);
};
