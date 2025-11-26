import React, { useState, useEffect, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { useSettings } from '../hooks/useSettings';
import { Setting, HabitCategory, Category, Transaction } from '../types';
import { supabase } from '../services/supabase';
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
import { getThemeMode, setThemeMode, type ThemeMode } from '../services/themeService';
import { habitsService, habitLogsService, habitCategoriesService, notesService, accountsService, transactionsService, categoriesService, healthMetricsService, healthLogsService, remindersService, fastingLogsService, islamicEventsService, dailyReflectionsService, settingsService } from '../services/dataService';

const Settings: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const { settings, updateSetting } = useSettings();

    const [pinLock, setPinLock] = useState(false);
    const [biometricLock, setBiometricLock] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [lockTimeout, setLockTimeoutState] = useState(5);
    const [reminders, setReminders] = useState(Notification.permission === 'granted');
    const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
    const [pinSetupModal, setPinSetupModal] = useState<{ isOpen: boolean; mode: 'setup' | 'change' } | null>(null);
    const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
    const [showManageFinanceCategoriesModal, setShowManageFinanceCategoriesModal] = useState(false);

    useEffect(() => {
        setReminders(Notification.permission === 'granted');

        // Get current user
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });

        // Load theme from localStorage (theme is still managed separately)
        const savedThemeMode = getThemeMode();
        setThemeModeState(savedThemeMode);

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
                habits: await habitsService.getAll(),
                habitLogs: await habitLogsService.getAll(),
                notes: await notesService.getAll(),
                accounts: await accountsService.getAll(),
                transactions: await transactionsService.getAll(),
                healthMetrics: await healthMetricsService.getAll(),
                healthLogs: await healthLogsService.getAll(),
                reminders: await remindersService.getAll(),
                fastingLogs: await fastingLogsService.getAll(),
                islamicEvents: await islamicEventsService.getAll(),
                dailyReflections: await dailyReflectionsService.getAll(),
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
                    // Clear localStorage
                    localStorage.clear();
                    // Note: Supabase data will remain on the server
                    // To fully clear, user would need to delete account
                    setAlertModal({
                        isOpen: true,
                        title: 'Data Cleared',
                        message: 'All local data has been cleared successfully. Cloud data remains safe.',
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
        const newValue = !settings.islamicHabitIntegration;
        await updateSetting('islamicHabitIntegration', newValue);

        if (newValue) {
            // Create system habits if they don't exist
            const allHabits = await habitsService.getAll();
            const existingFastingHabit = allHabits.find(h => h.origin === 'system-islamic' && h.name === 'Fasting');
            if (!existingFastingHabit) {
                await habitsService.create({
                    name: 'Fasting',
                    frequency: 'daily',
                    createdAt: new Date(),
                    xp: 25,
                    isFrozen: false,
                    origin: 'system-islamic'
                } as any);
            }

            const prayerHabitNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
            for (const prayerName of prayerHabitNames) {
                 const existingPrayerHabit = allHabits.find(h => h.origin === 'system-islamic' && h.name === prayerName);
                 if (!existingPrayerHabit) {
                     await habitsService.create({
                        name: prayerName,
                        frequency: 'daily',
                        createdAt: new Date(),
                        xp: 5,
                        isFrozen: true, // Frozen until prayer tracking is implemented
                        frozenFrom: new Date().toISOString().split('T')[0],
                        origin: 'system-islamic'
                     } as any);
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

            <SettingsCard title="Data Management">
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
                    <Toggle enabled={settings.islamicHabitIntegration} onClick={handleToggleIntegration} title={settings.islamicHabitIntegration ? 'Disable Sync' : 'Enable Sync'} />
                </SettingItem>
                {settings.islamicHabitIntegration && (
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
                <SettingItem title="Dark Mode" description="Switch between light and dark theme.">
                    <button
                        onClick={() => {
                            const newMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
                            setThemeModeState(newMode);
                            setThemeMode(newMode);
                        }}
                        className="relative inline-flex items-center h-10 w-20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-secondary"
                        style={{
                            backgroundColor: themeMode === 'dark' ? '#3B82F6' : '#CBD5E1'
                        }}
                    >
                        <span
                            className="inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform flex items-center justify-center"
                            style={{
                                transform: themeMode === 'dark' ? 'translateX(2.5rem)' : 'translateX(0.25rem)'
                            }}
                        >
                            {themeMode === 'dark' ? '🌙' : '☀️'}
                        </span>
                    </button>
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

             <SettingsCard title="✅ Habit Preferences">
                <SettingItem title="Manage Habit Categories" description="Add, edit, or delete your habit categories.">
                    <button onClick={() => setShowManageCategoriesModal(true)} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg text-sm">Manage</button>
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Default Reminder Time" description="Set a default notification time for new habits.">
                    <input
                        type="time"
                        value={settings.defaultReminderTime}
                        onChange={(e) => updateSetting('defaultReminderTime', e.target.value)}
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                </SettingItem>
                 <SettingItem title="Enable AI Insights" description="Show smart tips on the habits analytics page.">
                    <Toggle enabled={settings.aiInsights} setEnabled={(val) => updateSetting('aiInsights', val)} />
                </SettingItem>
                <SettingItem title="Enable Gamification" description="Earn XP and badges for completing habits.">
                    <Toggle enabled={settings.gamification} setEnabled={(val) => updateSetting('gamification', val)} disabled={true} title="Gamification (coming soon)" />
                </SettingItem>
             </SettingsCard>

            <SettingsCard title="📊 Health Preferences">
                <SettingItem title="Manage Health Metrics" description="Add, edit, or delete your health metrics.">
                    <button onClick={() => window.location.hash = '#/health'} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg text-sm">Go to Health</button>
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Default Metric Unit System" description="Choose between metric and imperial units.">
                    <select
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        value={settings.defaultMetricUnit}
                        onChange={(e) => updateSetting('defaultMetricUnit', e.target.value as 'metric' | 'imperial')}
                    >
                        <option value="metric">Metric</option>
                        <option value="imperial">Imperial</option>
                    </select>
                </SettingItem>
                <SettingItem title="Enable Health Reminders" description="Get reminded to log your health metrics.">
                    <Toggle enabled={settings.healthReminders} setEnabled={(val) => updateSetting('healthReminders', val)} disabled={true} title="Health Reminders (coming soon)" />
                </SettingItem>
                <SettingItem title="Export Health Data" description="Download all your health logs and metrics.">
                    <button disabled title="Export (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg text-sm opacity-50 cursor-not-allowed">Export CSV</button>
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="💰 Finance Preferences">
                <SettingItem title="Manage Finance Categories" description="Add, edit, or delete your income and expense categories.">
                    <button onClick={() => setShowManageFinanceCategoriesModal(true)} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg text-sm">Manage</button>
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Default Currency" description="Choose your preferred currency for transactions.">
                    <select
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        value={settings.defaultCurrency}
                        onChange={(e) => updateSetting('defaultCurrency', e.target.value)}
                    >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="INR">INR - Indian Rupee</option>
                        <option value="SAR">SAR - Saudi Riyal</option>
                        <option value="AED">AED - UAE Dirham</option>
                        <option value="MVR">MVR - Maldivian Rufiyaa</option>
                    </select>
                </SettingItem>
                <SettingItem title="Budget Alert Threshold" description="Get notified when spending reaches this percentage.">
                    <select
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        value={settings.budgetAlertThreshold}
                        onChange={(e) => updateSetting('budgetAlertThreshold', Number(e.target.value))}
                    >
                        <option value="50">50%</option>
                        <option value="75">75%</option>
                        <option value="90">90%</option>
                        <option value="95">95%</option>
                    </select>
                </SettingItem>
                <SettingItem title="Enable Budget Notifications" description="Get notified when approaching budget limits.">
                    <Toggle enabled={settings.budgetNotifications} setEnabled={(val) => updateSetting('budgetNotifications', val)} disabled={true} title="Budget Notifications (coming soon)" />
                </SettingItem>
                <SettingItem title="Show Net Worth on Dashboard" description="Display total net worth across all accounts.">
                    <Toggle enabled={settings.showNetWorth} setEnabled={(val) => updateSetting('showNetWorth', val)} />
                </SettingItem>
                <SettingItem title="Export Financial Data" description="Download all your transactions and accounts.">
                    <button disabled title="Export (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg text-sm opacity-50 cursor-not-allowed">Export CSV</button>
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="📝 Notes & Knowledge Preferences">
                <SettingItem title="Default Note View" description="Choose how notes are displayed by default.">
                    <select
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        value={settings.defaultNoteView}
                        onChange={(e) => updateSetting('defaultNoteView', e.target.value as 'grid' | 'list')}
                    >
                        <option value="grid">Grid View</option>
                        <option value="list">List View</option>
                    </select>
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Auto-Save Notes" description="Automatically save notes as you type.">
                    <Toggle enabled={settings.autoSaveNotes} setEnabled={(val) => updateSetting('autoSaveNotes', val)} />
                </SettingItem>
                <SettingItem title="Enable Markdown Preview" description="Show formatted preview while editing notes.">
                    <Toggle enabled={settings.markdownPreview} setEnabled={(val) => updateSetting('markdownPreview', val)} />
                </SettingItem>
                <SettingItem title="Default Font Size" description="Set the default text size for notes.">
                    <select
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        value={settings.defaultFontSize}
                        onChange={(e) => updateSetting('defaultFontSize', e.target.value as 'small' | 'medium' | 'large')}
                    >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                    </select>
                </SettingItem>
                <SettingItem title="Export Notes" description="Download all your notes and folders.">
                    <button disabled title="Export (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg text-sm opacity-50 cursor-not-allowed">Export</button>
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="☪️ Islamic Preferences">
                <SettingItem title="Prayer Calculation Method" description="Choose the method for prayer time calculations.">
                    <select
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        defaultValue="mwl"
                    >
                        <option value="mwl">Muslim World League</option>
                        <option value="isna">Islamic Society of North America</option>
                        <option value="egypt">Egyptian General Authority</option>
                        <option value="makkah">Umm Al-Qura University, Makkah</option>
                        <option value="karachi">University of Islamic Sciences, Karachi</option>
                    </select>
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Asr Calculation" description="Choose Asr prayer calculation method.">
                    <select
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        defaultValue="standard"
                    >
                        <option value="standard">Standard (Shafi, Maliki, Hanbali)</option>
                        <option value="hanafi">Hanafi</option>
                    </select>
                </SettingItem>
                <SettingItem title="Enable Prayer Notifications" description="Get notified at prayer times.">
                    <Toggle enabled={true} disabled={true} title="Prayer Notifications (coming soon)" />
                </SettingItem>
                <SettingItem title="Hijri Calendar Adjustment" description="Adjust Hijri date by days (±1 or ±2).">
                    <select
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        defaultValue="0"
                    >
                        <option value="-2">-2 days</option>
                        <option value="-1">-1 day</option>
                        <option value="0">No adjustment</option>
                        <option value="1">+1 day</option>
                        <option value="2">+2 days</option>
                    </select>
                </SettingItem>
                <SettingItem title="Show Qibla Direction" description="Display Qibla compass on dashboard.">
                    <Toggle enabled={true} setEnabled={() => {}} />
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="⚙️ Advanced Settings">
                <SettingItem title="Enable Offline Mode" description="Use app without internet connection.">
                    <Toggle enabled={settings.offlineMode} setEnabled={(val) => updateSetting('offlineMode', val)} />
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Auto-Sync Interval" description="How often to sync data with cloud.">
                    <select
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        value={settings.autoSyncInterval}
                        onChange={(e) => updateSetting('autoSyncInterval', e.target.value as any)}
                    >
                        <option value="realtime">Real-time</option>
                        <option value="5">Every 5 minutes</option>
                        <option value="15">Every 15 minutes</option>
                        <option value="30">Every 30 minutes</option>
                        <option value="manual">Manual only</option>
                    </select>
                </SettingItem>
                <SettingItem title="Cache Size Limit" description="Maximum storage for offline data.">
                    <select
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        defaultValue="100"
                    >
                        <option value="50">50 MB</option>
                        <option value="100">100 MB</option>
                        <option value="250">250 MB</option>
                        <option value="500">500 MB</option>
                    </select>
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Gemini API Key" description="Google Gemini API key for AI-powered insights.">
                    <input
                        type="password"
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent w-64"
                        placeholder="Enter your Gemini API key"
                        value={settings.geminiApiKey}
                        onChange={(e) => updateSetting('geminiApiKey', e.target.value)}
                    />
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Enable Debug Mode" description="Show detailed logs for troubleshooting.">
                    <Toggle enabled={false} setEnabled={() => {}} />
                </SettingItem>
                <SettingItem title="Reset All Settings" description="Restore all settings to default values.">
                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to reset all settings to default? This cannot be undone.')) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                        Reset Settings
                    </button>
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="🔄 Backup & Sync">
                <SettingItem title="Auto-Backup to Cloud" description="Automatically backup your data to Supabase.">
                    <Toggle enabled={settings.autoBackup} setEnabled={(val) => updateSetting('autoBackup', val)} />
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Backup Frequency" description="How often to create automatic backups.">
                    <select
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        value={settings.backupFrequency}
                        onChange={(e) => updateSetting('backupFrequency', e.target.value as any)}
                    >
                        <option value="realtime">Real-time</option>
                        <option value="hourly">Every hour</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </SettingItem>
                <SettingItem title="Include Media in Backup" description="Backup images and attachments.">
                    <Toggle enabled={true} setEnabled={() => {}} disabled={true} title="Media backup (coming soon)" />
                </SettingItem>
                <SettingItem title="Last Backup" description="View when data was last backed up.">
                    <span className="text-sm text-text-secondary">{settings.lastBackup || 'Never'}</span>
                </SettingItem>
                <SettingItem title="Restore from Backup" description="Restore your data from a previous backup.">
                    <button disabled title="Restore (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg text-sm opacity-50 cursor-not-allowed">Restore</button>
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="🔒 Security">
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

            <SettingsCard title="🔐 Privacy">
                <SettingItem title="Analytics & Crash Reports" description="Help improve LifeOS by sharing anonymous usage data.">
                    <Toggle enabled={false} setEnabled={() => {}} />
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Location Services" description="Allow app to access your location for prayer times.">
                    <Toggle enabled={true} setEnabled={() => {}} />
                </SettingItem>
                <SettingItem title="Camera Access" description="Allow app to access camera for scanning documents.">
                    <Toggle enabled={false} setEnabled={() => {}} />
                </SettingItem>
                <SettingItem title="Microphone Access" description="Allow app to record voice notes.">
                    <Toggle enabled={false} setEnabled={() => {}} />
                </SettingItem>
                <SettingItem title="Data Sharing" description="Share data with third-party services.">
                    <Toggle enabled={false} setEnabled={() => {}} />
                </SettingItem>
                <SettingItem title="Privacy Policy" description="Read our privacy policy and terms of service.">
                    <button
                        onClick={() => window.open('https://lifeos.app/privacy', '_blank')}
                        className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                        View Policy
                    </button>
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="🔌 Device Integration">
                <SettingItem title="Connect Fitbit" description="Import steps, sleep, and weight data.">
                    <button disabled title="Connect Fitbit (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed">Connect</button>
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Connect Google Fit" description="Import activity and health data.">
                    <button disabled title="Connect Google Fit (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed">Connect</button>
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Connect Apple Health" description="Sync health metrics with Apple Health.">
                    <button disabled title="Connect Apple Health (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed">Connect</button>
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Connect Google Calendar" description="Sync tasks and events with Google Calendar.">
                    <button disabled title="Connect Google Calendar (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed">Connect</button>
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Connect Notion" description="Import notes and databases from Notion.">
                    <button disabled title="Connect Notion (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed">Connect</button>
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
                                        localStorage.clear();
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

            <SettingsCard title="ℹ️ About LifeOS">
                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium text-text-primary mb-2">LifeOS v1.0.0</h3>
                        <p className="text-text-secondary text-sm">
                            Your personal life operating system. A comprehensive productivity and life management platform
                            built with modern web technologies. Track habits, manage finances, monitor health, organize notes,
                            and integrate Islamic practices - all in one place.
                        </p>
                    </div>
                    <div className="border-t border-tertiary"></div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-text-muted">Framework</p>
                            <p className="text-text-primary font-medium">React 18 + Vite</p>
                        </div>
                        <div>
                            <p className="text-text-muted">Language</p>
                            <p className="text-text-primary font-medium">TypeScript</p>
                        </div>
                        <div>
                            <p className="text-text-muted">Database</p>
                            <p className="text-text-primary font-medium">Supabase</p>
                        </div>
                        <div>
                            <p className="text-text-muted">Styling</p>
                            <p className="text-text-primary font-medium">TailwindCSS</p>
                        </div>
                        <div>
                            <p className="text-text-muted">Charts</p>
                            <p className="text-text-primary font-medium">Recharts</p>
                        </div>
                        <div>
                            <p className="text-text-muted">PWA</p>
                            <p className="text-text-primary font-medium">Vite PWA</p>
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
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-text-muted">Total Modules</p>
                            <p className="text-text-primary font-medium">7 Modules</p>
                        </div>
                        <div>
                            <p className="text-text-muted">Last Updated</p>
                            <p className="text-text-primary font-medium">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="border-t border-tertiary"></div>
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href="https://github.com/az3x5/LifeOS"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent/80 text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">code</span>
                            GitHub Repository
                        </a>
                        <a
                            href="https://github.com/az3x5/LifeOS/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent/80 text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">bug_report</span>
                            Report Issue
                        </a>
                        <a
                            href="https://github.com/az3x5/LifeOS/blob/main/README.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent/80 text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">description</span>
                            Documentation
                        </a>
                        <a
                            href="https://github.com/az3x5/LifeOS/releases"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent/80 text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">new_releases</span>
                            Release Notes
                        </a>
                        <button
                            onClick={() => {
                                setAlertModal({
                                    isOpen: true,
                                    title: 'Contact Support',
                                    message: 'Email us at support@lifeos.app or open an issue on GitHub.',
                                    icon: '📧'
                                });
                            }}
                            className="text-accent hover:text-accent/80 text-sm font-medium transition-colors flex items-center gap-2 text-left"
                        >
                            <span className="material-symbols-outlined text-base">support</span>
                            Contact Support
                        </button>
                        <button
                            onClick={() => {
                                setAlertModal({
                                    isOpen: true,
                                    title: 'Rate LifeOS',
                                    message: 'Thank you for using LifeOS! Please rate us on GitHub by starring the repository.',
                                    icon: '⭐'
                                });
                            }}
                            className="text-accent hover:text-accent/80 text-sm font-medium transition-colors flex items-center gap-2 text-left"
                        >
                            <span className="material-symbols-outlined text-base">star</span>
                            Rate LifeOS
                        </button>
                    </div>
                    <div className="border-t border-tertiary"></div>
                    <div className="text-center text-sm text-text-muted">
                        <p>Made with ❤️ by the LifeOS Team</p>
                        <p className="mt-1">© 2024 LifeOS. All rights reserved.</p>
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

            {showManageCategoriesModal && (
                <ManageHabitCategoriesModal
                    isOpen={showManageCategoriesModal}
                    onClose={() => setShowManageCategoriesModal(false)}
                />
            )}

            {showManageFinanceCategoriesModal && (
                <ManageFinanceCategoriesModal
                    closeModal={() => setShowManageFinanceCategoriesModal(false)}
                />
            )}
        </div>
    );
};

// Manage Habit Categories Modal
const ManageHabitCategoriesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const categories = useSupabaseQuery<HabitCategory>('habit_categories');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('🎯');
    const [newCategoryColor, setNewCategoryColor] = useState('#6366F1');
    const [editingCategory, setEditingCategory] = useState<HabitCategory | null>(null);

    const categoryIcons = ['🎯', '💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🎨', '🎵', '💼', '🧠', '❤️', '🌟', '⚡'];
    const categoryColors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        await habitCategoriesService.create({
            name: newCategoryName.trim(),
            icon: newCategoryIcon,
            color: newCategoryColor
        });
        setNewCategoryName('');
        setNewCategoryIcon('🎯');
        setNewCategoryColor('#6366F1');
    };

    const handleUpdateCategory = async () => {
        if (!editingCategory || !newCategoryName.trim()) return;
        await habitCategoriesService.update(editingCategory.id!, {
            name: newCategoryName.trim(),
            icon: newCategoryIcon,
            color: newCategoryColor
        });
        setEditingCategory(null);
        setNewCategoryName('');
        setNewCategoryIcon('🎯');
        setNewCategoryColor('#6366F1');
    };

    const handleDeleteCategory = async (id: number) => {
        if (confirm('Are you sure you want to delete this category? Habits using this category will not be deleted.')) {
            await habitCategoriesService.delete(id);
        }
    };

    const startEdit = (category: HabitCategory) => {
        setEditingCategory(category);
        setNewCategoryName(category.name);
        setNewCategoryIcon(category.icon || '🎯');
        setNewCategoryColor(category.color || '#6366F1');
    };

    const cancelEdit = () => {
        setEditingCategory(null);
        setNewCategoryName('');
        setNewCategoryIcon('🎯');
        setNewCategoryColor('#6366F1');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-tertiary">
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-text-primary">Manage Habit Categories</h2>
                        <button onClick={onClose} className="p-2 hover:bg-tertiary rounded-lg transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Add/Edit Category Form */}
                    <div className="bg-primary border border-tertiary rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold text-text-primary">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Category Name</label>
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="e.g., Fitness, Reading, Meditation"
                                className="w-full bg-secondary border border-tertiary rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Icon</label>
                            <div className="grid grid-cols-8 gap-2">
                                {categoryIcons.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setNewCategoryIcon(emoji)}
                                        className={`p-2 text-2xl rounded-lg transition-all ${
                                            newCategoryIcon === emoji
                                                ? 'bg-accent/20 ring-2 ring-accent scale-110'
                                                : 'bg-tertiary hover:bg-tertiary/80'
                                        }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
                            <div className="grid grid-cols-8 gap-2">
                                {categoryColors.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setNewCategoryColor(c)}
                                        className={`w-10 h-10 rounded-lg transition-all ${
                                            newCategoryColor === c ? 'ring-2 ring-white scale-110' : ''
                                        }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {editingCategory ? (
                                <>
                                    <button
                                        onClick={handleUpdateCategory}
                                        disabled={!newCategoryName.trim()}
                                        className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium disabled:opacity-50"
                                    >
                                        Update Category
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        className="px-4 py-2 bg-tertiary text-text-primary rounded-lg hover:bg-tertiary/80 font-medium"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleAddCategory}
                                    disabled={!newCategoryName.trim()}
                                    className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium disabled:opacity-50"
                                >
                                    Add Category
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Categories List */}
                    <div>
                        <h3 className="font-semibold text-text-primary mb-3">Your Categories</h3>
                        {categories && categories.length > 0 ? (
                            <div className="space-y-2">
                                {categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex items-center justify-between p-3 bg-primary border border-tertiary rounded-lg hover:bg-primary/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                                style={{ backgroundColor: category.color + '20' }}
                                            >
                                                {category.icon}
                                            </div>
                                            <span className="font-medium text-text-primary">{category.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => startEdit(category)}
                                                className="px-3 py-1 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(category.id!)}
                                                className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-text-secondary text-center py-8">No categories yet. Add your first category above!</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MANAGE FINANCE CATEGORIES MODAL ---
const ManageFinanceCategoriesModal: React.FC<{ closeModal: () => void }> = ({ closeModal }) => {
    const categories = useSupabaseQuery<Category>('categories');
    const transactions = useSupabaseQuery<Transaction>('transactions');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        await categoriesService.create({ name: newCategoryName.trim(), type: newCategoryType, icon: 'category' });
        setNewCategoryName('');
    };

    const handleDeleteCategory = async (id: number) => {
        const txs = transactions?.filter(t => t.categoryId === id) || [];
        if (txs.length > 0) {
            alert("Cannot delete category with associated transactions.");
            return;
        }
        if (window.confirm("Delete this category?")) {
            await categoriesService.delete(id);
        }
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-tertiary">
                <h2 className="text-3xl font-bold mb-6 text-text-primary">Manage Finance Categories</h2>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold mb-2 text-text-primary">Income Categories</h3>
                        <ul className="space-y-2">
                            {categories?.filter(c => c.type === 'income').map(c => (
                                <li key={c.id} className="flex justify-between items-center p-2 bg-primary rounded">
                                    <span className="text-text-primary">{c.name}</span>
                                    <button
                                        onClick={() => handleDeleteCategory(c.id!)}
                                        className="text-red-500 hover:text-red-600 text-xs font-medium"
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2 text-text-primary">Expense Categories</h3>
                        <ul className="space-y-2">
                            {categories?.filter(c => c.type === 'expense').map(c => (
                                <li key={c.id} className="flex justify-between items-center p-2 bg-primary rounded">
                                    <span className="text-text-primary">{c.name}</span>
                                    <button
                                        onClick={() => handleDeleteCategory(c.id!)}
                                        className="text-red-500 hover:text-red-600 text-xs font-medium"
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="border-t border-tertiary mt-6 pt-6">
                    <h3 className="font-semibold mb-4 text-text-primary">Add New Category</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            placeholder="Category Name"
                            className="flex-grow bg-primary border border-tertiary rounded-lg py-2 px-3 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <select
                            value={newCategoryType}
                            onChange={e => setNewCategoryType(e.target.value as 'income' | 'expense')}
                            className="bg-primary border border-tertiary rounded-lg py-2 px-3 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                        <button
                            onClick={handleAddCategory}
                            className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            Add
                        </button>
                    </div>
                </div>
                <div className="flex justify-end pt-6">
                    <button
                        onClick={closeModal}
                        className="bg-tertiary hover:bg-opacity-80 text-text-primary py-2 px-6 rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;