import { useState, useEffect } from 'react';
import { FileIcon, Download, Loader2, FolderOpen, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import vaultService, { type FileMetadata } from '@/services/vaultService';
import { motion } from 'framer-motion';

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function truncateFileName(name: string, maxLength: number = 24): string {
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop() || '';
    const baseName = name.slice(0, name.length - ext.length - 1);
    const truncatedBase = baseName.slice(0, maxLength - ext.length - 4) + '...';
    return `${truncatedBase}.${ext}`;
}

export function VaultQuickView() {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            setIsLoading(true);
            const data = await vaultService.getRecentFiles();
            setFiles(data.slice(0, 5));
            setError(null);
        } catch (err) {
            console.error('Failed to fetch files:', err);
            setError('Failed to load files');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (fileId: string, fileName: string) => {
        try {
            setDownloadingId(fileId);
            const blob = await vaultService.downloadFile(fileId);

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
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


    return (
        <div className="bento-card h-full p-6 flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        Vault Quick-View
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Your recent encrypted files</p>
                </div>
                <div className="text-xs font-mono-tech text-cyan-400/70">
                    {files.length} files
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                ) : error && files.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>{error}</p>
                        <Button variant="ghost" size="sm" onClick={fetchFiles} className="mt-2">
                            Retry
                        </Button>
                    </div>
                ) : files.length === 0 ? (
                    <div className="text-center py-12">
                        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">No files in vault yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Upload your first encrypted file</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <motion.div
                                key={file._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/5 transition-all group"
                            >
                                {/* Left: Icon + Name + Size */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="relative flex-shrink-0">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <FileIcon className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 p-0.5 rounded bg-background">
                                            <ShieldCheck className="h-3 w-3 text-cyan-400 animate-quantum-pulse" />
                                        </div>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground truncate" title={file.fileName}>
                                            {truncateFileName(file.fileName)}
                                        </p>
                                        <p className="text-xs font-mono-tech text-text-secondary">
                                            {formatFileSize(file.fileSize)} • {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                                        </p>
                                    </div>
                                </div>

                                {/* Right: ML-KEM Badge + Decrypt Button */}
                                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono-tech text-cyan-400">
                                        ML-KEM
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[oklch(75%_0.18_210)] hover:text-[oklch(80%_0.22_210)] hover:bg-[oklch(75%_0.18_210)]/10"
                                        onClick={() => handleDownload(file._id, file.fileName)}
                                        disabled={downloadingId === file._id}
                                    >
                                        {downloadingId === file._id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4 mr-1" />
                                                <span className="text-xs">Decrypt</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
