import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';
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

            {/* Main Content */}
            <motion.main
                initial={false}
                animate={{
                    marginLeft: isSidebarCollapsed ? '5rem' : '16rem',
                    paddingLeft: '0rem'
                }}
                transition={{ duration: 0.2 }}
                className="min-h-screen p-6 lg:p-8 transition-all"
                style={{ marginLeft: '0' }} // Override for mobile
            >
                {/* Responsive margin for desktop */}
                <div className="lg:hidden h-16" /> {/* Spacer for mobile menu button */}

                <div className="max-w-7xl mx-auto">
                    <DashboardHeader />

                    {/* Page Content */}
                    <Outlet />
                </div>
            </motion.main>
        </div>
    );
}
