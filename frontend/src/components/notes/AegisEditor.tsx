import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Box, IconButton, Tooltip, Divider, CircularProgress } from '@mui/material';
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
} from '@mui/icons-material';
import type { JSONContent, Editor } from '@tiptap/react';

interface AegisEditorProps {
    initialContent?: JSONContent;
    onSave: (content: JSONContent) => Promise<void>;
    readOnly?: boolean;
    autoSaveDelay?: number;
}

/**
 * TipTap-based rich text editor for Aegis Notes
 */
const AegisEditor: React.FC<AegisEditorProps> = ({
    initialContent,
    onSave,
    readOnly = false,
    autoSaveDelay = 1500,
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContentRef = useRef<string>('');

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
                debouncedSave(editor);
            }
        },
    });

    // Debounced auto-save
    const debouncedSave = useCallback((editor: Editor) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            const content = editor.getJSON();
            const contentStr = JSON.stringify(content);

            if (contentStr !== lastSavedContentRef.current) {
                setIsSaving(true);
                try {
                    await onSave(content);
                    lastSavedContentRef.current = contentStr;
                    setHasChanges(false);
                } catch (error) {
                    console.error('Auto-save failed:', error);
                } finally {
                    setIsSaving(false);
                }
            }
        }, autoSaveDelay);
    }, [onSave, autoSaveDelay]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Update initial content ref
    useEffect(() => {
        if (initialContent) {
            lastSavedContentRef.current = JSON.stringify(initialContent);
        }
    }, [initialContent]);

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

    if (!editor) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            bgcolor: 'background.paper',
            borderRadius: '16px',
            overflow: 'hidden',
        }}>
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
                            color={editor.isActive('bold') ? 'primary' : 'default'}
                        >
                            <FormatBold fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Italic (Ctrl+I)">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            color={editor.isActive('italic') ? 'primary' : 'default'}
                        >
                            <FormatItalic fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Strikethrough">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            color={editor.isActive('strike') ? 'primary' : 'default'}
                        >
                            <FormatStrikethrough fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Code">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            color={editor.isActive('code') ? 'primary' : 'default'}
                        >
                            <Code fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                    <Tooltip title="Bullet List">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            color={editor.isActive('bulletList') ? 'primary' : 'default'}
                        >
                            <FormatListBulleted fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Numbered List">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            color={editor.isActive('orderedList') ? 'primary' : 'default'}
                        >
                            <FormatListNumbered fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Quote">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            color={editor.isActive('blockquote') ? 'primary' : 'default'}
                        >
                            <FormatQuote fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Horizontal Rule">
                        <IconButton
                            size="small"
                            onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        >
                            <HorizontalRule fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                    <Tooltip title="Add Link">
                        <IconButton
                            size="small"
                            onClick={setLink}
                            color={editor.isActive('link') ? 'primary' : 'default'}
                        >
                            <LinkIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {editor.isActive('link') && (
                        <Tooltip title="Remove Link">
                            <IconButton
                                size="small"
                                onClick={() => editor.chain().focus().unsetLink().run()}
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
                            >
                                <Redo fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    {/* Save indicator */}
                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isSaving && <CircularProgress size={16} />}
                        {hasChanges && !isSaving && (
                            <Box sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'warning.main',
                            }} />
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
                },
            }}>
                <EditorContent editor={editor} />
            </Box>
        </Box>
    );
};

export default AegisEditor;
