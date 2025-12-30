import { useState } from 'react';
import { Shield, Menu, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import authService from '@/services/authService';

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [user, setUser] = useState<{ email: string } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegisterMode) {
                const response = await authService.register(email, password);
                setUser({ email: response.email });
                setIsLoginOpen(false);
                // Reset state
                setEmail('');
                setPassword('');
            } else {
                const response = await authService.login(email, password);
                setUser({ email: response.email });
                setIsLoginOpen(false);
                // Reset state
                setEmail('');
                setPassword('');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        setError('');
    };

    return (
        <nav className="fixed top-0 w-full z-50 bg-white/5 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <a href="#" className="flex items-center gap-2">
                                <Shield className="h-8 w-8 text-primary" strokeWidth={2.5} />
                                <span className="text-xl font-bold tracking-tight text-foreground">Aegis</span>
                            </a>
                        </div>
                        {/* Desktop Menu */}
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                <a href="#features" className="text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Features
                                </a>
                                <a href="#security" className="text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Security
                                </a>
                                {!user && (
                                    <button onClick={() => setIsLoginOpen(true)} className="text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                        Login
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Login Button / User Profile */}
                    <div className="hidden md:block">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-emerald-400">Welcome, {user.email}</span>
                                <Button variant="outline" size="sm" onClick={() => setUser(null)}>Logout</Button>
                            </div>
                        ) : (
                            <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="glow" size="sm">Get Started</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>{isRegisterMode ? 'Create Your Vault' : 'Access Your Vault'}</DialogTitle>
                                        <DialogDescription>
                                            {isRegisterMode
                                                ? 'Generate a new PQC identity. Your keys never leave this device.'
                                                : 'Enter your credentials to verify identity via Zero-Knowledge Proof.'}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleAuth} className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="email" className="text-right">
                                                Email
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="col-span-3"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="password" className="text-right">
                                                Password
                                            </Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="col-span-3"
                                                required
                                            />
                                        </div>

                                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                                        <div className="flex flex-col gap-2 mt-2">
                                            <Button type="submit" disabled={loading} className="w-full">
                                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {isRegisterMode ? 'Generate Keys & Register' : 'Authenticate'}
                                            </Button>
                                            <div className="text-center text-sm text-muted-foreground mt-2">
                                                {isRegisterMode ? 'Already have a vault?' : 'Need a secure vault?'}
                                                <button type="button" onClick={toggleMode} className="ml-1 text-primary hover:underline focus:outline-none">
                                                    {isRegisterMode ? 'Login here' : 'Register here'}
                                                </button>
                                            </div>
                                        </div>

                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="-mr-2 flex md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-background/95 backdrop-blur-md border-b border-border"
                    >
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            <a href="#features" className="text-foreground hover:text-primary block px-3 py-2 rounded-md text-base font-medium">
                                Features
                            </a>
                            <a href="#security" className="text-foreground hover:text-primary block px-3 py-2 rounded-md text-base font-medium">
                                Security
                            </a>
                            {user ? (
                                <div className="px-3 py-2">
                                    <p className="text-sm font-medium text-emerald-400 mb-2">Logged in as {user.email}</p>
                                    <Button variant="outline" size="sm" onClick={() => setUser(null)} className="w-full">Logout</Button>
                                </div>
                            ) : (
                                <Button variant="default" className="w-full mt-4" onClick={() => setIsLoginOpen(true)}>Login / Register</Button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
