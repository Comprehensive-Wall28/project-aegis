import { useState, useEffect } from 'react';
import { FileIcon, Download, Loader2, FolderOpen, ShieldCheck, Trash2, Upload, CheckSquare, Square, XSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import vaultService, { type FileMetadata } from '@/services/vaultService';
import { motion, AnimatePresence } from 'framer-motion';
import UploadZone from '@/components/vault/UploadZone';
import { useVaultDownload } from '@/hooks/useVaultDownload';

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function truncateFileName(name: string, maxLength: number = 32): string {
    if (!name) return 'Unknown File';
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop() || '';
    const baseName = name.slice(0, name.length - ext.length - 1);
    const truncatedBase = baseName.slice(0, maxLength - ext.length - 4) + '...';
    return `${truncatedBase}.${ext}`;
}

export function FilesPage() {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showUpload, setShowUpload] = useState(false);
    const { downloadAndDecrypt } = useVaultDownload();

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            setIsLoading(true);
            const data = await vaultService.getRecentFiles();
            setFiles(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch files:', err);
            setError('Failed to load files');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (file: FileMetadata) => {
        try {
            setDownloadingId(file._id);

            const decryptedBlob = await downloadAndDecrypt(file);

            if (!decryptedBlob) {
                console.error('Decryption failed');
                return;
            }

            const url = window.URL.createObjectURL(decryptedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.originalFileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            setDeletingIds(prev => new Set(prev).add(fileId));
            await vaultService.deleteFile(fileId);
            setFiles(files.filter(f => f._id !== fileId));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
            });
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
            });
        }
    };

    const handleMassDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} file(s)? This cannot be undone.`)) return;

        const idsToDelete = Array.from(selectedIds);

        for (const id of idsToDelete) {
            try {
                setDeletingIds(prev => new Set(prev).add(id));
                await vaultService.deleteFile(id);
                setFiles(prev => prev.filter(f => f._id !== id));
            } catch (err) {
                console.error(`Failed to delete ${id}:`, err);
            } finally {
                setDeletingIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        }
        setSelectedIds(new Set());
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === files.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(files.map(f => f._id)));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <FolderOpen className="h-7 w-7 text-primary" />
                        Encrypted Files
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {files.length} file{files.length !== 1 ? 's' : ''} in your vault
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleMassDelete}
                            className="gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete ({selectedIds.size})
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUpload(!showUpload)}
                        className="gap-2"
                    >
                        <Upload className="h-4 w-4" />
                        Upload
                    </Button>
                </div>
            </div>

            {/* Upload Section */}
            <AnimatePresence>
                {showUpload && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bento-card p-6">
                            <UploadZone onUploadComplete={() => {
                                fetchFiles();
                                setShowUpload(false);
                            }} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Selection Actions */}
            {files.length > 0 && (
                <div className="flex items-center gap-4 text-sm">
                    <button
                        onClick={selectAll}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {selectedIds.size === files.length ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                        ) : selectedIds.size > 0 ? (
                            <XSquare className="h-4 w-4" />
                        ) : (
                            <Square className="h-4 w-4" />
                        )}
                        {selectedIds.size === files.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            )}

            {/* Files Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                </div>
            ) : error && files.length === 0 ? (
                <div className="bento-card p-12 text-center">
                    <p className="text-muted-foreground">{error}</p>
                    <Button variant="ghost" size="sm" onClick={fetchFiles} className="mt-4">
                        Retry
                    </Button>
                </div>
            ) : files.length === 0 ? (
                <div className="bento-card p-12 text-center">
                    <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg text-muted-foreground">No files in vault yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Upload your first encrypted file</p>
                    <Button
                        variant="outline"
                        className="mt-6"
                        onClick={() => setShowUpload(true)}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {files.map((file, index) => (
                        <motion.div
                            key={file._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`
                                bento-card p-4 relative group cursor-pointer transition-all
                                ${selectedIds.has(file._id) ? 'ring-2 ring-primary bg-primary/5' : ''}
                            `}
                            onClick={() => toggleSelect(file._id)}
                        >
                            {/* Selection Indicator */}
                            <div className="absolute top-3 left-3">
                                {selectedIds.has(file._id) ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                ) : (
                                    <Square className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </div>

                            {/* File Icon & Badge */}
                            <div className="flex flex-col items-center pt-6 pb-4">
                                <div className="relative mb-3">
                                    <div className="p-4 rounded-xl bg-primary/10">
                                        <FileIcon className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-background">
                                        <ShieldCheck className="h-4 w-4 text-cyan-400" />
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono-tech text-cyan-400">
                                    ML-KEM
                                </span>
                            </div>

                            {/* File Info */}
                            <div className="text-center mb-4">
                                <p className="text-sm font-medium text-foreground truncate px-2" title={file.originalFileName}>
                                    {truncateFileName(file.originalFileName)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatFileSize(file.fileSize)} • {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 justify-center" onClick={e => e.stopPropagation()}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary hover:text-primary hover:bg-primary/10"
                                    onClick={() => handleDownload(file)}
                                    disabled={downloadingId === file._id}
                                >
                                    {downloadingId === file._id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4 mr-1" />
                                            Decrypt
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    onClick={() => handleDelete(file._id)}
                                    disabled={deletingIds.has(file._id)}
                                >
                                    {deletingIds.has(file._id) ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
