import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Layout = ({ children }) => {
    const [isDesktopCollapsed, setIsDesktopCollapsed] = React.useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

    const toggleDesktopSidebar = () => {
        setIsDesktopCollapsed(!isDesktopCollapsed);
    };

    const toggleMobileSidebar = () => {
        setIsMobileSidebarOpen(!isMobileSidebarOpen);
    };

    return (
        <div className="min-h-screen bg-[#F4F5F7]">
            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            <Sidebar
                isDesktopCollapsed={isDesktopCollapsed}
                toggleDesktopSidebar={toggleDesktopSidebar}
                isMobileSidebarOpen={isMobileSidebarOpen}
                setIsMobileSidebarOpen={setIsMobileSidebarOpen}
            />

            <TopBar
                isDesktopCollapsed={isDesktopCollapsed}
                toggleMobileSidebar={toggleMobileSidebar}
            />

            <main
                className={`pt-16 min-h-screen 
                    ${isDesktopCollapsed ? 'md:pl-20' : 'md:pl-64'} 
                    pl-0`}
            >
                <div className="p-4 md:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
