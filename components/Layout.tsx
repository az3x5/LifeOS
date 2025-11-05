
import React, { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { Module } from '../types';
import DashboardIcon from './icons/DashboardIcon';
import FinanceIcon from './icons/FinanceIcon';
import HabitIcon from './icons/HabitIcon';
import HealthIcon from './icons/HealthIcon';
import IslamicIcon from './icons/IslamicIcon';
import NotesIcon from './icons/NotesIcon';
import RemindersIcon from './icons/RemindersIcon';
import SettingsIcon from './icons/SettingsIcon';
import NotificationsIcon from './icons/NotificationsIcon';
import GlobalSearch from './GlobalSearch';
import QuickActionsDock from './QuickActionsDock';
import NotificationCenter from './NotificationCenter';

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
    isSyncing: boolean;
}

const navItems = [
    { module: Module.DASHBOARD, icon: DashboardIcon, label: 'Dashboard' },
    { module: Module.NOTES, icon: NotesIcon, label: 'Notes' },
    { module: Module.REMINDERS, icon: RemindersIcon, label: 'Reminders' },
    { module: Module.HABITS, icon: HabitIcon, label: 'Habits' },
    { module: Module.HEALTH, icon: HealthIcon, label: 'Health' },
    { module: Module.FINANCE, icon: FinanceIcon, label: 'Finance' },
    { module: Module.ISLAMIC, icon: IslamicIcon, label: 'Islamic' },
    { module: Module.SETTINGS, icon: SettingsIcon, label: 'Settings' },
];

const NavItem: React.FC<{
    Icon: React.ComponentType<{ className?: string }>;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ Icon, label, isActive, onClick }) => {
    const activeClasses = isActive ? 'bg-accent text-white' : 'text-text-secondary hover:bg-tertiary hover:text-text-primary';
    return (
        <button onClick={onClick} title={label} className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 w-full md:w-auto md:flex-row md:space-y-0 md:space-x-4 md:justify-start md:px-4 md:py-3 md:rounded-lg ${activeClasses}`}>
            <Icon className="text-2xl" />
            <span className="text-xs md:text-base font-medium">{label}</span>
        </button>
    );
};

const SyncStatus: React.FC<{ isSyncing: boolean }> = ({ isSyncing }) => (
    <div className="tooltip">
        <span className={`material-symbols-outlined text-lg ${isSyncing ? 'text-accent animate-spin' : 'text-green-400'}`}>
            {isSyncing ? 'sync' : 'cloud_done'}
        </span>
        <span className="tooltiptext">{isSyncing ? "Syncing with cloud..." : "Data is synced"}</span>
    </div>
);

const Layout: React.FC<LayoutProps> = ({ children, activeModule, setActiveModule, quickActionHandlers, isNotificationCenterOpen, setIsNotificationCenterOpen, isSyncing }) => {
    const isNotesModule = activeModule === Module.NOTES;
    const unreadCount = useLiveQuery(() => db.notifications.where('status').equals('unread').count(), []);

    return (
        <div className="flex flex-col md:flex-row h-screen bg-primary text-text-primary font-sans">
            <header className="hidden md:flex flex-col w-64 bg-secondary p-4 space-y-4 border-r border-tertiary">
                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center space-x-3">
                         <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                            <span className="text-xl font-bold text-white">L</span>
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary">LifeOS</h1>
                    </div>
                    <SyncStatus isSyncing={isSyncing} />
                </div>
                <div className="px-2 flex items-center gap-2">
                    <GlobalSearch setActiveModule={setActiveModule} />
                    <button onClick={() => setIsNotificationCenterOpen(true)} title="Notifications" className="relative p-2 rounded-lg hover:bg-tertiary">
                        <NotificationsIcon />
                        {unreadCount != null && unreadCount > 0 && (
                            <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-xs text-center">{unreadCount}</span>
                        )}
                    </button>
                </div>
                <nav className="flex flex-col space-y-2 flex-1 overflow-y-auto">
                    {navItems.map(item => (
                        <NavItem
                            key={item.module}
                            Icon={item.icon}
                            label={item.label}
                            isActive={activeModule === item.module}
                            onClick={() => setActiveModule(item.module)}
                        />
                    ))}
                </nav>
            </header>
            
            <main className="flex-1 flex flex-col overflow-hidden">
                 <div className="p-4 md:hidden border-b border-tertiary flex justify-between items-center">
                    <GlobalSearch setActiveModule={setActiveModule} />
                    <button onClick={() => setIsNotificationCenterOpen(true)} title="Notifications" className="relative p-2 rounded-lg hover:bg-tertiary">
                        <NotificationsIcon />
                        {unreadCount != null && unreadCount > 0 && (
                            <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-xs text-center">{unreadCount}</span>
                        )}
                    </button>
                </div>
                <div className={`flex-1 overflow-y-auto ${isNotesModule ? '' : 'px-6 md:px-10 py-6 md:py-10 pb-24 md:pb-10'}`}>
                    {children}
                </div>
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-secondary border-t border-tertiary flex justify-around p-1 shadow-2xl z-10">
                {navItems.map(item => (
                    <NavItem
                        key={item.module}
                        Icon={item.icon}
                        label={item.label}
                        isActive={activeModule === item.module}
                        onClick={() => setActiveModule(item.module)}
                    />
                ))}
            </nav>

            <QuickActionsDock {...quickActionHandlers} />

            <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
        </div>
    );
};

export default Layout;
