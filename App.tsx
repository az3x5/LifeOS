
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import { Module } from './types';
import Dashboard from './modules/Dashboard';
import Finance from './modules/Finance';
import HabitTracker from './modules/HabitTracker';
import HealthTracker from './modules/HealthTracker';
import IslamicKnowledge from './modules/IslamicKnowledge';
import Notes from './modules/Notes';
import Reminders from './modules/Reminders';
import Settings from './modules/Settings';
import Auth from './modules/Auth';
import { runNotificationChecks } from './services/notificationService';
import { supabase } from './services/supabase';
import { habitsService, habitLogsService, healthMetricsService, healthLogsService } from './services/dataService';
import type { User } from '@supabase/supabase-js';

// Import Quick Add Modals
import QuickAddTransactionModal from './components/modals/QuickAddTransactionModal';
import QuickMarkHabitModal from './components/modals/QuickMarkHabitModal';
import QuickAddHealthLogModal from './components/modals/QuickAddHealthLogModal';
import QuickAddNoteModal from './components/modals/QuickAddNoteModal';
import QuickLogPrayerModal from './components/modals/QuickLogPrayerModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import LockScreen from './components/LockScreen';

// Import security service
import { isLockEnabled, shouldLock, updateLastActive } from './services/securityService';

// Import theme service
import { initializeTheme } from './services/themeService';

