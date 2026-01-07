import { Navbar } from '@/components/layout/Navbar';
import { Hero } from '@/components/marketing/Hero';
import { Features } from '@/components/marketing/Features';
import { useEffect } from 'react';

export function Landing() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <main className="min-h-screen bg-background text-foreground antialiased selection:bg-indigo-500/30">
            <Navbar />
            <Hero />
            <Features />
        </main>
    );
}
