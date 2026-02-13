import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    Box,
    IconButton,
    Tooltip,
    Divider,
    alpha,
    useTheme,
    CircularProgress,
    Typography,
    Button,
    Popper,
    Paper,
    List,
    ListItemButton,
    ListItemText,
    ClickAwayListener,
    Collapse
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
    Abc as MatchCaseIcon,
    Clear as ClearIcon,
    SwapHoriz as ReplaceIcon,
    KeyboardArrowUp
} from '@mui/icons-material';
import { Editor } from '@tiptap/react';

interface SearchStorage {
    results: Array<{ from: number; to: number }> | [];
    currentIndex: number;
    searchTerm: string;
    caseSensitive: boolean;
    useRegex: boolean;
    wholeWord: boolean;
    replaceText: string;
    regexError: boolean;
    searchHistory: string[];
    lastReplacedCount: number;
}

interface EditorToolbarProps {
    editor: Editor;
    onAddLink: () => void;
    isSaving?: boolean;
    hasChanges?: boolean;
    onToggleGuide?: () => void;
    guideOpen?: boolean;
    showSearch?: boolean;
    onToggleSearch?: () => void;
    showReplace?: boolean;
    onToggleReplace?: () => void;
    spellcheckEnabled?: boolean;
    onToggleSpellcheck?: () => void;
    isUploadingImage?: boolean;
}

// Regex icon component
const RegexIcon: React.FC<{ fontSize?: 'small' | 'medium' }> = ({ fontSize = 'small' }) => (
    <Typography
        component="span"
        sx={{
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: fontSize === 'small' ? '0.75rem' : '0.875rem',
            lineHeight: 1
        }}
    >
        .*
    </Typography>
);

