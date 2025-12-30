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
    { name: 'Security Settings', href: '/dashboard/security', icon: Settings },
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
            <div className={`flex items-center gap-2 p-4 border-b border-white/5 ${isCollapsed ? 'justify-center' : ''}`}>
                <Shield className="h-8 w-8 text-primary flex-shrink-0" strokeWidth={2.5} />
                {!isCollapsed && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xl font-bold tracking-tight text-foreground"
                    >
                        Aegis
                    </motion.span>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
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
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm font-medium"
                                >
                                    {item.name}
                                </motion.span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-white/5">
                <Button
                    variant="ghost"
                    className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} text-muted-foreground hover:text-destructive`}
                    onClick={handleLogout}
                >
                    <LogOut className="h-5 w-5" />
                    {!isCollapsed && <span className="ml-3">Logout</span>}
                </Button>
            </div>

            {/* Collapse Toggle - Desktop only */}
            <div className="hidden lg:block p-4 border-t border-white/5">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center"
                    onClick={onToggle}
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isCollapsed ? '5rem' : '16rem' }}
                className="hidden lg:flex flex-col fixed left-0 top-0 h-screen glass-sidebar z-40"
            >
                <SidebarContent />
            </motion.aside>

            {/* Mobile Menu Button */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-white/10"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
                            className="lg:hidden fixed left-0 top-0 h-screen w-64 glass-sidebar z-50"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
