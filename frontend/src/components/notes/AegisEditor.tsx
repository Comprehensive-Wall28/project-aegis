import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ImageResize from 'tiptap-extension-resize-image';
import { useCallback, useEffect, useState, useRef } from 'react';
import { SearchExtension } from './SearchExtension';
import { SecureImage } from './SecureImageExtension';
import noteMediaService from '../../services/noteMediaService';
import { blobCache } from '../../lib/blobCache';
import { generateDEK, wrapKey, bytesToHex } from '../../lib/cryptoUtils';
import { useSessionStore } from '../../stores/sessionStore';
import {
    Box,
    CircularProgress,
    useTheme,
    alpha,
} from '@mui/material';
import { ShortcutGuide } from './ShortcutGuide';
import { EditorToolbar } from './EditorToolbar';
import { LinkDialog } from './LinkDialog';
import type { JSONContent, Editor } from '@tiptap/react';
import { motion, AnimatePresence } from 'framer-motion';

interface AegisEditorProps {
    initialTitle?: string;
    initialContent?: JSONContent;
    onSave: (content: JSONContent, title: string) => Promise<void>;
    readOnly?: boolean;
    autoSaveDelay?: number;
    onToggleFullscreen?: () => void;
    fullscreen?: boolean;
    compact?: boolean;
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
    compact = false,
}) => {
    const theme = useTheme();
    const [title, setTitle] = useState(initialTitle);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showReplace, setShowReplace] = useState(false);
    const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);
    const titleRef = useRef(title);

    // Keep titleRef in sync with title state
    useEffect(() => {
        titleRef.current = title;
    }, [title]);


    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDirtyRef = useRef(false);

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
            SearchExtension,
            SecureImage,
            ImageResize.configure({
                allowBase64: false, // Disallow Base64 to save memory/space
                HTMLAttributes: {
                    class: 'aegis-editor-image',
                },
            }),
        ],
        content: initialContent,
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: 'aegis-editor-content',
                spellcheck: spellcheckEnabled ? 'true' : 'false',
            },
            handlePaste: (view, event) => {
                const { clipboardData } = event;
                const items = Array.from(clipboardData?.items || []);
                const imageItem = items.find(item => item.type.startsWith('image/'));

                if (imageItem) {
                    event.preventDefault();
                    const file = imageItem.getAsFile();
                    if (!file) return false;

                    // Manual Upload & Encryption Logic to get fileId
                    (async () => {
                        try {
                            const { user, vaultCtrKey, setCryptoStatus } = useSessionStore.getState();
                            const masterKey = user?.vaultKey;

                            if (!vaultCtrKey || !masterKey) {
                                throw new Error('Vault keys not ready');
                            }

                            setCryptoStatus('encrypting');

                            // 1. Generate DEK and wrap
                            const dek = await generateDEK();
                            const encryptedDEK = await wrapKey(dek, masterKey);

                            // 2. Encrypt filename
                            const nameIv = window.crypto.getRandomValues(new Uint8Array(16));
                            const nameEnc = await window.crypto.subtle.encrypt(
                                { name: 'AES-CTR', counter: nameIv, length: 64 },
                                vaultCtrKey,
                                new TextEncoder().encode(file.name || 'note-image.png')
                            );
                            const encryptedFileName = bytesToHex(nameIv) + ':' + bytesToHex(new Uint8Array(nameEnc));

                            // 3. Encrypt file content (single chunk for simplicity in notes)
                            const arrayBuffer = await file.arrayBuffer();
                            const iv = window.crypto.getRandomValues(new Uint8Array(16));
                            const encrypted = await window.crypto.subtle.encrypt(
                                { name: 'AES-CTR', counter: iv, length: 64 },
                                dek,
                                arrayBuffer
                            );

                            // Combine IV + Ciphertext
                            const finalEncryptedBuffer = new Uint8Array(iv.length + encrypted.byteLength);
                            finalEncryptedBuffer.set(iv);
                            finalEncryptedBuffer.set(new Uint8Array(encrypted), iv.length);

                            // 4. Init Upload (to Note Media service, stored in GridFS)
                            const initResponse = await noteMediaService.initUpload({
                                fileName: encryptedFileName,
                                originalFileName: file.name || 'note-image.png',
                                fileSize: finalEncryptedBuffer.byteLength,
                                encryptedSymmetricKey: encryptedDEK,
                                encapsulatedKey: 'AES-KW',
                                mimeType: file.type || 'image/png',
                            });

                            const { mediaId } = initResponse;

                            // 5. Upload Chunk (Single)
                            await noteMediaService.uploadChunk(mediaId, finalEncryptedBuffer, 0, finalEncryptedBuffer.byteLength);

                            // 6. Cache the local blob URL for instant rendering
                            const localUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }));
                            blobCache.set(mediaId, localUrl);

                            // 7. Insert Secure Image Node with mediaId
                            if (view.state) {
                                view.dispatch(
                                    view.state.tr.replaceSelectionWith(
                                        view.state.schema.nodes.secureImage.create({ mediaId })
                                    )
                                );
                            }
                        } catch (err) {
                            console.error('Failed to upload note image:', err);
                        } finally {
                            useSessionStore.getState().setCryptoStatus('idle');
                        }
                    })();

                    return true;
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            isDirtyRef.current = true;
            setHasChanges(true);
            debouncedSave(editor, titleRef.current);
        },
        // Removed onTransaction render force, handled in EditorToolbar
    });

    // Update editor spellcheck attribute dynamically
    useEffect(() => {
        if (editor) {
            editor.setOptions({
                editorProps: {
                    attributes: {
                        ...editor.options.editorProps.attributes,
                        spellcheck: spellcheckEnabled ? 'true' : 'false',
                    },
                },
            });
        }
    }, [editor, spellcheckEnabled]);

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
            if (!isDirtyRef.current && currentTitle === titleRef.current) {
                return;
            }

            const content = editor.getJSON();
            setIsSaving(true);
            try {
                await onSave(content, currentTitle);
                isDirtyRef.current = false;
                setHasChanges(false);
            } catch (error) {
                console.error('Auto-save failed:', error);
            } finally {
                setIsSaving(false);
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
        if (initialTitle !== undefined) {
            setTitle(initialTitle);
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
                action: () => setShowSearch(prev => !prev)
            },
            {
                check: () => isCtrl && key === 'h',
                action: () => {
                    setShowSearch(true);
                    setShowReplace(prev => !prev);
                }
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
            <AnimatePresence initial={false}>
                {!compact && (
                    <Box
                        component={motion.div}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        sx={{ overflow: 'hidden' }}
                    >
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
                    </Box>
                )}
            </AnimatePresence>

            {/* Toolbar */}
            <AnimatePresence initial={false}>
                {!readOnly && !compact && (
                    <Box
                        component={motion.div}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        sx={{ overflow: 'hidden' }}
                    >
                        <EditorToolbar
                            editor={editor}
                            onAddLink={openLinkDialog}
                            isSaving={isSaving}
                            hasChanges={hasChanges}
                            guideOpen={guideOpen}
                            onToggleGuide={() => setGuideOpen(o => !o)}
                            showSearch={showSearch}
                            onToggleSearch={() => {
                                setShowSearch(o => !o);
                                if (showSearch) setShowReplace(false);
                            }}
                            showReplace={showReplace}
                            onToggleReplace={() => setShowReplace(o => !o)}
                            spellcheckEnabled={spellcheckEnabled}
                            onToggleSpellcheck={() => setSpellcheckEnabled(s => !s)}
                        />
                    </Box>
                )}
            </AnimatePresence>

            {/* Editor Content */}
            <Box
                onClick={() => editor.commands.focus()}
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    p: 2,
                    cursor: 'text',
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
                            pl: 4,
                            mb: 1,
                            '& li': {
                                mb: 0.5,
                            },
                        },
                        '& ul': {
                            listStyleType: 'disc',
                        },
                        '& ol': {
                            listStyleType: 'decimal',
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
                        '& img': {
                            maxWidth: '100%',
                            height: 'auto',
                            borderRadius: '12px',
                            my: 2,
                            display: 'block',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        },
                        pb: fullscreen ? 10 : 2,
                    },
                }}>
                <EditorContent editor={editor} />
            </Box>

            <style>
                {`
                .search-result {
                    background-color: rgba(255, 235, 59, 0.3);
                    border-bottom: 2px solid rgba(255, 235, 59, 0.5);
                    border-radius: 2px;
                    transition: all 0.2s ease;
                }
                .search-result-current {
                    background-color: rgba(255, 152, 0, 0.5);
                    border-bottom: 2px solid rgba(255, 152, 0, 0.8);
                    box-shadow: 0 0 8px rgba(255, 152, 0, 0.3);
                }

                /* Image Resize Extension Polishing */
                .aegis-editor-image + div, 
                div[style*="position: relative"][style*="dashed"] {
                    border: 2px dashed ${theme.palette.primary.main} !important;
                    border-radius: 12px;
                }

                /* Resize Handles (Dots) */
                div[style*="position: absolute"][style*="border-radius: 50%"] {
                    background-color: ${theme.palette.primary.main} !important;
                    border: 2px solid ${theme.palette.background.paper} !important;
                    width: 12px !important;
                    height: 12px !important;
                    box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
                    z-index: 1001 !important;
                }

                /* Alignment Controller (Toolbar) */
                div[style*="position: absolute"][style*="translate(-50%, -50%)"] {
                    background-color: ${theme.palette.background.paper} !important;
                    border: 1px solid ${alpha(theme.palette.divider, 0.1)} !important;
                    border-radius: 30px !important;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
                    padding: 4px 12px !important;
                    height: 36px !important;
                    width: auto !important;
                    min-width: 100px;
                    backdrop-filter: blur(8px);
                }

                /* Alignment Icons */
                div[style*="translate(-50%, -50%)"] img {
                    filter: invert(1) brightness(2) !important;
                    width: 20px !important;
                    height: 20px !important;
                    margin: 0 4px !important;
                    opacity: 0.8 !important;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                }

                div[style*="translate(-50%, -50%)"] img:hover {
                    opacity: 1 !important;
                    transform: scale(1.1);
                }
                `}
            </style>

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
