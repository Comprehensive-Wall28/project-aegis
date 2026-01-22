import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useState, useRef } from 'react';
import {
    Box,
    CircularProgress,
} from '@mui/material';
import { ShortcutGuide } from './ShortcutGuide';
import { EditorToolbar } from './EditorToolbar';
import { LinkDialog } from './LinkDialog';
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
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');
    // const theme = useTheme(); // Removed unused theme
    const titleRef = useRef(title);

    // Keep titleRef in sync with title state
    useEffect(() => {
        titleRef.current = title;
    }, [title]);

    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContentRef = useRef<string>('');
    const lastSavedTitleRef = useRef<string>(initialTitle);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                // @ts-ignore
                link: {
                    openOnClick: false,
                    HTMLAttributes: {
                        class: 'aegis-editor-link',
                    },
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
        // Removed onTransaction render force, handled in EditorToolbar
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
    const openLinkDialog = useCallback(() => {
        if (!editor) return;

        const previousUrl = editor.getAttributes('link').href || '';
        setLinkUrl(previousUrl);

        // Get selected text for the display field
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to);
        setLinkText(selectedText || previousUrl || '');

        setLinkDialogOpen(true);
    }, [editor]);

    const handleLinkConfirm = useCallback((url: string, text: string) => {
        if (!editor) return;

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            // Ensure there is a protocol
            const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;

            const { from, to } = editor.state.selection;
            const hasSelection = from !== to;

            if (!hasSelection) {
                // No selection: Insert the display text (or URL) and link it
                const displayText = text || url;
                editor.chain().focus().insertContent(`<a href="${finalUrl}">${displayText}</a> `).run();
            } else {
                // Has selection: If linkText was changed, we might want to replace selection, 
                // but Tiptap's setLink usually applies to the existing selection.
                const selectedText = editor.state.doc.textBetween(from, to);
                if (text && text !== selectedText) {
                    editor.chain().focus().insertContent(`<a href="${finalUrl}">${text}</a>`).run();
                } else {
                    editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
                }
            }
        }
        setLinkDialogOpen(false);
    }, [editor]);

    // Keyboard shortcut handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (readOnly) return;

        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        const isAlt = e.altKey;
        const key = e.key.toLowerCase();

        const shortcuts = [
            {
                check: () => isCtrl && key === 's',
                action: () => editor && debouncedSave(editor, titleRef.current, true)
            },
            {
                check: () => isCtrl && key === 'f',
                action: () => onToggleFullscreen && onToggleFullscreen()
            },
            {
                check: () => isCtrl && key === '/',
                action: () => setGuideOpen(prev => !prev)
            },
            {
                check: () => isCtrl && isShift && key === 'x',
                action: () => editor?.chain().focus().toggleStrike().run()
            },
            {
                check: () => isCtrl && isShift && key === '8',
                action: () => editor?.chain().focus().toggleBulletList().run()
            },
            {
                check: () => isCtrl && isShift && key === '7',
                action: () => editor?.chain().focus().toggleOrderedList().run()
            },
            {
                check: () => isCtrl && key === 'q',
                action: () => editor?.chain().focus().toggleBlockquote().run()
            },
            {
                check: () => isCtrl && isAlt && ['1', '2', '3'].includes(key),
                action: () => editor?.chain().focus().toggleHeading({ level: parseInt(key) as any }).run()
            },
            {
                check: () => key === 'escape' && fullscreen && onToggleFullscreen,
                action: () => onToggleFullscreen && onToggleFullscreen()
            }
        ];

        for (const shortcut of shortcuts) {
            if (shortcut.check()) {
                e.preventDefault();
                shortcut.action();
                return;
            }
        }
    }, [editor, debouncedSave, onToggleFullscreen, fullscreen, readOnly]);

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
                <EditorToolbar
                    editor={editor}
                    onAddLink={openLinkDialog}
                    isSaving={isSaving}
                    hasChanges={hasChanges}
                    fullscreen={fullscreen}
                    onToggleFullscreen={onToggleFullscreen}
                    guideOpen={guideOpen}
                    onToggleGuide={() => setGuideOpen(o => !o)}
                />
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
                    '& a': {
                        color: 'primary.main',
                        textDecoration: 'underline',
                        textDecorationThickness: '1px',
                        textUnderlineOffset: '2px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'opacity 0.2s',
                        '&:hover': {
                            opacity: 0.8,
                        },
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

            {/* Link Dialog */}
            <LinkDialog
                open={linkDialogOpen}
                onClose={() => setLinkDialogOpen(false)}
                initialUrl={linkUrl}
                initialText={linkText}
                onConfirm={handleLinkConfirm}
            />

            <ShortcutGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
        </Box>
    );
};

export default AegisEditor;
