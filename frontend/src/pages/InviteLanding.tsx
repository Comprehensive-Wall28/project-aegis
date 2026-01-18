import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AegisLogo } from '@/components/AegisLogo';
import { Users, Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import socialService from '@/services/socialService';
import { useSocialStore, importRoomKeyFromBase64 } from '@/stores/useSocialStore';
import { useSessionStore } from '@/stores/sessionStore';

// Decrypt room info with key from URL hash
const decryptWithKey = async (key: CryptoKey, encryptedData: string): Promise<string> => {
    try {
        const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        return '[Unable to decrypt]';
    }
};

export function InviteLanding() {
    const navigate = useNavigate();
    const { code } = useParams<{ code: string }>();

    const isAuthChecking = useSessionStore((state) => state.isAuthChecking);
    const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
    const pqcEngineStatus = useSessionStore((state) => state.pqcEngineStatus);

    const joinRoom = useSocialStore((state) => state.joinRoom);

    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roomInfo, setRoomInfo] = useState<{ name: string; description: string } | null>(null);
    const [roomKey, setRoomKey] = useState<CryptoKey | null>(null);

    // Parse invite on mount - Visible to everyone
    useEffect(() => {
        const loadInvite = async () => {
            if (!code) {
                setError('Invalid invite link');
                setIsLoading(false);
                return;
            }

            try {
                // Get key from URL hash
                const hash = window.location.hash.slice(1); // Remove '#'
                if (!hash) {
                    setError('Missing encryption key in invite link');
                    setIsLoading(false);
                    return;
                }

                // Import room key from base64
                const key = await importRoomKeyFromBase64(hash);
                setRoomKey(key);

                // Fetch encrypted room info
                const encryptedInfo = await socialService.getInviteInfo(code);

                // Decrypt room name and description
                const name = await decryptWithKey(key, encryptedInfo.name);
                const description = await decryptWithKey(key, encryptedInfo.description);

                setRoomInfo({ name, description });
                setIsLoading(false);
            } catch (err: any) {
                console.error('Failed to load invite:', err);
                setError(err.response?.data?.message || 'Invite not found or expired');
                setIsLoading(false);
            }
        };

        loadInvite();
    }, [code]);

    const handleAction = async () => {
        if (!code || !roomKey) return;

        // Force a "login" flow check
        if (!isAuthenticated || pqcEngineStatus !== 'operational') {
            // Store pending invite in session storage for after login
            sessionStorage.setItem(
                'pendingInvite',
                JSON.stringify({
                    inviteCode: code,
                    keyBase64: window.location.hash.slice(1),
                })
            );
            navigate('/', { state: { showLogin: true } });
            return;
        }

        // If already authenticated, proceed to join
        try {
            setIsJoining(true);
            await joinRoom(code, roomKey);
            navigate('/dashboard/social');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to join room');
            setIsJoining(false);
        }
    };

    // Show initial loading only during auth check
    if (isAuthChecking) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center px-6 max-w-lg w-full">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <AegisLogo size={100} />
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <p className="text-muted-foreground">Decrypting invite...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center">
                        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                        <h2 className="text-2xl font-bold text-foreground mb-2">Invite Error</h2>
                        <p className="text-muted-foreground mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground font-medium hover:bg-white/10 transition-all hover:scale-105"
                        >
                            Return Home
                        </button>
                    </div>
                ) : roomInfo ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        {/* Invite Heading */}
                        <div className="mb-6">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                                <Users className="w-4 h-4" />
                                Secure Invitation
                            </span>
                            <h2 className="text-2xl font-semibold text-muted-foreground">
                                You've been invited to join
                            </h2>
                        </div>

                        {/* Room Name */}
                        <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
                            {roomInfo.name}
                        </h1>

                        {/* Description */}
                        {roomInfo.description && (
                            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                                {roomInfo.description}
                            </p>
                        )}

                        {/* End-to-End Encrypted Badge */}
                        <div className="flex items-center gap-2 text-emerald-500 mb-8 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20">
                            <Lock className="w-4 h-4" />
                            <span className="text-sm font-semibold">End-to-End Encrypted Group</span>
                        </div>

                        {/* Action Wrapper */}
                        <div className="w-full max-w-xs space-y-4">
                            <button
                                onClick={handleAction}
                                disabled={isJoining}
                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isJoining ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Joining...
                                    </>
                                ) : (
                                    <>
                                        Login to Join
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                ) : null}
            </div>
        </div>
    );
}

export default InviteLanding;
