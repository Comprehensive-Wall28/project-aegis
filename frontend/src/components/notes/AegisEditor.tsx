import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Box, IconButton, Tooltip, Divider, CircularProgress, alpha, useTheme } from '@mui/material';
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
import { ShortcutGuide } from './ShortcutGuide';
import type { JSONContent, Editor } from '@tiptap/react';

interface AegisEditorProps {
    initialTitle?: string;
    initialContent?: JSONContent;
    onSave: (content: JSONContent, title: string) => Promise<void>;
    readOnly?: boolean;
    autoSaveDelay?: number;
    onToggleFullscreen?: () => void;
    fullscreen?: boolean;
}

/**
 * TipTap-based rich text editor for Aegis Notes
 */
const AegisEditor: React.FC<AegisEditorProps> = ({
    initialTitle = '',
    initialContent,
    onSave,
    readOnly = false,
    autoSaveDelay = 1500,
    onToggleFullscreen,
    fullscreen = false,
}) => {
    const [title, setTitle] = useState(initialTitle);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const [, setUpdateTick] = useState(0); // Dummy state to force re-render
    const theme = useTheme();
    const titleRef = useRef(title);

    // Keep titleRef in sync with title state
    useEffect(() => {
        titleRef.current = title;
    }, [title]);

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
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContentRef = useRef<string>('');
    const lastSavedTitleRef = useRef<string>(initialTitle);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder: 'Start typing your note...',
            }),
        ],
        content: initialContent,
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: 'aegis-editor-content',
            },
        },
        onUpdate: ({ editor }) => {
            const currentContent = JSON.stringify(editor.getJSON());
            if (currentContent !== lastSavedContentRef.current) {
                setHasChanges(true);
                debouncedSave(editor, titleRef.current);
            }
        },
        onTransaction: () => {
            // Force re-render on every transaction to keep toolbar in sync
            setUpdateTick(tick => tick + 1);
        },
    });

    // Handle title change
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        setHasChanges(true);
        if (editor) {
            debouncedSave(editor, newTitle);
        }
    };

    // Debounced auto-save
    const debouncedSave = useCallback((editor: Editor, currentTitle: string, immediate = false) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        const runSave = async () => {
            const content = editor.getJSON();
            const contentStr = JSON.stringify(content);

            if (contentStr !== lastSavedContentRef.current || currentTitle !== lastSavedTitleRef.current) {
                setIsSaving(true);
                try {
                    await onSave(content, currentTitle);
                    lastSavedContentRef.current = contentStr;
                    lastSavedTitleRef.current = currentTitle;
                    setHasChanges(false);
                } catch (error) {
                    console.error('Auto-save failed:', error);
                } finally {
                    setIsSaving(false);
                }
            }
        };

        if (immediate) {
            runSave();
        } else {
            saveTimeoutRef.current = setTimeout(runSave, autoSaveDelay);
        }
    }, [onSave, autoSaveDelay]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Update initial content/title refs
    useEffect(() => {
        if (initialContent) {
            lastSavedContentRef.current = JSON.stringify(initialContent);
        }
        if (initialTitle !== undefined) {
            setTitle(initialTitle);
            lastSavedTitleRef.current = initialTitle;
        }
    }, [initialContent, initialTitle]);

    // Set link handler
    const setLink = useCallback(() => {
        if (!editor) return;

        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        if (url === null) return;

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    // Keyboard shortcut handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (readOnly) return;

        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        const isAlt = e.altKey;

        // Save: Ctrl + S
        if (isCtrl && e.key === 's') {
            e.preventDefault();
            if (editor) debouncedSave(editor, titleRef.current, true);
        }

        // Fullscreen: Ctrl + F
        if (isCtrl && e.key === 'f') {
            e.preventDefault();
            if (onToggleFullscreen) onToggleFullscreen();
        }

        // Shortcut Guide: Ctrl + /
        if (isCtrl && e.key === '/') {
            e.preventDefault();
            setGuideOpen(prev => !prev);
        }

        // Strikethrough: Ctrl + Shift + X
        if (isCtrl && isShift && e.key.toLowerCase() === 'x') {
            e.preventDefault();
            editor?.chain().focus().toggleStrike().run();
        }

        // Bullet List: Ctrl + Shift + 8
        if (isCtrl && isShift && e.key === '8') {
            e.preventDefault();
            editor?.chain().focus().toggleBulletList().run();
        }

        // Numbered List: Ctrl + Shift + 7
        if (isCtrl && isShift && e.key === '7') {
            e.preventDefault();
            editor?.chain().focus().toggleOrderedList().run();
        }

        // Blockquote: Ctrl + Q
        if (isCtrl && e.key.toLowerCase() === 'q') {
            e.preventDefault();
            editor?.chain().focus().toggleBlockquote().run();
        }

        // Headings: Ctrl + Alt + 1/2/3
        if (isCtrl && isAlt && ['1', '2', '3'].includes(e.key)) {
            e.preventDefault();
            editor?.chain().focus().toggleHeading({ level: parseInt(e.key) as any }).run();
        }

        // Exit Fullscreen: Esc
        if (e.key === 'Escape' && fullscreen && onToggleFullscreen) {
            e.preventDefault();
            onToggleFullscreen();
        }
    }, [editor, title, debouncedSave, onToggleFullscreen, fullscreen, readOnly]);

    if (!editor) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    return (
        <Box
            onKeyDown={handleKeyDown}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                bgcolor: 'background.paper',
                borderRadius: fullscreen ? 0 : '16px',
                overflow: 'hidden',
                transition: 'border-radius 0.3s ease',
            }}
        >
            {/* Title Block */}
            <Box sx={{ px: 3, pt: 3, pb: 1 }}>
                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Note Title"
                    readOnly={readOnly}
                    style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        backgroundColor: 'transparent',
                        color: 'inherit',
                        fontFamily: 'inherit',
                    }}
                />
            </Box>
            {/* Toolbar */}
            {!readOnly && (
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
                    <Tooltip title="Bold (Ctrl+B)">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            sx={getButtonStyle(editor.isActive('bold'))}
                        >
                            <FormatBold fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Italic (Ctrl+I)">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            sx={getButtonStyle(editor.isActive('italic'))}
                        >
                            <FormatItalic fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Strikethrough (Ctrl+Shift+X)">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            sx={getButtonStyle(editor.isActive('strike'))}
                        >
                            <FormatStrikethrough fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Code">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            sx={getButtonStyle(editor.isActive('code'))}
                        >
                            <Code fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                    <Tooltip title="Bullet List (Ctrl+Shift+8)">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            sx={getButtonStyle(editor.isActive('bulletList'))}
                        >
                            <FormatListBulleted fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Numbered List (Ctrl+Shift+7)">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            sx={getButtonStyle(editor.isActive('orderedList'))}
                        >
                            <FormatListNumbered fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Quote (Ctrl+Q)">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            sx={getButtonStyle(editor.isActive('blockquote'))}
                        >
                            <FormatQuote fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Horizontal Rule">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().setHorizontalRule().run()}
                            sx={getButtonStyle(false)}
                        >
                            <HorizontalRule fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                    <Tooltip title="Add Link">
                        <IconButton
                            size="small"
                            onClick={setLink}
                            sx={getButtonStyle(editor.isActive('link'))}
                        >
                            <LinkIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

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
                                onClick={() => setGuideOpen(true)}
                                sx={{
                                    ...getButtonStyle(guideOpen),
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
            )}

            {/* Editor Content */}
            <Box sx={{
                flex: 1,
                overflow: 'auto',
                p: 2,
                '& .aegis-editor-content': {
                    outline: 'none',
                    minHeight: '100%',
                    '& > *:first-of-type': {
                        marginTop: 0,
                    },
                    '& h1': {
                        fontSize: '2rem',
                        fontWeight: 600,
                        mb: 2,
                    },
                    '& h2': {
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        mb: 1.5,
                    },
                    '& h3': {
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        mb: 1,
                    },
                    '& p': {
                        mb: 1,
                        lineHeight: 1.7,
                    },
                    '& ul, & ol': {
                        pl: 3,
                        mb: 1,
                    },
                    '& blockquote': {
                        borderLeft: 3,
                        borderColor: 'primary.main',
                        pl: 2,
                        ml: 0,
                        fontStyle: 'italic',
                        color: 'text.secondary',
                    },
                    '& code': {
                        bgcolor: 'action.hover',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontFamily: 'monospace',
                    },
                    '& pre': {
                        bgcolor: 'action.hover',
                        p: 2,
                        borderRadius: 1,
                        overflow: 'auto',
                        '& code': {
                            bgcolor: 'transparent',
                            p: 0,
                        },
                    },
                    '& hr': {
                        border: 'none',
                        borderTop: 1,
                        borderColor: 'divider',
                        my: 2,
                    },
                    '& .aegis-link': {
                        color: 'primary.main',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                    },
                    '& .is-editor-empty:first-of-type::before': {
                        content: 'attr(data-placeholder)',
                        float: 'left',
                        color: 'text.disabled',
                        pointerEvents: 'none',
                        height: 0,
                    },
                    maxWidth: fullscreen ? '800px' : 'none',
                    mx: fullscreen ? 'auto' : 'none',
                    pb: fullscreen ? 10 : 2,
                },
            }}>
                <EditorContent editor={editor} />
            </Box>

            <ShortcutGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
        </Box>
    );
};

export default AegisEditor;
