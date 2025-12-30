import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { SystemStatusBar } from './SystemStatusBar';
import { motion } from 'framer-motion';

export function DashboardLayout() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Animated Background */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl animate-mesh" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-[oklch(75%_0.18_145)]/5 rounded-full blur-3xl animate-mesh-delayed" />
            </div>

            {/* Sidebar */}
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Main Content Area */}
            <motion.div
                initial={false}
                animate={{
                    marginLeft: isSidebarCollapsed ? '4rem' : '14rem',
                    width: isSidebarCollapsed ? 'calc(100% - 4rem)' : 'calc(100% - 14rem)'
                }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="min-h-screen flex flex-col lg:ml-56"
            >
                {/* Top Header */}
                <TopHeader />

                {/* System Status Bar */}
                <SystemStatusBar />

                {/* Page Content */}
                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>
            </motion.div>

            {/* Mobile: Reset margin */}
            <style>{`
                @media (max-width: 1023px) {
                    .lg\\:ml-56 {
                        margin-left: 0 !important;
                        width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
}