// Import font settings hook
import { useFontSettings } from './hooks/useFontSettings';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeModule, setActiveModule] = useState<Module>(Module.DASHBOARD);
    const [isLocked, setIsLocked] = useState(false);

    // State for Quick Add Modals
    const [isAddTransactionOpen, setAddTransactionOpen] = useState(false);
    const [isMarkHabitOpen, setMarkHabitOpen] = useState(false);
    const [isAddHealthLogOpen, setAddHealthLogOpen] = useState(false);
    const [isAddNoteOpen, setAddNoteOpen] = useState(false);
    const [isLogPrayerOpen, setLogPrayerOpen] = useState(false);

    // State for Notification Center
    const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

    // Initialize theme on mount
    useEffect(() => {
        initializeTheme();
    }, []);

    // Initialize font settings on mount
    useFontSettings();

    // Check authentication status on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user || null);
                setAuthLoading(false);

                // Check if app should be locked
                if (isLockEnabled() && shouldLock()) {
                    setIsLocked(true);
                }

                // If user is logged in, Supabase Realtime will handle data sync automatically
                if (session?.user) {
                    console.log('User authenticated, Supabase Realtime subscriptions active');
                }
            } catch (error) {
                console.error('Auth check error:', error);
                setAuthLoading(false);
            }
        };

        // Add safety timeout to ensure loading screen doesn't hang forever
        const safetyTimeout = setTimeout(() => {
            console.warn('Auth check taking too long, forcing load');
            setAuthLoading(false);
        }, 3000); // Reduced to 3 seconds

        checkAuth().finally(() => clearTimeout(safetyTimeout));

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setUser(session?.user || null);

            if (event === 'SIGNED_IN' && session?.user) {
                console.log('User signed in, Supabase Realtime subscriptions active');
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
                // Optionally clear local data
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Register PWA Service Worker (delayed to improve startup time)
    useEffect(() => {
        if ('serviceWorker' in navigator && !authLoading) {
            // Delay PWA registration by 2 seconds to let app load first
            const timer = setTimeout(() => {
                import('virtual:pwa-register').then(({ registerSW }) => {
                    const updateSW = registerSW({
                        onNeedRefresh() {
                            if (confirm('New version available! Reload to update?')) {
                                updateSW(true);
                            }
                        },
                        onOfflineReady() {
                            console.log('App ready to work offline');
                        },
                        onRegisterError(error) {
                            console.error('SW registration error:', error);
                        }
                    });
                }).catch(err => {
                    console.log('PWA not available:', err);
                });
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [authLoading]);

    // Track user activity for auto-lock
    useEffect(() => {
        if (!isLockEnabled() || isLocked) return;

        const handleActivity = () => {
            updateLastActive();
        };

        // Track various user activities
        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('scroll', handleActivity);

        // Check if app should lock every minute
        const lockCheckInterval = setInterval(() => {
            if (shouldLock()) {
                setIsLocked(true);
            }
        }, 60000); // Check every minute

        return () => {
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            clearInterval(lockCheckInterval);
        };
    }, [isLocked]);

    const handleUnlock = () => {
        setIsLocked(false);
        updateLastActive();
    };

    useEffect(() => {
        const checkReminders = async () => {
            if (Notification.permission !== 'granted') {
                return;
            }
    
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            // --- Check Habit Reminders ---
            const todayStr = now.toISOString().split('T')[0];
            const todayDay = now.getDay();

            const allHabits = await habitsService.getAll();
            const dueHabits = allHabits.filter(h => h.reminderEnabled && h.reminderTime === currentTime);

            if (dueHabits.length > 0) {
                 const allHabitLogs = await habitLogsService.getAll();
                 const completedTodayIds = new Set(
                    allHabitLogs.filter(log => log.date === todayStr).map(log => log.habitId)
                );

                for (const habit of dueHabits) {
                    const isScheduledToday = habit.frequency === 'daily' || (habit.frequency === 'custom' && habit.daysOfWeek?.includes(todayDay));
                    if (isScheduledToday && !completedTodayIds.has(habit.id!)) {
                        new Notification('Habit Reminder', {
                            body: `Don't forget to complete: ${habit.name}`,
                            icon: '/vite.svg',
                            tag: `habit-${habit.id}`
                        });
                    }
                }
            }

            // --- Check Health Log Reminders ---
            const allHealthMetrics = await healthMetricsService.getAll();
            const dueHealthMetrics = allHealthMetrics.filter(m => m.reminderEnabled && m.reminderTime === currentTime);

            if (dueHealthMetrics.length > 0) {
                const allHealthLogs = await healthLogsService.getAll();
                const loggedTodayMetricIds = new Set(
                    allHealthLogs.filter(log => {
                        const logDate = typeof log.date === 'string' ? log.date : log.date.toISOString().split('T')[0];
                        return logDate === todayStr;
                    }).map(log => log.metricId)
                );

                for (const metric of dueHealthMetrics) {
                    if (!loggedTodayMetricIds.has(metric.id!)) {
                        new Notification('Health Log Reminder', {
                            body: `Time to log your ${metric.name}!`,
                            icon: '/vite.svg',
                            tag: `health-${metric.id}`
                        });
                    }
                }
            }
        };
    
        const intervalId = setInterval(checkReminders, 60000); // Check every minute
    
        return () => clearInterval(intervalId);
    }, []);

    // Effect for generating notifications in the Notification Center
    useEffect(() => {
        // Run once on load, then set an interval
        runNotificationChecks();
        const intervalId = setInterval(runNotificationChecks, 15 * 60 * 1000); // Check every 15 minutes
        return () => clearInterval(intervalId);
    }, []);

    // Note: Cloud sync is now handled automatically by Supabase Realtime subscriptions
    // No manual sync needed - data updates are pushed/pulled automatically

    const renderModule = () => {
        switch (activeModule) {
            case Module.DASHBOARD:
                return <Dashboard setActiveModule={setActiveModule} />;
            case Module.FINANCE:
                return <Finance />;
            case Module.HABITS:
                return <HabitTracker />;
            case Module.HEALTH:
                return <HealthTracker />;
            case Module.ISLAMIC:
                return <IslamicKnowledge />;
            case Module.NOTES:
                return <Notes />;
            case Module.REMINDERS:
                return <Reminders />;
            case Module.SETTINGS:
                return <Settings />;
            default:
                return <Dashboard setActiveModule={setActiveModule} />;
        }
    };
    
    const quickActionHandlers = {
        openAddTransaction: () => setAddTransactionOpen(true),
        openMarkHabit: () => setMarkHabitOpen(true),
        openAddHealthLog: () => setAddHealthLogOpen(true),
        openAddNote: () => setAddNoteOpen(true),
        openLogPrayer: () => setLogPrayerOpen(true),
    };

    // Show loading screen while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen bg-primary flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-text-secondary">Loading LifeOS...</p>
                </div>
            </div>
        );
    }

    // Show lock screen if app is locked
    if (isLocked) {
        return <LockScreen onUnlock={handleUnlock} />;
    }

    // Show auth screen if not logged in
    if (!user) {
        return <Auth onAuthSuccess={() => {
            // Auth state will be updated by the onAuthStateChange listener
        }} />;
    }

    return (
        <>
            <Layout
                activeModule={activeModule}
                setActiveModule={setActiveModule}
                quickActionHandlers={quickActionHandlers}
                isNotificationCenterOpen={isNotificationCenterOpen}
                setIsNotificationCenterOpen={setIsNotificationCenterOpen}
            >
                {renderModule()}
            </Layout>
            {/* Render Modals at top level for global access */}
            {isAddTransactionOpen && <QuickAddTransactionModal closeModal={() => setAddTransactionOpen(false)} />}
            {isMarkHabitOpen && <QuickMarkHabitModal closeModal={() => setAddTransactionOpen(false)} />}
            {isAddHealthLogOpen && <QuickAddHealthLogModal closeModal={() => setAddHealthLogOpen(false)} />}
            {isAddNoteOpen && <QuickAddNoteModal closeModal={() => setAddNoteOpen(false)} setActiveModule={setActiveModule} />}
            {isLogPrayerOpen && <QuickLogPrayerModal closeModal={() => setLogPrayerOpen(false)} />}

            {/* PWA Install Prompt */}
            <PWAInstallPrompt />
        </>
    );
};

export default App;
