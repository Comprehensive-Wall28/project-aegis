import React, { useCallback, useState } from 'react';
import { Upload, FileLock, ShieldCheck } from 'lucide-react';
import { useVaultUpload } from '../../hooks/useVaultUpload';
import { useSessionStore } from '../../stores/sessionStore';

interface UploadZoneProps {
    onUploadComplete?: () => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUploadComplete }) => {
    const { uploadFile, state } = useVaultUpload();
    const { user, initializeQuantumKeys } = useSessionStore();
    const [isDragging, setIsDragging] = useState(false);

    // Auto-init keys if missing
    React.useEffect(() => {
        if (user && !user.publicKey) {
            initializeQuantumKeys();
        }
    }, [user, initializeQuantumKeys]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            await uploadFile(file);
            if (onUploadComplete) onUploadComplete();
        }
    }, [uploadFile, onUploadComplete]);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            await uploadFile(file);
            if (onUploadComplete) onUploadComplete();
        }
    }, [uploadFile, onUploadComplete]);

    return (
        <div className="w-full">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    relative rounded-2xl border-2 border-dashed p-8 transition-all duration-300
                    flex flex-col items-center justify-center gap-4 group cursor-pointer
                    ${isDragging
                        ? 'border-[oklch(75%_0.15_200)] bg-[oklch(75%_0.15_200)]/10 shadow-[0_0_20px_oklch(75%_0.15_200)]'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
                `}
            >
                {/* User Input Trigger */}
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileSelect}
                    disabled={state.status !== 'idle' && state.status !== 'completed' && state.status !== 'error'}
                />

                {/* Icons & Status */}
                <div className="relative">
                    {state.status === 'completed' ? (
                        <div className="flex flex-col items-center animate-in zoom-in duration-300 text-emerald-400">
                            <ShieldCheck className="w-12 h-12" />
                            <span className="mt-2 font-mono text-sm tracking-widest text-emerald-400">SECURE_VAULT_CONFIRMED</span>
                        </div>
                    ) : (state.status === 'error') ? (
                        <div className="text-red-400 flex flex-col items-center">
                            <FileLock className="w-12 h-12" />
                            <span className="mt-2 font-mono text-sm tracking-widest">UPLOAD_FAIL</span>
                        </div>
                    ) : (
                        <div className={`p-4 rounded-full bg-zinc-900 border border-white/5 shadow-2xl transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
                            <Upload className={`w-8 h-8 ${isDragging ? 'text-[oklch(75%_0.15_200)]' : 'text-zinc-600'}`} />
                        </div>
                    )}
                </div>

                {/* Text Feedback */}
                <div className="text-center space-y-1">
                    <h3 className="text-lg font-medium text-white/80">
                        {state.status === 'idle' && 'Drop sensitive files here'}
                        {state.status === 'encrypting' && 'Encrypting (AES-GCM/ML-KEM)...'}
                        {state.status === 'uploading' && 'Streaming to Secure Vault...'}
                        {state.status === 'verifying' && 'Verifying Integrity...'}
                        {state.status === 'completed' && 'File Secured'}
                        {state.status === 'error' && 'Failed to Secure File'}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">
                        {state.status === 'idle' && 'End-to-end Encrypted • Quantum-Safe'}
                        {state.status === 'error' && state.error}
                        {state.status !== 'idle' && state.status !== 'error' && `${state.progress}%`}
                    </p>
                </div>

                {/* Progress Bar (Visible during active states) */}
                {state.status !== 'idle' && state.status !== 'completed' && state.status !== 'error' && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-800 rounded-b-2xl overflow-hidden">
                        <div
                            className="h-full bg-[oklch(75%_0.15_200)] transition-all duration-300 shadow-[0_0_10px_oklch(75%_0.15_200)]"
                            style={{ width: `${state.progress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadZone;
