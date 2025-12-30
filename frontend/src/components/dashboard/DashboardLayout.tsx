import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { SystemStatusBar } from './SystemStatusBar';
import { motion } from 'framer-motion';

export function DashboardLayout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-zinc-950 text-foreground flex overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl animate-mesh" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-[oklch(75%_0.18_145)]/5 rounded-full blur-3xl animate-mesh-delayed" />
            </div>

            {/* Sidebar Wrapper */}
            <div
                className="hidden lg:block shrink-0 transition-all duration-200"
                style={{ width: isSidebarCollapsed ? '4rem' : '14rem' }}
            >
                <Sidebar
                    isCollapsed={isSidebarCollapsed}
                    onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />
            </div>

            {/* Main Wrapper: Frames the stage */}
            <div className="flex-1 flex flex-col min-w-0 h-screen relative overflow-hidden">
                {/* Top Header & Status sitting above the stage */}
                <div className="z-20">
                    <TopHeader />
                    <SystemStatusBar />
                </div>

                {/* Inset Content Area (The 'Stage') */}
                <div className="flex-1 m-4 mt-2 overflow-hidden">
                    <motion.div
                        layout
                        className="h-full w-full bg-zinc-900/50 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Inner Content Area with scroll */}
                        <main className="flex-1 p-8 overflow-y-auto scrollbar-thin">
                            <div className="max-w-7xl mx-auto">
                                <Outlet />
                            </div>
                        </main>
                    </motion.div>
                </div>
            </div>

            {/* Mobile: Reset structure would be handled by responsive classes, 
                but let's ensure Sidebar and Main Wrapper play nice. */}
            <style>{`
                @media (max-width: 1023px) {
                    /* Adjustments for mobile if needed */
                }
            `}</style>
        </div>
    );
}
