import { useState, useEffect } from 'react';
import { FileIcon, Download, Loader2, FolderOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
            setFiles(data.slice(0, 5)); // Show only 5 recent files
            setError(null);
        } catch (err) {
            console.error('Failed to fetch files:', err);
            setError('Failed to load files');
            // Mock data for demo
            setFiles([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (fileId: string, fileName: string) => {
        try {
            setDownloadingId(fileId);
            const blob = await vaultService.downloadFile(fileId);

            // Create download link
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
        <Card className="glass-card border-white/10 h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5 text-primary" />
                            Vault Quick-View
                        </CardTitle>
                        <CardDescription>Your recent encrypted files</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>{error}</p>
                        <Button variant="ghost" size="sm" onClick={fetchFiles} className="mt-2">
                            Retry
                        </Button>
                    </div>
                ) : files.length === 0 ? (
                    <div className="text-center py-8">
                        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">No files in vault yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Upload your first encrypted file</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {files.map((file, index) => (
                            <motion.div
                                key={file._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <FileIcon className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate" title={file.fileName}>
                                            {truncateFileName(file.fileName)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatFileSize(file.fileSize)} • {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[oklch(75%_0.18_145)] hover:text-[oklch(80%_0.22_145)] hover:bg-[oklch(75%_0.18_145)]/10"
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
                            </motion.div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
