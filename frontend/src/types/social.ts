import type { SocialState } from '../hooks/useSocialState';
import type { useSocialHandlers } from '../hooks/useSocialHandlers';

export type SocialContextType = SocialState & ReturnType<typeof useSocialHandlers>;
