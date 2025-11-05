import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { forceSyncNow } from '../services/syncService';
import AlertModal from '../components/modals/AlertModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import PinSetupModal from '../components/modals/PinSetupModal';
import {
    setupPin,
    changePin,
    removePin,
    isPinSet,
    isLockEnabled,
    isBiometricAvailable,
    isBiometricEnabled,
    setBiometricEnabled,
    setLockTimeout,
    getLockTimeout
} from '../services/securityService';

const Settings: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [cloudSync, setCloudSync] = useState(false);
    const [autoSync, setAutoSync] = useState(true);
    const [syncInterval, setSyncInterval] = useState('5');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    const [pinLock, setPinLock] = useState(false);
    const [biometricLock, setBiometricLock] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [lockTimeout, setLockTimeoutState] = useState(5);
    const [reminders, setReminders] = useState(Notification.permission === 'granted');
    const [theme, setTheme] = useState('dark');
    const [language, setLanguage] = useState('en');

    // State for Habit Preferences
    const [defaultReminderTime, setDefaultReminderTime] = useState('09:00');
    const [aiInsights, setAiInsights] = useState(true);
    const [gamification, setGamification] = useState(false);
    const [weekStartsOn, setWeekStartsOn] = useState('sunday');

    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
    const [pinSetupModal, setPinSetupModal] = useState<{ isOpen: boolean; mode: 'setup' | 'change' } | null>(null);

    const integrationSetting = useLiveQuery(() => db.settings.get('islamicHabitIntegration'));
    const integrationEnabled = integrationSetting?.value ?? false;

    useEffect(() => {
        setReminders(Notification.permission === 'granted');

        // Get current user
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });

        // Load settings from localStorage
        const savedTheme = localStorage.getItem('theme') || 'dark';
        const savedLanguage = localStorage.getItem('language') || 'en';
        const savedWeekStart = localStorage.getItem('weekStartsOn') || 'sunday';
        const savedReminderTime = localStorage.getItem('defaultReminderTime') || '09:00';
        const savedAutoSync = localStorage.getItem('autoSync') !== 'false';
        const savedSyncInterval = localStorage.getItem('syncInterval') || '5';
        const savedLastSync = localStorage.getItem('lastSyncTime');

        setTheme(savedTheme);
        setLanguage(savedLanguage);
        setWeekStartsOn(savedWeekStart);
        setDefaultReminderTime(savedReminderTime);
        setAutoSync(savedAutoSync);
        setSyncInterval(savedSyncInterval);
        setLastSyncTime(savedLastSync);

        // Load security settings
        const loadSecuritySettings = async () => {
            setPinLock(isLockEnabled());
            setBiometricLock(isBiometricEnabled());
            setLockTimeoutState(getLockTimeout());

            const available = await isBiometricAvailable();
            setBiometricAvailable(available);
        };
        loadSecuritySettings();
    }, []);

    const handleManualSync = async () => {
        setSyncing(true);
        try {
            await forceSyncNow();
            const now = new Date().toLocaleString();
            setLastSyncTime(now);
            localStorage.setItem('lastSyncTime', now);
            setAlertModal({
                isOpen: true,
                title: 'Sync Complete',
                message: 'Your data has been successfully synced with the cloud (two-way sync)!',
                icon: '✅'
            });
        } catch (error: any) {
            setAlertModal({
                isOpen: true,
                title: 'Sync Failed',
                message: error.message || 'Failed to sync data. Please try again.',
                icon: '❌'
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleToggleReminders = async () => {
        if (Notification.permission === 'granted') {
            setAlertModal({
                isOpen: true,
                title: 'Notifications',
                message: "Notifications are managed in your browser settings.",
                icon: '🔔'
            });
            return;
        }

        const permission = await Notification.requestPermission();
        setReminders(permission === 'granted');

        if (permission === 'granted') {
            new Notification("LifeOS Reminders Enabled", {
                body: "You'll now receive reminders for your habits!",
            });
        }
    };

    const handleExportData = async () => {
        try {
            const data = {
                habits: await db.habits.toArray(),
                habitLogs: await db.habitLogs.toArray(),
                notes: await db.notes.toArray(),
                accounts: await db.accounts.toArray(),
                transactions: await db.transactions.toArray(),
                healthMetrics: await db.healthMetrics.toArray(),
                healthLogs: await db.healthLogs.toArray(),
                reminders: await db.reminders.toArray(),
                fastingLogs: await db.fastingLogs.toArray(),
                islamicEvents: await db.islamicEvents.toArray(),
                dailyReflections: await db.dailyReflections.toArray(),
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setAlertModal({
                isOpen: true,
                title: 'Export Successful',
                message: 'Your data has been exported successfully!',
                icon: '📥'
            });
        } catch (error: any) {
            setAlertModal({
                isOpen: true,
                title: 'Export Failed',
                message: error.message || 'Failed to export data.',
                icon: '❌'
            });
        }
    };

    const handleClearAllData = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Clear All Data',
            message: 'Are you sure you want to delete ALL local data? This action cannot be undone. Your cloud data will remain safe.',
            onConfirm: async () => {
                try {
                    await db.delete();
                    await db.open();
                    setAlertModal({
                        isOpen: true,
                        title: 'Data Cleared',
                        message: 'All local data has been cleared successfully.',
                        icon: '🗑️'
                    });
                } catch (error: any) {
                    setAlertModal({
                        isOpen: true,
                        title: 'Error',
                        message: error.message || 'Failed to clear data.',
                        icon: '❌'
                    });
                }
                setConfirmModal(null);
            }
        });
    };

    const handleChangePassword = async () => {
        setAlertModal({
            isOpen: true,
            title: 'Change Password',
            message: 'Password reset email will be sent to your email address. Check your inbox!',
            icon: '📧'
        });

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '', {
                redirectTo: window.location.origin,
            });

            if (error) throw error;
        } catch (error: any) {
            setAlertModal({
                isOpen: true,
                title: 'Error',
                message: error.message || 'Failed to send reset email.',
                icon: '❌'
            });
        }
    };

    // Security handlers
    const handleTogglePinLock = () => {
        if (pinLock) {
            // Disable PIN lock
            setConfirmModal({
                isOpen: true,
                title: 'Disable PIN Lock',
                message: 'Are you sure you want to disable PIN lock? Your app will no longer be protected.',
                onConfirm: () => {
                    removePin();
                    setPinLock(false);
                    setBiometricLock(false);
                    setAlertModal({
                        isOpen: true,
                        title: 'PIN Lock Disabled',
                        message: 'Your app is no longer protected with a PIN.',
                        icon: '🔓'
                    });
                }
            });
        } else {
            // Enable PIN lock - show setup modal
            setPinSetupModal({ isOpen: true, mode: 'setup' });
        }
    };

    const handleSetupPin = async (pin: string): Promise<boolean> => {
        const success = await setupPin(pin);
        if (success) {
            setPinLock(true);
            setAlertModal({
                isOpen: true,
                title: 'PIN Lock Enabled',
                message: 'Your app is now protected with a PIN!',
                icon: '🔒'
            });
        } else {
            setAlertModal({
                isOpen: true,
                title: 'Setup Failed',
                message: 'Failed to set up PIN. Please try again.',
                icon: '❌'
            });
        }
        return success;
    };

    const handleChangePin = () => {
        setPinSetupModal({ isOpen: true, mode: 'change' });
    };

    const handleToggleBiometric = async () => {
        if (!pinLock) {
            setAlertModal({
                isOpen: true,
                title: 'PIN Required',
                message: 'Please enable PIN lock first before enabling biometric authentication.',
                icon: '⚠️'
            });
            return;
        }

        if (!biometricAvailable) {
            setAlertModal({
                isOpen: true,
                title: 'Not Available',
                message: 'Biometric authentication is not available on this device.',
                icon: '❌'
            });
            return;
        }

        const newValue = !biometricLock;
        const success = await setBiometricEnabled(newValue);

        if (success) {
            setBiometricLock(newValue);
            setAlertModal({
                isOpen: true,
                title: newValue ? 'Biometric Enabled' : 'Biometric Disabled',
                message: newValue
                    ? 'You can now use biometric authentication to unlock the app!'
                    : 'Biometric authentication has been disabled.',
                icon: newValue ? '👆' : '🔒'
            });
        } else {
            setAlertModal({
                isOpen: true,
                title: 'Failed',
                message: 'Failed to ' + (newValue ? 'enable' : 'disable') + ' biometric authentication.',
                icon: '❌'
            });
        }
    };

    const handleLockTimeoutChange = (minutes: number) => {
        setLockTimeoutState(minutes);
        setLockTimeout(minutes);
    };

    const handleToggleIntegration = async () => {
        const newValue = !integrationEnabled;
        await db.settings.put({ key: 'islamicHabitIntegration', value: newValue });
    
        if (newValue) {
            // Create system habits if they don't exist
            const existingFastingHabit = await db.habits.where({ origin: 'system-islamic', name: 'Fasting' }).first();
            if (!existingFastingHabit) {
                await db.habits.add({
                    name: 'Fasting',
                    frequency: 'daily',
                    createdAt: new Date(),
                    xp: 25,
                    isFrozen: false,
                    origin: 'system-islamic'
                });
            }
            
            const prayerHabitNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
            for (const prayerName of prayerHabitNames) {
                 const existingPrayerHabit = await db.habits.where({ origin: 'system-islamic', name: prayerName }).first();
                 if (!existingPrayerHabit) {
                     await db.habits.add({
                        name: prayerName,
                        frequency: 'daily',
                        createdAt: new Date(),
                        xp: 5,
                        isFrozen: true, // Frozen until prayer tracking is implemented
                        frozenFrom: new Date().toISOString().split('T')[0],
                        origin: 'system-islamic'
                     });
                 }
            }
            setAlertModal({
                isOpen: true,
                title: 'Islamic Practices Sync Enabled',
                message: "Islamic practices sync enabled! New habits for 'Fasting' and 'Daily Prayers' have been added to your Habit Tracker.",
                icon: '🕌'
            });
        }
    };


    const Toggle: React.FC<{ enabled: boolean; setEnabled?: (enabled: boolean) => void, onClick?: () => void, disabled?: boolean, title?: string }> = ({ enabled, setEnabled, onClick, disabled = false, title }) => (
        <button
            onClick={() => {
                if(disabled) return;
                if(onClick) onClick();
                else if(setEnabled) setEnabled(!enabled);
            }}
            disabled={disabled}
            title={title}
            className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-accent ${enabled ? 'bg-accent' : 'bg-tertiary'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <span
                className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    );

    const SettingsCard: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
        <div className="bg-secondary p-6 rounded-xl border border-tertiary">
            <h2 className="text-2xl font-semibold mb-6 text-text-primary">{title}</h2>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
    
    const SettingItem: React.FC<{title: string; description: string; children: React.ReactNode}> = ({ title, description, children }) => (
         <div className="flex items-center justify-between">
            <div>
                <h3 className="font-medium text-text-primary">{title}</h3>
                <p className="text-sm text-text-muted">{description}</p>
            </div>
            {children}
        </div>
    );


    return (
        <div className="space-y-8 max-w-3xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-text-primary">Settings</h1>
                {user && (
                    <div className="text-right">
                        <p className="text-sm text-text-muted">Signed in as</p>
                        <p className="text-sm font-medium text-text-primary">{user.email}</p>
                    </div>
                )}
            </div>

            <SettingsCard title="Data & Sync">
                <SettingItem title="Manual Sync" description="Sync your data with the cloud right now.">
                    <button
                        onClick={handleManualSync}
                        disabled={syncing}
                        className="bg-accent hover:bg-accent/90 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                </SettingItem>
                {lastSyncTime && (
                    <div className="text-sm text-text-muted">
                        Last synced: {lastSyncTime}
                    </div>
                )}
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Auto Sync" description="Automatically sync data in the background.">
                    <Toggle
                        enabled={autoSync}
                        setEnabled={(val) => {
                            setAutoSync(val);
                            localStorage.setItem('autoSync', val.toString());
                        }}
                    />
                </SettingItem>
                {autoSync && (
                    <SettingItem title="Sync Interval" description="How often to sync automatically (minutes).">
                        <select
                            value={syncInterval}
                            onChange={(e) => {
                                setSyncInterval(e.target.value);
                                localStorage.setItem('syncInterval', e.target.value);
                            }}
                            className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                            <option value="1">1 minute</option>
                            <option value="5">5 minutes</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                        </select>
                    </SettingItem>
                )}
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Export All Data" description="Download all your data as a JSON file.">
                    <button
                        onClick={handleExportData}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Export
                    </button>
                </SettingItem>
                <SettingItem title="Clear Local Data" description="Delete all data stored on this device.">
                    <button
                        onClick={handleClearAllData}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Clear Data
                    </button>
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="Module Integrations">
                <SettingItem title="Sync Islamic Practices with Habits" description="Automatically log fasts and prayers in the Habit Tracker.">
                    <Toggle enabled={integrationEnabled} onClick={handleToggleIntegration} title={integrationEnabled ? 'Disable Sync' : 'Enable Sync'} />
                </SettingItem>
                {integrationEnabled && (
                    <div className="mt-4 p-4 bg-accent/20 border border-accent/30 rounded-lg text-accent text-sm">
                        Integration is active. System habits for 'Fasting' and daily prayers are now available in the Habit Tracker.
                    </div>
                )}
            </SettingsCard>

             <SettingsCard title="Notifications">
                 <SettingItem title="Enable Habit Reminders" description="Get PWA notifications for incomplete habits.">
                    <Toggle enabled={reminders} onClick={handleToggleReminders} title={reminders ? 'Notifications are enabled' : 'Enable notifications'} />
                 </SettingItem>
                 {reminders && (
                     <div className="mt-4 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
                        Habit reminders are enabled.
                    </div>
                )}
             </SettingsCard>
            
            <SettingsCard title="Appearance">
                <SettingItem title="Theme" description="Choose your preferred color theme.">
                    <select
                        value={theme}
                        onChange={(e) => {
                            setTheme(e.target.value);
                            localStorage.setItem('theme', e.target.value);
                        }}
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                        <option value="dark">Dark</option>
                        <option value="light">Light (Coming Soon)</option>
                        <option value="auto">Auto (Coming Soon)</option>
                    </select>
                </SettingItem>
                <SettingItem title="Language" description="Choose your preferred language.">
                    <select
                        value={language}
                        onChange={(e) => {
                            setLanguage(e.target.value);
                            localStorage.setItem('language', e.target.value);
                        }}
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                        <option value="en">English</option>
                        <option value="ar">العربية (Coming Soon)</option>
                        <option value="es">Español (Coming Soon)</option>
                    </select>
                </SettingItem>
                <SettingItem title="Week Starts On" description="Choose the first day of the week.">
                    <select
                        value={weekStartsOn}
                        onChange={(e) => {
                            setWeekStartsOn(e.target.value);
                            localStorage.setItem('weekStartsOn', e.target.value);
                        }}
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                        <option value="sunday">Sunday</option>
                        <option value="monday">Monday</option>
                        <option value="saturday">Saturday</option>
                    </select>
                </SettingItem>
            </SettingsCard>

             <SettingsCard title="Habit Preferences">
                <SettingItem title="Default Reminder Time" description="Set a default notification time for new habits.">
                    <input
                        type="time"
                        value={defaultReminderTime}
                        onChange={(e) => {
                            setDefaultReminderTime(e.target.value);
                            localStorage.setItem('defaultReminderTime', e.target.value);
                        }}
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                </SettingItem>
                 <SettingItem title="Enable AI Insights" description="Show smart tips on the habits analytics page.">
                    <Toggle enabled={aiInsights} setEnabled={setAiInsights} />
                </SettingItem>
                <SettingItem title="Enable Gamification" description="Earn XP and badges for completing habits.">
                    <Toggle enabled={gamification} setEnabled={setGamification} disabled={true} title="Gamification (coming soon)" />
                </SettingItem>
             </SettingsCard>
            
            <SettingsCard title="Security">
                <SettingItem title="Enable PIN Lock" description="Protect your app with a PIN code.">
                    <Toggle enabled={pinLock} setEnabled={handleTogglePinLock} />
                </SettingItem>

                {pinLock && (
                    <>
                        <div className="border-t border-tertiary"></div>
                        <SettingItem title="Change PIN" description="Update your PIN code.">
                            <button
                                onClick={handleChangePin}
                                className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Change PIN
                            </button>
                        </SettingItem>

                        <div className="border-t border-tertiary"></div>
                        <SettingItem
                            title="Enable Biometric Authentication"
                            description={biometricAvailable ? "Use fingerprint or face recognition to unlock." : "Not available on this device."}
                        >
                            <Toggle
                                enabled={biometricLock}
                                setEnabled={handleToggleBiometric}
                                disabled={!biometricAvailable}
                                title={!biometricAvailable ? "Not available" : undefined}
                            />
                        </SettingItem>

                        <div className="border-t border-tertiary"></div>
                        <SettingItem title="Auto-Lock Timeout" description="Lock app after inactivity.">
                            <select
                                value={lockTimeout}
                                onChange={(e) => handleLockTimeoutChange(parseInt(e.target.value))}
                                className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                                <option value="1">1 minute</option>
                                <option value="5">5 minutes</option>
                                <option value="15">15 minutes</option>
                                <option value="30">30 minutes</option>
                                <option value="60">1 hour</option>
                            </select>
                        </SettingItem>
                    </>
                )}

                {pinLock && (
                    <div className="mt-4 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
                        🔒 Your app is protected with {biometricLock ? 'PIN and biometric' : 'PIN'} authentication.
                    </div>
                )}
            </SettingsCard>
           
            <SettingsCard title="Device Integration">
                <SettingItem title="Connect Fitbit" description="Import steps, sleep, and weight data.">
                    <button disabled title="Connect Fitbit (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed">Connect</button>
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                 <SettingItem title="Connect Google Fit" description="Import activity and health data.">
                    <button disabled title="Connect Google Fit (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed">Connect</button>
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="Account">
                {user && (
                    <>
                        <div className="p-4 bg-tertiary rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-2xl font-bold text-white">
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-text-primary">{user.email}</p>
                                    <p className="text-sm text-text-muted">
                                        Member since {new Date(user.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-tertiary"></div>
                        <SettingItem title="Change Password" description="Reset your account password">
                            <button
                                onClick={handleChangePassword}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Reset Password
                            </button>
                        </SettingItem>
                        <div className="border-t border-tertiary"></div>
                    </>
                )}
                <SettingItem title="Sign Out" description="Log out of your account and clear local data">
                    <button
                        onClick={async () => {
                            setConfirmModal({
                                isOpen: true,
                                title: 'Sign Out',
                                message: 'Are you sure you want to sign out? Your local data will be cleared.',
                                onConfirm: async () => {
                                    const { error } = await supabase.auth.signOut();
                                    if (error) {
                                        setAlertModal({
                                            isOpen: true,
                                            title: 'Error',
                                            message: 'Failed to sign out: ' + error.message,
                                            icon: '❌'
                                        });
                                    } else {
                                        // Clear local data on sign out
                                        await db.delete();
                                        window.location.reload();
                                    }
                                    setConfirmModal(null);
                                }
                            });
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Sign Out
                    </button>
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="About">
                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium text-text-primary mb-2">LifeOS v1.0.0</h3>
                        <p className="text-text-secondary text-sm">
                            Your personal life operating system. Built with React, TypeScript, and TailwindCSS.
                            Data is synced securely to the cloud with Supabase and stored locally for offline access.
                        </p>
                    </div>
                    <div className="border-t border-tertiary"></div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-text-muted">Framework</p>
                            <p className="text-text-primary font-medium">React 18 + Vite</p>
                        </div>
                        <div>
                            <p className="text-text-muted">Database</p>
                            <p className="text-text-primary font-medium">Supabase + Dexie</p>
                        </div>
                        <div>
                            <p className="text-text-muted">Hosting</p>
                            <p className="text-text-primary font-medium">Vercel</p>
                        </div>
                        <div>
                            <p className="text-text-muted">License</p>
                            <p className="text-text-primary font-medium">MIT</p>
                        </div>
                    </div>
                    <div className="border-t border-tertiary"></div>
                    <div className="flex gap-4">
                        <a
                            href="https://github.com/az3x5/LifeOS"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent/80 text-sm font-medium transition-colors"
                        >
                            📦 GitHub Repository
                        </a>
                        <a
                            href="https://github.com/az3x5/LifeOS/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent/80 text-sm font-medium transition-colors"
                        >
                            🐛 Report Issue
                        </a>
                    </div>
                </div>
            </SettingsCard>

            {alertModal && (
                <AlertModal
                    isOpen={alertModal.isOpen}
                    title={alertModal.title}
                    message={alertModal.message}
                    icon={alertModal.icon || "⚠️"}
                    onClose={() => setAlertModal(null)}
                />
            )}

            {confirmModal && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}

            {pinSetupModal && (
                <PinSetupModal
                    isOpen={pinSetupModal.isOpen}
                    mode={pinSetupModal.mode}
                    onClose={() => setPinSetupModal(null)}
                    onSetup={handleSetupPin}
                />
            )}
        </div>
    );
};

export default Settings;