import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Shield,
    Vault,
    LineChart,
    Fingerprint,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/sessionStore';
import authService from '@/services/authService';

const navItems = [
    { name: 'Vault', href: '/dashboard', icon: Vault },
    { name: 'GPA Tracker', href: '/dashboard/gpa', icon: LineChart },
    { name: 'ZKP Verifier', href: '/dashboard/zkp', icon: Fingerprint },
    { name: 'Security', href: '/dashboard/security', icon: Settings },
];

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { clearSession } = useSessionStore();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = async () => {
        await authService.logout();
        clearSession();
        navigate('/');
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={`flex items-center gap-2 h-14 px-4 border-b border-white/5 ${isCollapsed ? 'justify-center' : ''}`}>
                <Shield className="h-7 w-7 text-primary flex-shrink-0" strokeWidth={2.5} />
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="text-lg font-bold tracking-tight text-foreground overflow-hidden whitespace-nowrap"
                        >
                            Aegis
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                                ${isCollapsed ? 'justify-center' : ''}
                                ${isActive
                                    ? 'bg-primary/20 text-primary border border-primary/30'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                }
                            `}
                            title={isCollapsed ? item.name : undefined}
                            onClick={() => setIsMobileOpen(false)}
                        >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <AnimatePresence>
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        className="text-sm font-medium overflow-hidden whitespace-nowrap"
                                    >
                                        {item.name}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-2 border-t border-white/5 space-y-1">
                {/* Logout */}
                <Button
                    variant="ghost"
                    className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} text-muted-foreground hover:text-destructive hover:bg-destructive/10`}
                    onClick={handleLogout}
                >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="ml-3 overflow-hidden whitespace-nowrap"
                            >
                                Logout
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Button>

                {/* Collapse Toggle - Desktop only */}
                <div className="hidden lg:block">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center text-muted-foreground hover:text-foreground"
                        onClick={onToggle}
                    >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isCollapsed ? '4rem' : '14rem' }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-zinc-900/40 backdrop-blur-xl border-r border-white/10 z-40"
            >
                <SidebarContent />
            </motion.aside>

            {/* Mobile Menu Button */}
            <button
                className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-zinc-900/80 backdrop-blur-sm border border-white/10"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                            onClick={() => setIsMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="lg:hidden fixed left-0 top-0 h-screen w-56 bg-zinc-900/95 backdrop-blur-xl border-r border-white/10 z-50"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
