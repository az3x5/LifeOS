import React, { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { AppNotification, Module } from '../types';
import { notificationsService } from '../services/dataService';
import FinanceIcon from './icons/FinanceIcon';
import HabitIcon from './icons/HabitIcon';
import IslamicIcon from './icons/IslamicIcon';
import NotificationsIcon from './icons/NotificationsIcon';
import ConfirmModal from './modals/ConfirmModal';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationItem: React.FC<{
    notification: AppNotification;
    onMarkAsRead: (id: number) => void;
}> = ({ notification, onMarkAsRead }) => {
    const getIcon = () => {
        switch (notification.module) {
            case Module.FINANCE: return <FinanceIcon className="text-red-400" />;
            case Module.HABITS: return <HabitIcon className="text-orange-400" />;
            case Module.ISLAMIC: return <IslamicIcon className="text-blue-400" />;
            default: return <NotificationsIcon className="text-text-muted" />;
        }
    };

    return (
        <div className="p-4 border-b border-tertiary last:border-b-0 flex gap-4 animate-fade-in-up">
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center mt-1">{getIcon()}</div>
            <div className="flex-grow">
                <p className="text-sm text-text-primary">{notification.message}</p>
                <p className="text-xs text-text-muted mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
                 <button onClick={() => onMarkAsRead(notification.id!)} title="Mark as Read" className="text-text-muted hover:text-text-primary text-xl">&times;</button>
                 {/* Snooze button could go here */}
            </div>
        </div>
    );
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);

    const allNotifications = useSupabaseQuery<AppNotification>('notifications');
    const notifications = React.useMemo(() => {
        const unread = (allNotifications ?? []).filter(n => n.status === 'unread');
        return unread.sort((a, b) => {
            const aTime = a.timestamp ? (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime()) : 0;
            const bTime = b.timestamp ? (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime()) : 0;
            return bTime - aTime;
        });
    }, [allNotifications]);

    const handleMarkAsRead = async (id: number) => {
        await notificationsService.update(id, { status: 'read' });
    };

    const handleMarkAllRead = async () => {
        const unread = (allNotifications ?? []).filter(n => n.status === 'unread');
        for (const notif of unread) {
            if (notif.id) {
                await notificationsService.update(notif.id, { status: 'read' });
            }
        }
    };

    const handleClearRead = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Clear Read Notifications',
            message: "Are you sure you want to clear all read notifications?",
            icon: '🔔',
            onConfirm: async () => {
                const readNotifs = (allNotifications ?? []).filter(n => n.status === 'read');
                for (const notif of readNotifs) {
                    if (notif.id) {
                        await notificationsService.delete(notif.id);
                    }
                }
                setConfirmModal(null);
            }
        });
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            {/* Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-secondary shadow-2xl border-l border-tertiary flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                aria-modal="true"
                role="dialog"
                aria-labelledby="notification-center-title"
            >
                <header className="p-4 border-b border-tertiary flex justify-between items-center flex-shrink-0">
                    <h2 id="notification-center-title" className="text-xl font-bold">Notifications</h2>
                    <button onClick={onClose} aria-label="Close notifications" className="p-2 -mr-2 rounded-full hover:bg-tertiary text-2xl">&times;</button>
                </header>
                
                <div className="flex-grow overflow-y-auto">
                    {notifications && notifications.length > 0 ? (
                        notifications.map(n => <NotificationItem key={n.id} notification={n} onMarkAsRead={handleMarkAsRead} />)
                    ) : (
                        <div className="text-center p-8 text-text-muted h-full flex flex-col justify-center items-center">
                            <span className="material-symbols-outlined text-6xl text-tertiary">notifications_off</span>
                            <p className="mt-4">All caught up!</p>
                        </div>
                    )}
                </div>

                <footer className="p-4 border-t border-tertiary flex-shrink-0 flex justify-between">
                    <button onClick={handleMarkAllRead} className="text-sm text-accent hover:underline disabled:opacity-50" disabled={!notifications || notifications.length === 0}>Mark all as read</button>
                    <button onClick={handleClearRead} className="text-sm text-text-muted hover:underline">Clear read</button>
                </footer>
            </div>

            {confirmModal && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText="Clear"
                    icon={confirmModal.icon || "🗑️"}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
        </>
    );
};

export default NotificationCenter;
