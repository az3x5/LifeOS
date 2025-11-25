
import React, { ReactNode, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Module, AppNotification } from '../types';
import NotificationsIcon from './icons/NotificationsIcon';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';
import CodeNav from './CodeNav';

interface LayoutProps {
    children: ReactNode;
    activeModule: Module;
    setActiveModule: (module: Module) => void;
    quickActionHandlers: {
        openAddTransaction: () => void;
        openMarkHabit: () => void;
        openAddHealthLog: () => void;
        openAddNote: () => void;
        openLogPrayer: () => void;
    };
    isNotificationCenterOpen: boolean;
    setIsNotificationCenterOpen: (isOpen: boolean) => void;
}


const Layout: React.FC<LayoutProps> = ({ children, activeModule, setActiveModule, quickActionHandlers, isNotificationCenterOpen, setIsNotificationCenterOpen }) => {
    const isNotesModule = activeModule === Module.NOTES;
    const isRemindersModule = activeModule === Module.REMINDERS;
    const allNotifications = useSupabaseQuery<AppNotification>('notifications');
    const unreadCount = useMemo(() => (allNotifications ?? []).filter(n => n.status === 'unread').length, [allNotifications]);

    return (
        <div className="flex flex-col md:flex-row h-screen bg-primary text-text-primary font-sans">
            {/* Desktop Sidebar Navigation */}
            <div className="hidden md:flex flex-col w-64 bg-secondary border-r border-tertiary overflow-y-auto">
                <CodeNav activeModule={activeModule} setActiveModule={setActiveModule} />
                <div className="mt-auto p-4 border-t border-tertiary space-y-2">
                    <div className="flex items-center gap-2">
                        <GlobalSearch setActiveModule={setActiveModule} />
                        <button onClick={() => setIsNotificationCenterOpen(true)} title="Notifications" className="relative p-2 rounded-lg hover:bg-tertiary">
                            <NotificationsIcon />
                            {unreadCount != null && unreadCount > 0 && (
                                <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-xs text-center">{unreadCount}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden p-4 border-b border-tertiary flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-lg font-bold text-white">L</span>
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-accent to-purple bg-clip-text text-transparent">LifeOS</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <GlobalSearch setActiveModule={setActiveModule} />
                        <button onClick={() => setIsNotificationCenterOpen(true)} title="Notifications" className="relative p-2 rounded-lg hover:bg-tertiary">
                            <NotificationsIcon />
                            {unreadCount != null && unreadCount > 0 && (
                                <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-xs text-center">{unreadCount}</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className={`flex-1 overflow-y-auto ${isNotesModule || isRemindersModule ? '' : 'px-6 md:px-10 py-6 md:py-10'} pb-20 md:pb-10`}>
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-secondary border-t border-tertiary z-10 shadow-2xl">
                <CodeNav activeModule={activeModule} setActiveModule={setActiveModule} />
            </nav>

            <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
        </div>
    );
};

export default Layout;
