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
    X
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

export function DashboardNavbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, clearSession } = useSessionStore();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = async () => {
        await authService.logout();
        clearSession();
        navigate('/');
    };

    return (
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-50 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Link to="/dashboard" className="flex items-center gap-2">
                                <Shield className="h-8 w-8 text-primary" strokeWidth={2.5} />
                                <span className="text-xl font-bold tracking-tight text-foreground">Aegis</span>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-1">
                                {navItems.map((item) => {
                                    const isActive = location.pathname === item.href;
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.href}
                                            className={`
                                                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                                ${isActive
                                                    ? 'bg-primary/20 text-primary'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                                }
                                            `}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* User and Logout - Desktop */}
                    <div className="hidden md:flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {user?.username || user?.email?.split('@')[0] || 'Agent'}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogout}
                            className="border-white/10 hover:bg-white/5"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>

                    {/* Mobile menu button */}
                    <div className="-mr-2 flex md:hidden">
                        <button
                            onClick={() => setIsMobileOpen(!isMobileOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMobileOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-background/95 backdrop-blur-md border-t border-white/10 rounded-b-2xl overflow-hidden"
                    >
                        <div className="px-4 pt-2 pb-4 space-y-1">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setIsMobileOpen(false)}
                                        className={`
                                            flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-all
                                            ${isActive
                                                ? 'bg-primary/20 text-primary'
                                                : 'text-foreground hover:text-primary hover:bg-white/5'
                                            }
                                        `}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {item.name}
                                    </Link>
                                );
                            })}

                            <div className="pt-2 mt-2 border-t border-white/10">
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                    Logged in as {user?.username || user?.email?.split('@')[0] || 'Agent'}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="w-full mt-2"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
