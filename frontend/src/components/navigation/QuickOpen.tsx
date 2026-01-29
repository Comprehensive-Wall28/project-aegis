import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import {
    FileText,
    StickyNote,
    LayoutDashboard,
    Calendar,
    Settings,
    Users,
    Search,
    FolderOpen,
    GraduationCap,
    ListTodo
} from "lucide-react";

import noteService, { type NoteMetadata } from "@/services/noteService";
import vaultService, { type FileMetadata } from "@/services/vaultService";
import Fuse from "fuse.js";
import { debounce } from "@/lib/utils";

// Page Routes
const PAGES = [
    { id: "dashboard", title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { id: "files", title: "Files", path: "/dashboard/files", icon: FolderOpen },
    { id: "notes", title: "Notes", path: "/dashboard/notes", icon: StickyNote },
    { id: "tasks", title: "Tasks", path: "/dashboard/tasks", icon: ListTodo },
    { id: "calendar", title: "Calendar", path: "/dashboard/calendar", icon: Calendar },
    { id: "gpa", title: "GPA & Grades", path: "/dashboard/gpa", icon: GraduationCap },
    { id: "social", title: "Social Rooms", path: "/dashboard/social", icon: Users },
    { id: "settings", title: "Settings", path: "/dashboard/security", icon: Settings },
];

export function QuickOpen() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const navigate = useNavigate();
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Data State
    const [foundNotes, setFoundNotes] = useState<NoteMetadata[]>([]);
    const [foundFiles, setFoundFiles] = useState<FileMetadata[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);

    // --- Keyboard Shortcut & Event Listener ---
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (
                ((e.key === " " || e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) ||
                (e.key === "/" && (e.metaKey || e.ctrlKey))
            ) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        const toggleHandler = () => setOpen((open) => !open);

        // Use capture phase to prevent browser/OS interference where possible
        document.addEventListener("keydown", down, { capture: true });
        window.addEventListener("aegis:quick-open-toggle", toggleHandler);

        return () => {
            document.removeEventListener("keydown", down, { capture: true });
            window.removeEventListener("aegis:quick-open-toggle", toggleHandler);
        };
    }, []);

    // --- Clear State on Open ---
    useEffect(() => {
        if (open) {
            setSearch("");
            setFoundFiles([]);
            setFoundNotes([]);
            // customized auto-focus since we are not using Command.Dialog
            setTimeout(() => {
                inputRef.current?.focus();
            }, 10);

            // Explicitly handle Escape key to close since we are using Portal + Command primitive
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    setOpen(false);
                }
            };
            document.addEventListener("keydown", handleEsc);
            return () => document.removeEventListener("keydown", handleEsc);
        }
    }, [open]);

    // --- Search Logic: Pages ---
    const filteredPages = useMemo(() => {
        if (!search) return PAGES;
        const fuse = new Fuse(PAGES, { keys: ["title"], threshold: 0.4 });
        return fuse.search(search).map((r) => r.item);
    }, [search]);

    // --- Search Logic: Notes (Client-side from service cache or fresh fetch) ---
    // We fetch a lightweight list when the modal opens if not already available
    // But for speed, we'll just search on-demand if we have data, or rely on the hook if mounted
    const [allNotes, setAllNotes] = useState<NoteMetadata[]>([]);

    useEffect(() => {
        if (open) {
            noteService.getNotes().then(notes => {
                setAllNotes(notes);
            }).catch(err => console.error("QuickOpen: Failed to load notes", err));
        }
    }, [open]);

    useEffect(() => {
        if (!search) {
            setFoundNotes([]);
            return;
        }
        const fuse = new Fuse(allNotes, {
            keys: ["tags"], // We can't search encrypted titles easily without the decryption key manager here
            threshold: 0.4
        });
        setFoundNotes(fuse.search(search).map(r => r.item).slice(0, 5));

    }, [search, allNotes]);

    // --- Search Logic: Files (Server-side) ---
    // Debounced search
    const searchFiles = useCallback(
        debounce(async (query: string) => {
            if (!query || query.length < 2) {
                setFoundFiles([]);
                setLoadingFiles(false);
                return;
            }
            setLoadingFiles(true);
            try {
                const res = await vaultService.getFilesPaginated({
                    limit: 5,
                    search: query,
                });
                setFoundFiles(res.items);
            } catch (err) {
                console.error("QuickOpen: Failed to search files", err);
            } finally {
                setLoadingFiles(false);
            }
        }, 300),
        []
    );

    useEffect(() => {
        searchFiles(search);
        return () => searchFiles.cancel();
    }, [search, searchFiles]);

    // --- Actions ---
    const handleSelectPage = (path: string) => {
        navigate(path);
        setOpen(false);
    };

    const handleSelectNote = (noteId: string) => {
        navigate(`/dashboard/notes?n=${noteId}`);
        setOpen(false);
    };

    const handleSelectFile = async (file: FileMetadata) => {
        if (file.folderId) {
            navigate(`/dashboard/files/${file.folderId}?preview=${file._id}`);
        } else {
            navigate(`/dashboard/files?preview=${file._id}`);
        }
        setOpen(false);
    };

    if (!open) return null;

    // Use portal to render outside the DashboardLayout stacking context
    // This ensures fixed position works correctly relative to viewport
    return createPortal(
        <div className="cmd-overlay" onClick={() => setOpen(false)}>
            <div className="cmd-dialog" onClick={(e) => e.stopPropagation()}>
                <Command
                    label="Quick Open"
                    className="cmd-wrapper"
                    shouldFilter={false} // We handle filtering manually
                >
                    <div className="cmd-header">
                        <Search className="w-5 h-5 text-gray-500 mr-3" />
                        <Command.Input
                            ref={inputRef}
                            value={search}
                            onValueChange={setSearch}
                            placeholder="Where to? Type to search pages, files, or notes..."
                            className="cmd-input"
                        />
                        <div className="flex items-center gap-2">
                            <kbd className="cmd-kbd">ESC</kbd>
                        </div>
                    </div>

                    <Command.List ref={listRef} className="cmd-list">
                        <Command.Empty>No results found.</Command.Empty>

                        {/* Pages Group */}
                        {filteredPages.length > 0 && (
                            <Command.Group heading="Pages">
                                {filteredPages.map((page) => (
                                    <Command.Item
                                        key={page.id}
                                        onSelect={() => handleSelectPage(page.path)}
                                        className="cmd-item"
                                    >
                                        <page.icon className="w-4 h-4 mr-2 opacity-70" />
                                        {page.title}
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Notes Group */}
                        {foundNotes.length > 0 && (
                            <Command.Group heading="Notes">
                                {foundNotes.map((note) => (
                                    <Command.Item
                                        key={note._id}
                                        onSelect={() => handleSelectNote(note._id)}
                                        className="cmd-item"
                                    >
                                        <StickyNote className="w-4 h-4 mr-2 opacity-70" />
                                        <span className="truncate flex-1">
                                            {/* We display tags or ID since title might be encrypted locally without heavy context */}
                                            Note {note._id.slice(-4)}
                                            {note.tags.length > 0 && <span className="ml-2 opacity-50 text-xs">({note.tags.join(", ")})</span>}
                                        </span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Files Group */}
                        {(foundFiles.length > 0 || loadingFiles) && (
                            <Command.Group heading="Files">
                                {loadingFiles && foundFiles.length === 0 ? (
                                    <Command.Loading>Searching files...</Command.Loading>
                                ) : (
                                    foundFiles.map((file) => (
                                        <Command.Item
                                            key={file._id}
                                            onSelect={() => handleSelectFile(file)}
                                            className="cmd-item"
                                        >
                                            <FileText className="w-4 h-4 mr-2 opacity-70" />
                                            <span className="truncate">{file.originalFileName}</span>
                                        </Command.Item>
                                    ))
                                )}
                            </Command.Group>
                        )}

                    </Command.List>

                    <div className="cmd-footer">
                        <span className="cmd-footer-text">
                            ProTip: Use <kbd className="cmd-kbd-small">↑</kbd> <kbd className="cmd-kbd-small">↓</kbd> to navigate, <kbd className="cmd-kbd-small">↵</kbd> to select
                        </span>
                    </div>
                </Command>
            </div>
        </div>,
        document.body
    );
}
