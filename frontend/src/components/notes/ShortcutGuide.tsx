import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    IconButton,
    Paper,
    Divider,
    alpha,
    useTheme,
} from '@mui/material';
import { Close as CloseIcon, Keyboard } from '@mui/icons-material';

interface ShortcutItemProps {
    label: string;
    keys: string[];
}

const ShortcutItem: React.FC<ShortcutItemProps> = ({ label, keys }) => {
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
                {keys.map((key, idx) => (
                    <Paper
                        key={idx}
                        elevation={0}
                        sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: '4px',
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            bgcolor: alpha(theme.palette.action.hover, 0.5),
                            minWidth: 24,
                            textAlign: 'center',
                        }}
                    >
                        <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {key}
                        </Typography>
                    </Paper>
                ))}
            </Box>
        </Box>
    );
};

interface ShortcutGuideProps {
    open: boolean;
    onClose: () => void;
}

export const ShortcutGuide: React.FC<ShortcutGuideProps> = ({ open, onClose }) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: 450,
                        bgcolor: 'background.paper',
                        backgroundImage: 'none',
                    }
                }
            }}
        >
            <DialogTitle sx={{
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: 1,
                borderColor: 'divider',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Keyboard color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Keyboard Shortcuts</Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', mb: 2, display: 'block' }}>
                    Standard Editing
                </Typography>
                <ShortcutItem label="Bold" keys={['Ctrl', 'B']} />
                <ShortcutItem label="Italic" keys={['Ctrl', 'I']} />
                <ShortcutItem label="Underline" keys={['Ctrl', 'U']} />
                <ShortcutItem label="Strikethrough" keys={['Ctrl', 'Shift', 'X']} />
                <ShortcutItem label="Code Snippet" keys={['Ctrl', 'E']} />

                <Divider sx={{ my: 2, opacity: 0.5 }} />

                <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', mb: 2, display: 'block' }}>
                    Formatting
                </Typography>
                <ShortcutItem label="Heading 1" keys={['Ctrl', 'Alt', '1']} />
                <ShortcutItem label="Heading 2" keys={['Ctrl', 'Alt', '2']} />
                <ShortcutItem label="Heading 3" keys={['Ctrl', 'Alt', '3']} />
                <ShortcutItem label="Bullet List" keys={['Ctrl', 'Shift', '8']} />
                <ShortcutItem label="Numbered List" keys={['Ctrl', 'Shift', '7']} />
                <ShortcutItem label="Blockquote" keys={['Ctrl', 'Q']} />

                <Divider sx={{ my: 2, opacity: 0.5 }} />

                <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', mb: 2, display: 'block' }}>
                    Actions
                </Typography>
                <ShortcutItem label="Save Changes" keys={['Ctrl', 'S']} />
                <ShortcutItem label="Toggle Fullscreen" keys={['Ctrl', 'F']} />
                <ShortcutItem label="Exit Fullscreen" keys={['Esc']} />
                <ShortcutItem label="Shortcut Guide" keys={['Ctrl', '/']} />
                <ShortcutItem label="Undo" keys={['Ctrl', 'Z']} />
                <ShortcutItem label="Redo" keys={['Ctrl', 'Shift', 'Z']} />
            </DialogContent>
        </Dialog>
    );
};
