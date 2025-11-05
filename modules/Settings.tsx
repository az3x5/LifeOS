import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import AlertModal from '../components/modals/AlertModal';

const Settings: React.FC = () => {
    const [cloudSync, setCloudSync] = useState(false);
    const [pinLock, setPinLock] = useState(false);
    const [reminders, setReminders] = useState(Notification.permission === 'granted');

    // State for Habit Preferences
    const [defaultReminderTime, setDefaultReminderTime] = useState('09:00');
    const [aiInsights, setAiInsights] = useState(true);
    const [gamification, setGamification] = useState(false);

    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);

    const integrationSetting = useLiveQuery(() => db.settings.get('islamicHabitIntegration'));
    const integrationEnabled = integrationSetting?.value ?? false;

    useEffect(() => {
        setReminders(Notification.permission === 'granted');
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
            <h1 className="text-4xl font-bold text-text-primary">Settings</h1>

            <SettingsCard title="Data & Sync">
                <SettingItem title="Enable Cloud Sync" description="Sync your data across devices with Supabase.">
                    <Toggle enabled={cloudSync} setEnabled={setCloudSync} title={cloudSync ? 'Disable Cloud Sync' : 'Enable Cloud Sync'} />
                </SettingItem>
                {cloudSync && (
                     <div className="mt-4 p-4 bg-accent/20 border border-accent/30 rounded-lg text-accent text-sm">
                        Cloud sync is a feature coming soon! Your data is currently saved only on this device.
                    </div>
                )}
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
            
             <SettingsCard title="Habit Preferences">
                <SettingItem title="Default Reminder Time" description="Set a default notification time for new habits.">
                    <input
                        type="time"
                        value={defaultReminderTime}
                        onChange={(e) => setDefaultReminderTime(e.target.value)}
                        className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                </SettingItem>
                 <SettingItem title="Enable AI Insights" description="Show smart tips on the habits analytics page.">
                    <Toggle enabled={aiInsights} setEnabled={setAiInsights} />
                </SettingItem>
                <SettingItem title="Enable Gamification" description="Earn XP and badges for completing habits.">
                    <Toggle enabled={gamification} setEnabled={setGamification} disabled={true} title="Gamification (coming soon)" />
                </SettingItem>
                <div className="border-t border-tertiary"></div>
                <SettingItem title="Import Habit Data" description="Import habits from a CSV file.">
                    <button disabled title="Import (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg text-sm opacity-50 cursor-not-allowed">Import</button>
                </SettingItem>
                 <SettingItem title="Export Habit Data" description="Export all your habits and logs to a CSV file.">
                    <button disabled title="Export (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg text-sm opacity-50 cursor-not-allowed">Export</button>
                </SettingItem>
             </SettingsCard>
            
            <SettingsCard title="Security">
                <SettingItem title="Enable PIN/Biometric Lock" description="Secure your financial records locally.">
                     <Toggle enabled={pinLock} setEnabled={setPinLock} disabled={true} title="PIN Lock (coming soon)" />
                </SettingItem>
                 <div className="mt-4 p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg text-yellow-300 text-sm">
                    Local encryption and biometric security features are coming soon!
                </div>
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
                <SettingItem title="Sign Out" description="Log out of your account">
                    <button
                        onClick={async () => {
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
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Sign Out
                    </button>
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="About">
                <p className="text-text-secondary">LifeOS is your personal dashboard for a more organized life. Built with React, TypeScript, and TailwindCSS. Data is synced securely to the cloud with Supabase and stored locally for offline access.</p>
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
        </div>
    );
};

export default Settings;