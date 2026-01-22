import React, { useEffect, useState, useMemo } from 'react';
import {
    Box,
    IconButton,
    Tooltip,
    Divider,
    alpha,
    useTheme,
    CircularProgress,
    Typography
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
    Keyboard as KeyboardIcon,
    Search as SearchIcon,
    ChevronLeft,
    ChevronRight,
    Close as CloseIcon,
    Abc as MatchCaseIcon
} from '@mui/icons-material';
import { Editor } from '@tiptap/react';

interface EditorToolbarProps {
    editor: Editor;
    onAddLink: () => void;
    isSaving?: boolean;
    hasChanges?: boolean;
    onToggleGuide?: () => void;
    guideOpen?: boolean;
    showSearch?: boolean;
    onToggleSearch?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    editor,
    onAddLink,
    isSaving = false,
    hasChanges = false,
    onToggleGuide,
    guideOpen = false,
    showSearch = false,
    onToggleSearch,
}) => {
    const theme = useTheme();
    // Force re-render on selection update to update button states
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!editor) return;

        const handleTransaction = () => {
            setTick(t => t + 1);
        };

        const handleUpdate = () => {
            setTick(t => t + 1);
        };

        editor.on('transaction', handleTransaction);
        editor.on('update', handleUpdate);
        return () => {
            editor.off('transaction', handleTransaction);
            editor.off('update', handleUpdate);
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
    ], [editor, onAddLink, tick]);

    const storage = (editor.storage as any).search || { results: [], currentIndex: 0, searchTerm: '', caseSensitive: false };
    const resultsCount = (storage.results || []).length;
    const currentIndex = resultsCount > 0 ? storage.currentIndex + 1 : 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
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

                    <Tooltip title="Search (Ctrl+F)">
                        <IconButton
                            size="small"
                            onClick={onToggleSearch}
                            sx={getButtonStyle(showSearch)}
                        >
                            <SearchIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {showSearch && (
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    px: 1.5,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(4px)',
                    zIndex: 10,
                    width: '100%',
                }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: alpha(theme.palette.text.primary, 0.05),
                        borderRadius: '8px',
                        px: 1.5,
                        py: 0.5,
                        flex: { xs: 1, sm: '0 1 300px' },
                        border: '1px solid',
                        borderColor: alpha(theme.palette.divider, 0.1),
                    }}>
                        <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                        <input
                            autoFocus
                            placeholder="Search in note..."
                            value={storage.searchTerm}
                            onChange={(e) => editor.commands.setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (e.shiftKey) editor.commands.previousSearchMatch();
                                    else editor.commands.nextSearchMatch();
                                } else if (e.key === 'Escape') {
                                    onToggleSearch?.();
                                }
                            }}
                            style={{
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                color: theme.palette.text.primary,
                                fontSize: '0.875rem',
                                width: '100%',
                            }}
                        />
                        {storage.searchTerm && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                {resultsCount > 0 ? `${currentIndex}/${resultsCount}` : '0/0'}
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title="Match Case">
                            <IconButton
                                size="small"
                                onClick={() => editor.commands.setCaseSensitive(!storage.caseSensitive)}
                                sx={getButtonStyle(storage.caseSensitive)}
                            >
                                <MatchCaseIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>

                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20, alignSelf: 'center' }} />

                        <Tooltip title="Previous Match (Shift+Enter)">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => editor.commands.previousSearchMatch()}
                                    disabled={resultsCount === 0}
                                    sx={getButtonStyle(false)}
                                >
                                    <ChevronLeft fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Next Match (Enter)">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => editor.commands.nextSearchMatch()}
                                    disabled={resultsCount === 0}
                                    sx={getButtonStyle(false)}
                                >
                                    <ChevronRight fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <IconButton
                            size="small"
                            onClick={onToggleSearch}
                            sx={{ ml: 1, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            )}
        </Box>
    );
};
