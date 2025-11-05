
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
import { db } from './services/db';
import { runNotificationChecks } from './services/notificationService';
import { syncAllData, pullAllData } from './services/syncService';
import { supabase } from './services/supabase';
import type { User } from '@supabase/supabase-js';

// Import Quick Add Modals
import QuickAddTransactionModal from './components/modals/QuickAddTransactionModal';
import QuickMarkHabitModal from './components/modals/QuickMarkHabitModal';
import QuickAddHealthLogModal from './components/modals/QuickAddHealthLogModal';
import QuickAddNoteModal from './components/modals/QuickAddNoteModal';
import QuickLogPrayerModal from './components/modals/QuickLogPrayerModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Register PWA Service Worker
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
    onNeedRefresh() {
        if (confirm('New version available! Reload to update?')) {
            updateSW(true);
        }
    },
    onOfflineReady() {
        console.log('App ready to work offline');
    },
});

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeModule, setActiveModule] = useState<Module>(Module.DASHBOARD);

    // State for Quick Add Modals
    const [isAddTransactionOpen, setAddTransactionOpen] = useState(false);
    const [isMarkHabitOpen, setMarkHabitOpen] = useState(false);
    const [isAddHealthLogOpen, setAddHealthLogOpen] = useState(false);
    const [isAddNoteOpen, setAddNoteOpen] = useState(false);
    const [isLogPrayerOpen, setLogPrayerOpen] = useState(false);
    
    // State for Notification Center
    const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

    // State for Cloud Sync
    const [isSyncing, setIsSyncing] = useState(true);

    // Check authentication status on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user || null);

                // If user is logged in, pull data from Supabase
                if (session?.user) {
                    console.log('User authenticated, pulling data from Supabase...');
                    await pullAllData();
                }
            } catch (error) {
                console.error('Auth check error:', error);
            } finally {
                setAuthLoading(false);
            }
        };

        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setUser(session?.user || null);

            if (event === 'SIGNED_IN' && session?.user) {
                console.log('User signed in, pulling data from Supabase...');
                await pullAllData();
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
                // Optionally clear local data
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

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
    
            const dueHabits = await db.habits
                .where({ reminderEnabled: true, reminderTime: currentTime })
                .toArray();
    
            if (dueHabits.length > 0) {
                 const completedTodayIds = new Set(
                    (await db.habitLogs.where({ date: todayStr }).toArray()).map(log => log.habitId)
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
            const dueHealthMetrics = await db.healthMetrics
                .where({ reminderEnabled: true, reminderTime: currentTime })
                .toArray();

            if (dueHealthMetrics.length > 0) {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                
                const loggedTodayMetricIds = new Set(
                    (await db.healthLogs.where('date').above(todayStart).toArray())
                        .map(log => log.metricId)
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

    // Effect for Cloud Sync
    useEffect(() => {
        const runSync = async () => {
            setIsSyncing(true);
            await syncAllData();
            setIsSyncing(false);
        };
        runSync();
    
        // Optionally, sync periodically
        const syncInterval = setInterval(runSync, 5 * 60 * 1000); // Sync every 5 minutes
        return () => clearInterval(syncInterval);
    }, []);

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
                isSyncing={isSyncing}
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
