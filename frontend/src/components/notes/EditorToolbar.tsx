import React, { useEffect, useState, useMemo } from 'react';
import {
    Box,
    IconButton,
    Tooltip,
    Divider,
    alpha,
    useTheme,
    CircularProgress
} from '@mui/material';
import {
    FormatBold,
    FormatItalic,
    FormatStrikethrough,
    Code,
    FormatListBulleted,
    FormatListNumbered,
    FormatQuote,
    HorizontalRule,
    Undo,
    Redo,
    Link as LinkIcon,
    LinkOff,
    Fullscreen,
    FullscreenExit,
    Keyboard as KeyboardIcon,
} from '@mui/icons-material';
import { Editor } from '@tiptap/react';

interface EditorToolbarProps {
    editor: Editor;
    onAddLink: () => void;
    isSaving?: boolean;
    hasChanges?: boolean;
    onToggleFullscreen?: () => void;
    fullscreen?: boolean;
    onToggleGuide?: () => void;
    guideOpen?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    editor,
    onAddLink,
    isSaving = false,
    hasChanges = false,
    onToggleFullscreen,
    fullscreen = false,
    onToggleGuide,
    guideOpen = false,
}) => {
    const theme = useTheme();
    // Force re-render on selection update to update button states
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!editor) return;

        const handleTransaction = () => {
            setTick(t => t + 1);
        };

        editor.on('transaction', handleTransaction);
        return () => {
            editor.off('transaction', handleTransaction);
        };
    }, [editor]);

    const getButtonStyle = (active: boolean) => ({
        bgcolor: active ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
        color: active ? 'primary.main' : 'text.secondary',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        border: active ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}` : '1px solid transparent',
        '&:hover': {
            bgcolor: active ? alpha(theme.palette.primary.main, 0.25) : alpha(theme.palette.action.hover, 0.1),
            borderColor: active ? alpha(theme.palette.primary.main, 0.5) : 'transparent',
        },
    });

    const config = useMemo(() => [
        {
            type: 'button',
            icon: <FormatBold fontSize="small" />,
            title: 'Bold (Ctrl+B)',
            action: () => editor.chain().focus().toggleBold().run(),
            isActive: editor.isActive('bold'),
        },
        {
            type: 'button',
            icon: <FormatItalic fontSize="small" />,
            title: 'Italic (Ctrl+I)',
            action: () => editor.chain().focus().toggleItalic().run(),
            isActive: editor.isActive('italic'),
        },
        {
            type: 'button',
            icon: <FormatStrikethrough fontSize="small" />,
            title: 'Strikethrough (Ctrl+Shift+X)',
            action: () => editor.chain().focus().toggleStrike().run(),
            isActive: editor.isActive('strike'),
        },
        {
            type: 'button',
            icon: <Code fontSize="small" />,
            title: 'Code',
            action: () => editor.chain().focus().toggleCode().run(),
            isActive: editor.isActive('code'),
        },
        { type: 'divider' },
        {
            type: 'button',
            icon: <FormatListBulleted fontSize="small" />,
            title: 'Bullet List (Ctrl+Shift+8)',
            action: () => editor.chain().focus().toggleBulletList().run(),
            isActive: editor.isActive('bulletList'),
        },
        {
            type: 'button',
            icon: <FormatListNumbered fontSize="small" />,
            title: 'Numbered List (Ctrl+Shift+7)',
            action: () => editor.chain().focus().toggleOrderedList().run(),
            isActive: editor.isActive('orderedList'),
        },
        {
            type: 'button',
            icon: <FormatQuote fontSize="small" />,
            title: 'Quote (Ctrl+Q)',
            action: () => editor.chain().focus().toggleBlockquote().run(),
            isActive: editor.isActive('blockquote'),
        },
        {
            type: 'button',
            icon: <HorizontalRule fontSize="small" />,
            title: 'Horizontal Rule',
            action: () => editor.chain().focus().setHorizontalRule().run(),
            isActive: false,
        },
        { type: 'divider' },
        {
            type: 'button',
            id: 'link',
            icon: <LinkIcon fontSize="small" />,
            title: 'Add Link',
            action: onAddLink,
            isActive: editor.isActive('link'),
        },
    ], [editor, onAddLink, tick]); // Re-calculate when editor or callbacks change

    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            p: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            flexWrap: 'wrap',
            bgcolor: 'background.paper',
        }}>
            {config.map((item, index) => {
                if (item.type === 'divider') {
                    return <Divider key={index} orientation="vertical" flexItem sx={{ mx: 0.5 }} />;
                }
                return (
                    <Tooltip key={index} title={(item as any).title}>
                        <IconButton
                            size="small"
                            onClick={(item as any).action}
                            sx={getButtonStyle((item as any).isActive)}
                        >
                            {(item as any).icon}
                        </IconButton>
                    </Tooltip>
                );
            })}

            {editor.isActive('link') && (
                <Tooltip title="Remove Link">
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().unsetLink().run()}
                        sx={getButtonStyle(false)}
                    >
                        <LinkOff fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Tooltip title="Undo (Ctrl+Z)">
                <span>
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        sx={getButtonStyle(false)}
                    >
                        <Undo fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>

            <Tooltip title="Redo (Ctrl+Y)">
                <span>
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        sx={getButtonStyle(false)}
                    >
                        <Redo fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>

            {/* Save indicator & Fullscreen Toggle */}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Shortcut Guide (Ctrl+/)">
                    <IconButton
                        size="small"
                        onClick={onToggleGuide}
                        sx={{
                            ...getButtonStyle(!!guideOpen),
                            color: guideOpen ? 'primary.main' : 'text.secondary'
                        }}
                    >
                        <KeyboardIcon fontSize="small" />
                    </IconButton>
                </Tooltip>

                {isSaving && <CircularProgress size={16} />}
                {hasChanges && !isSaving && (
                    <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'warning.main',
                        boxShadow: (theme) => `0 0 8px ${alpha(theme.palette.warning.main, 0.6)}`,
                    }} />
                )}
                {onToggleFullscreen && (
                    <Tooltip title={fullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (Ctrl+F)"}>
                        <IconButton
                            size="small"
                            onClick={onToggleFullscreen}
                            sx={{
                                ...getButtonStyle(fullscreen),
                                ml: 1
                            }}
                        >
                            {fullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        </Box>
    );
};