// Whole word icon component
const WholeWordIcon: React.FC<{ fontSize?: 'small' | 'medium' }> = ({ fontSize = 'small' }) => (
    <Typography
        component="span"
        sx={{
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: fontSize === 'small' ? '0.7rem' : '0.8rem',
            lineHeight: 1,
            border: '1px solid currentColor',
            borderRadius: '2px',
            px: 0.3
        }}
    >
        ab
    </Typography>
);

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    editor,
    onAddLink,
    isSaving = false,
    hasChanges = false,
    onToggleGuide,
    guideOpen = false,
    showSearch = false,
    onToggleSearch,
    showReplace = false,
    onToggleReplace,
    spellcheckEnabled = true,
    onToggleSpellcheck,
    isUploadingImage = false,
}) => {
    const theme = useTheme();
    const [tick, setTick] = useState(0);
    const [historyAnchor, setHistoryAnchor] = useState<HTMLElement | null>(null);
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [localReplaceText, setLocalReplaceText] = useState('');

    useEffect(() => {
        if (!editor) return;

        const handleTransaction = () => setTick(t => t + 1);
        const handleUpdate = () => setTick(t => t + 1);

        editor.on('transaction', handleTransaction);
        editor.on('update', handleUpdate);
        return () => {
            editor.off('transaction', handleTransaction);
            editor.off('update', handleUpdate);
        };
    }, [editor]);

    // Debounced search term update
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearchTerm !== storage.searchTerm) {
                editor.commands.setSearchTerm(localSearchTerm);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [localSearchTerm]);

    // Sync local state with storage
    const storage: SearchStorage = ((editor.storage as unknown) as Record<string, SearchStorage>).search || {
        results: [],
        currentIndex: 0,
        searchTerm: '',
        caseSensitive: false,
        useRegex: false,
        wholeWord: false,
        replaceText: '',
        regexError: false,
        searchHistory: [],
        lastReplacedCount: 0
    };

    // Keep local state in sync when search is opened
    useEffect(() => {
        if (showSearch) {
            // Only update if values actually changed to avoid cascading renders
            if (localSearchTerm !== (storage.searchTerm as string)) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setLocalSearchTerm(storage.searchTerm as string);
            }
            if (localReplaceText !== (storage.replaceText as string)) {
                 
                setLocalReplaceText(storage.replaceText as string);
            }
        }
    }, [showSearch]);

    const resultsCount = (storage.results || []).length;
    const currentIndex = resultsCount > 0 ? storage.currentIndex + 1 : 0;

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

    const handleClearSearch = useCallback(() => {
        setLocalSearchTerm('');
        editor.commands.clearSearch();
    }, [editor]);

    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            // Add to history on enter
            if (localSearchTerm) {
                editor.commands.addToSearchHistory(localSearchTerm);
            }
            if (e.shiftKey) {
                editor.commands.previousSearchMatch();
            } else {
                editor.commands.nextSearchMatch();
            }
        } else if (e.key === 'Escape') {
            onToggleSearch?.();
        }
    }, [editor, localSearchTerm, onToggleSearch]);

    const handleReplaceKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (e.ctrlKey && e.shiftKey) {
                // Replace all
                editor.commands.setReplaceText(localReplaceText);
                editor.commands.replaceAllMatches();
            } else {
                // Replace current
                editor.commands.setReplaceText(localReplaceText);
                editor.commands.replaceCurrentMatch();
            }
        } else if (e.key === 'Escape') {
            onToggleSearch?.();
        }
    }, [editor, localReplaceText, onToggleSearch]);

    const handleReplaceCurrent = useCallback(() => {
        editor.commands.setReplaceText(localReplaceText);
        editor.commands.replaceCurrentMatch();
    }, [editor, localReplaceText]);

    const handleReplaceAll = useCallback(() => {
        editor.commands.setReplaceText(localReplaceText);
        editor.commands.replaceAllMatches();
    }, [editor, localReplaceText]);

    const handleHistoryClick = (term: string) => {
        setLocalSearchTerm(term);
        editor.commands.setSearchTerm(term);
        setHistoryAnchor(null);
    };

    const inputStyle = {
        border: 'none',
        outline: 'none',
        background: 'transparent',
        color: theme.palette.text.primary,
        fontSize: '0.875rem',
        width: '100%',
    };

    const inputContainerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: alpha(theme.palette.text.primary, 0.05),
        borderRadius: '8px',
        px: 1.5,
        py: 0.5,
        flex: { xs: 1, sm: '0 1 280px' },
        border: '1px solid',
        borderColor: storage.regexError
            ? theme.palette.error.main
            : alpha(theme.palette.divider, 0.1),
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {/* Main Toolbar */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                p: 1.5,
                borderBottom: 1,
                borderColor: alpha(theme.palette.divider, 0.08),
                flexWrap: 'wrap',
                bgcolor: 'background.paper',
            }}>
                {config.map((item, index) => {
                    if (item.type === 'divider') {
                        return <Divider key={index} orientation="vertical" flexItem sx={{ mx: 0.5 }} />;
                    }
                    const toolItem = item as { title: string; action: () => void; isActive: boolean; icon: React.ReactNode };
                    return (
                        <Tooltip key={index} title={toolItem.title}>
                            <IconButton
                                size="small"
                                onClick={toolItem.action}
                                sx={getButtonStyle(toolItem.isActive)}
                            >
                                {toolItem.icon}
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
                    <Tooltip title={`${spellcheckEnabled ? 'Disable' : 'Enable'} Spellcheck`}>
                        <IconButton
                            size="small"
                            onClick={onToggleSpellcheck}
                            sx={getButtonStyle(!!spellcheckEnabled)}
                        >
                            <MatchCaseIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

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

                {/* Upload Status */}
                {isUploadingImage && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        ml: 2,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '20px',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    }}>
                        <CircularProgress size={14} thickness={6} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            Uploading Image...
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Search Bar */}
            {showSearch && (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
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
                    {/* Search Row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <ClickAwayListener onClickAway={() => setHistoryAnchor(null)}>
                            <Box sx={inputContainerStyle}>
                                <SearchIcon fontSize="small" sx={{ color: 'text.disabled', flexShrink: 0 }} />
                                <input
                                    autoFocus
                                    placeholder="Search in note..."
                                    value={localSearchTerm}
                                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    onFocus={(e) => {
                                        if (storage.searchHistory?.length > 0) {
                                            setHistoryAnchor(e.currentTarget.parentElement);
                                        }
                                    }}
                                    style={inputStyle}
                                    aria-label="Search in note"
                                />
                                {localSearchTerm && (
                                    <Tooltip title="Clear search">
                                        <IconButton
                                            size="small"
                                            onClick={handleClearSearch}
                                            sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
                                        >
                                            <ClearIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {localSearchTerm && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: storage.regexError ? 'error.main' : 'text.secondary',
                                            whiteSpace: 'nowrap',
                                            fontVariantNumeric: 'tabular-nums',
                                            flexShrink: 0
                                        }}
                                    >
                                        {storage.regexError ? 'Invalid' : resultsCount > 0 ? `${currentIndex}/${resultsCount}` : '0/0'}
                                    </Typography>
                                )}
                            </Box>
                        </ClickAwayListener>

                        {/* Search History Popper */}
                        <Popper
                            open={Boolean(historyAnchor) && (storage.searchHistory?.length || 0) > 0}
                            anchorEl={historyAnchor}
                            placement="bottom-start"
                            sx={{ zIndex: 1300 }}
                        >
                            <Paper
                                elevation={8}
                                sx={{
                                    mt: 0.5,
                                    maxHeight: 200,
                                    overflow: 'auto',
                                    minWidth: 250,
                                    borderRadius: '8px'
                                }}
                            >
                                <List dense disablePadding>
                                    {(storage.searchHistory || []).map((term: string, i: number) => (
                                        <ListItemButton
                                            key={i}
                                            onClick={() => handleHistoryClick(term)}
                                            sx={{ py: 0.5 }}
                                        >
                                            <ListItemText
                                                primary={term}
                                                slotProps={{
                                                    primary: { fontSize: '0.875rem' }
                                                }}
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            </Paper>
                        </Popper>

                        {/* Toggle buttons */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title="Match Case">
                                <IconButton
                                    size="small"
                                    onClick={() => editor.commands.setCaseSensitive(!storage.caseSensitive)}
                                    sx={getButtonStyle(storage.caseSensitive)}
                                    aria-label="Toggle case sensitivity"
                                >
                                    <MatchCaseIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Use Regex">
                                <IconButton
                                    size="small"
                                    onClick={() => editor.commands.setUseRegex(!storage.useRegex)}
                                    sx={getButtonStyle(storage.useRegex)}
                                    aria-label="Toggle regex search"
                                >
                                    <RegexIcon />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Whole Word">
                                <IconButton
                                    size="small"
                                    onClick={() => editor.commands.setWholeWord(!storage.wholeWord)}
                                    sx={getButtonStyle(storage.wholeWord)}
                                    aria-label="Toggle whole word matching"
                                >
                                    <WholeWordIcon />
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
                                        aria-label="Previous match"
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
                                        aria-label="Next match"
                                    >
                                        <ChevronRight fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20, alignSelf: 'center' }} />

                            <Tooltip title={showReplace ? 'Hide Replace' : 'Show Replace (Ctrl+H)'}>
                                <IconButton
                                    size="small"
                                    onClick={onToggleReplace}
                                    sx={getButtonStyle(showReplace)}
                                    aria-label="Toggle replace"
                                >
                                    {showReplace ? <KeyboardArrowUp fontSize="small" /> : <ReplaceIcon sx={{ fontSize: 18 }} />}
                                </IconButton>
                            </Tooltip>

                            <IconButton
                                size="small"
                                onClick={onToggleSearch}
                                sx={{ ml: 0.5, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
                                aria-label="Close search"
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>

                    {/* Replace Row */}
                    <Collapse in={showReplace}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pt: 0.5 }}>
                            <Box sx={{ ...inputContainerStyle, borderColor: alpha(theme.palette.divider, 0.1) }}>
                                <ReplaceIcon fontSize="small" sx={{ color: 'text.disabled', flexShrink: 0 }} />
                                <input
                                    placeholder="Replace with..."
                                    value={localReplaceText}
                                    onChange={(e) => setLocalReplaceText(e.target.value)}
                                    onKeyDown={handleReplaceKeyDown}
                                    style={inputStyle}
                                    aria-label="Replace text"
                                />
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Tooltip title="Replace (Enter in replace field)">
                                    <span>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={handleReplaceCurrent}
                                            disabled={resultsCount === 0}
                                            sx={{
                                                borderRadius: '6px',
                                                textTransform: 'none',
                                                fontSize: '0.75rem',
                                                py: 0.25,
                                                px: 1.5,
                                                minWidth: 'auto'
                                            }}
                                        >
                                            Replace
                                        </Button>
                                    </span>
                                </Tooltip>

                                <Tooltip title="Replace All (Ctrl+Shift+Enter)">
                                    <span>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={handleReplaceAll}
                                            disabled={resultsCount === 0}
                                            sx={{
                                                borderRadius: '6px',
                                                textTransform: 'none',
                                                fontSize: '0.75rem',
                                                py: 0.25,
                                                px: 1.5,
                                                minWidth: 'auto'
                                            }}
                                        >
                                            Replace All
                                        </Button>
                                    </span>
                                </Tooltip>

                                {storage.lastReplacedCount > 0 && (
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'success.main', ml: 1 }}
                                    >
                                        {storage.lastReplacedCount} replaced
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Collapse>
                </Box>
            )
            }
        </Box >
    );
};
