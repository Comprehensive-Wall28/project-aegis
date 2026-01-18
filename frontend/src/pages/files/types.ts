export type ViewPreset = 'compact' | 'standard' | 'comfort' | 'detailed';

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
    name: string; // MUI variant
    size: number;
    mb: number;
}
