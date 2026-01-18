import { Dialog, Box, Typography, alpha, useTheme } from '@mui/material';

const FOLDER_COLORS = [
    '#FFB300', // Default Yellow
    '#EF5350', // Red
    '#AB47BC', // Purple
    '#42A5F5', // Blue
    '#66BB6A', // Green
    '#26C6DA', // Cyan
    '#FFA726', // Orange
    '#8D6E63', // Brown
    '#78909C', // Gray
];

interface ColorPickerDialogProps {
    open: boolean;
    onClose: () => void;
    onColorSelect: (color: string) => void;
}

export function ColorPickerDialog({ open, onClose, onColorSelect }: ColorPickerDialogProps) {
    const theme = useTheme();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    p: 2,
                    borderRadius: '20px',
                    bgcolor: theme.palette.background.paper,
                    minWidth: 200,
                }
            }}
        >
            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700, mb: 2 }}>
                Choose Folder Color
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
                {FOLDER_COLORS.map((color) => (
                    <Box
                        key={color}
                        onClick={() => onColorSelect(color)}
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: color,
                            cursor: 'pointer',
                            border: `2px solid transparent`,
                            transition: 'transform 0.15s, border-color 0.15s',
                            '&:hover': {
                                transform: 'scale(1.1)',
                                borderColor: alpha(theme.palette.common.white, 0.5),
                            }
                        }}
                    />
                ))}
            </Box>
        </Dialog>
    );
}
