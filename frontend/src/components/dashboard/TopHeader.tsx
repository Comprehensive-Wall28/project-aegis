import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { useThemeStore } from '@/stores/themeStore';
import authService from '@/services/authService';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, ChevronDown, Settings, Palette } from 'lucide-react';

export function TopHeader() {
    const navigate = useNavigate();
    const { user, clearSession } = useSessionStore();
    const { theme, toggleTheme } = useThemeStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        await authService.logout();
        clearSession();
        navigate('/');
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const username = user?.username || user?.email?.split('@')[0] || 'Agent';

    return (
        <header className="h-14 bg-transparent flex items-center justify-between px-6">
            {/* Left: Section Title & Welcome Footprint */}
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col"
            >
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/50 leading-none mb-1">
                    System Overview
                </span>
                <h1 className="text-2xl font-black tracking-tighter text-foreground leading-none">
                    Dashboard <span className="text-xs font-medium tracking-normal text-muted-foreground/40 ml-2">Welcome, {username}</span>
                </h1>
            </motion.div>

            {/* Right: Actions & User Profile */}
            <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-white/5 transition-all"
                    title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to switch)`}
                >
                    <Palette className="h-5 w-5" />
                </button>

                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm text-foreground hidden sm:block">{username}</span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 mt-2 w-48 py-2 bg-popover/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50"
                            >
                                <div className="px-4 py-2 border-b border-white/10">
                                    <p className="text-sm font-medium text-foreground">{username}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>

                                <button
                                    onClick={() => {
                                        navigate('/dashboard/security');
                                        setIsDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                                >
                                    <Settings className="h-4 w-4" />
                                    Settings
                                </button>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
