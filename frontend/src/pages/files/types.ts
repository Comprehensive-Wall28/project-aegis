import type { TypographyVariant } from '@mui/material';

export type ViewPreset = 'compact' | 'standard' | 'comfort' | 'detailed' | 'gallery' | 'list';

export interface GridSizeConfig {
    xs: number;
    sm: number;
    md: number;
    lg: number;
}

export interface IconScalingConfig {
    size: number;
    padding: number;
    badge: number;
}

export interface TypoScalingConfig {
    name: TypographyVariant; // MUI variant
    size: number;
    mb: number;
}

export interface ContextMenuTarget {
    type: 'file' | 'folder' | 'empty';
    id?: string;
}
