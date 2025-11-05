import Dexie, { Table } from 'dexie';
import {
    Account, Transaction, Category, Budget, SavingsGoal,
    Habit, HabitLog, Routine, UserProfile, Badge, UserBadge,
    HealthMetric, HealthLog, HealthGoal,
    Note, Folder,
    FastingLog, PrayerLog, LearningMaterial, LearningLog, Bookmark,
    IslamicEvent, DailyReflection, Setting, SmartInsight, AppNotification, Reminder
} from '../types';
import { learningMaterials } from '../data/learning-data';

export class LifeOSDexie extends Dexie {
    // Finance
    accounts!: Table<Account>;
    transactions!: Table<Transaction>;
    categories!: Table<Category>;
    budgets!: Table<Budget>;
    savingsGoals!: Table<SavingsGoal>;

    // Habits
    habits!: Table<Habit>;
    habitLogs!: Table<HabitLog>;
    routines!: Table<Routine>;
    userProfile!: Table<UserProfile>;
    badges!: Table<Badge>;
    userBadges!: Table<UserBadge>;

    // Health
    healthMetrics!: Table<HealthMetric>;
    healthLogs!: Table<HealthLog>;
    healthGoals!: Table<HealthGoal>;

    // Notes
    notes!: Table<Note>;
    folders!: Table<Folder>;
    
    // Islamic
    fastingLogs!: Table<FastingLog>;
    prayerLogs!: Table<PrayerLog>;
    learningMaterials!: Table<LearningMaterial>;
    learningLogs!: Table<LearningLog>;
    bookmarks!: Table<Bookmark>;
    islamicEvents!: Table<IslamicEvent>;
    dailyReflections!: Table<DailyReflection>;

    // Reminders
    reminders!: Table<Reminder>;

    // General
    settings!: Table<Setting>;
    smartInsights!: Table<SmartInsight>;
    notifications!: Table<AppNotification>;

    constructor() {
        super('lifeosDB');

        // Note on versioning: Each version must declare the full schema.
        // This ensures migrations work correctly for users on any previous version.

        // FIX: Cast 'this' to Dexie to resolve incorrect type inference.
        (this as Dexie).version(3).stores({
            accounts: '++id, name, type',
            transactions: '++id, categoryId, date, type',
            categories: '++id, name, type',
            budgets: '++id, categoryId, period',
            savingsGoals: '++id, name',
            habits: '++id, name, frequency, reminderEnabled, reminderTime',
            habitLogs: '++id, &[habitId+date], date',
            routines: '++id, name',
            userProfile: 'id',
            badges: 'id',
            // FIX: Removed invalid '...' syntax which was causing a parsing error.
            userBadges: '++id, badgeId',
            healthMetrics: '++id, name, reminderEnabled, reminderTime',
            healthLogs: '++id, metricId, date',
            healthGoals: '++id, metricId',
            notes: '++id, title, updatedAt, folderId, status, pinned, createdAt',
            folders: '++id, name, parentId',
            fastingLogs: '++id, date, type, status',
            learningMaterials: 'id, category, title',
            learningLogs: '++id, &date',
            bookmarks: '++id, materialId, createdAt'
        }).upgrade(tx => {
            return tx.table('learningMaterials').bulkAdd(learningMaterials).catch(() => {});
        });
        
        // FIX: Cast 'this' to Dexie to resolve incorrect type inference.
        (this as Dexie).version(4).stores({
            // Repeat previous schema + add new tables
            accounts: '++id, name, type',
            transactions: '++id, categoryId, date, type',
            categories: '++id, name, type',
            budgets: '++id, categoryId, period',
            savingsGoals: '++id, name',
            habits: '++id, name, frequency, reminderEnabled, reminderTime',
            habitLogs: '++id, &[habitId+date], date',
            routines: '++id, name',
            userProfile: 'id',
            badges: 'id',
            userBadges: '++id, badgeId',
            healthMetrics: '++id, name, reminderEnabled, reminderTime',
            healthLogs: '++id, metricId, date',
            healthGoals: '++id, metricId',
            notes: '++id, title, updatedAt, folderId, status, pinned, createdAt',
            folders: '++id, name, parentId',
            fastingLogs: '++id, date, type, status',
            learningMaterials: 'id, category, title',
            learningLogs: '++id, &date',
            bookmarks: '++id, materialId, createdAt',
            islamicEvents: '&gregorianDate', // New in v4
        });

        // FIX: Cast 'this' to Dexie to resolve incorrect type inference.
        (this as Dexie).version(5).stores({
            // Repeat previous schema + add new tables
            accounts: '++id, name, type',
            transactions: '++id, categoryId, date, type',
            categories: '++id, name, type',
            budgets: '++id, categoryId, period',
            savingsGoals: '++id, name',
            habits: '++id, name, frequency, reminderEnabled, reminderTime',
            habitLogs: '++id, &[habitId+date], date',
            routines: '++id, name',
            userProfile: 'id',
            badges: 'id',
            userBadges: '++id, badgeId',
            healthMetrics: '++id, name, reminderEnabled, reminderTime',
            healthLogs: '++id, metricId, date',
            healthGoals: '++id, metricId',
            notes: '++id, title, updatedAt, folderId, status, pinned, createdAt',
            folders: '++id, name, parentId',
            fastingLogs: '++id, date, type, status',
            learningMaterials: 'id, category, title',
            learningLogs: '++id, &date',
            bookmarks: '++id, materialId, createdAt',
            islamicEvents: '&gregorianDate',
            dailyReflections: '&date', // New in v5
        });
        
        // FIX: Cast 'this' to Dexie to resolve incorrect type inference.
        (this as Dexie).version(6).stores({
            // Repeat previous schema + add new tables/indexes
            accounts: '++id, name, type',
            transactions: '++id, categoryId, date, type',
            categories: '++id, name, type',
            budgets: '++id, categoryId, period',
            savingsGoals: '++id, name',
            habits: '++id, name, frequency, reminderEnabled, reminderTime, origin', // Added 'origin' index
            habitLogs: '++id, &[habitId+date], date',
            routines: '++id, name',
            userProfile: 'id',
            badges: 'id',
            userBadges: '++id, badgeId',
            healthMetrics: '++id, name, reminderEnabled, reminderTime',
            healthLogs: '++id, metricId, date',
            healthGoals: '++id, metricId',
            notes: '++id, title, updatedAt, folderId, status, pinned, createdAt',
            folders: '++id, name, parentId',
            fastingLogs: '++id, date, type, status',
            learningMaterials: 'id, category, title',
            learningLogs: '++id, &date',
            bookmarks: '++id, materialId, createdAt',
            islamicEvents: '&gregorianDate',
            dailyReflections: '&date',
            settings: '&key', // New in v6
        }).upgrade(tx => {
            // Backfill the 'origin' property for existing habits for users upgrading
            return tx.table('habits').toCollection().modify(habit => {
                habit.origin = habit.origin || 'user';
            });
        });
        
        // FIX: Cast 'this' to Dexie to resolve incorrect type inference.
        (this as Dexie).version(7).stores({
            // Repeat previous schema + add new table
            accounts: '++id, name, type',
            transactions: '++id, categoryId, date, type',
            categories: '++id, name, type',
            budgets: '++id, categoryId, period',
            savingsGoals: '++id, name',
            habits: '++id, name, frequency, reminderEnabled, reminderTime, origin',
            habitLogs: '++id, &[habitId+date], date',
            routines: '++id, name',
            userProfile: 'id',
            badges: 'id',
            userBadges: '++id, badgeId',
            healthMetrics: '++id, name, reminderEnabled, reminderTime',
            healthLogs: '++id, metricId, date',
            healthGoals: '++id, metricId',
            notes: '++id, title, updatedAt, folderId, status, pinned, createdAt',
            folders: '++id, name, parentId',
            fastingLogs: '++id, date, type, status',
            learningMaterials: 'id, category, title',
            learningLogs: '++id, &date',
            bookmarks: '++id, materialId, createdAt',
            islamicEvents: '&gregorianDate',
            dailyReflections: '&date',
            settings: '&key',
            smartInsights: '++id, generatedAt, status', // New in v7
        });

        // FIX: Cast 'this' to Dexie to resolve incorrect type inference.
        (this as Dexie).version(8).stores({
            // Repeat previous schema + add new table
            accounts: '++id, name, type',
            transactions: '++id, categoryId, date, type',
            categories: '++id, name, type',
            budgets: '++id, categoryId, period',
            savingsGoals: '++id, name',
            habits: '++id, name, frequency, reminderEnabled, reminderTime, origin',
            habitLogs: '++id, &[habitId+date], date',
            routines: '++id, name',
            userProfile: 'id',
            badges: 'id',
            userBadges: '++id, badgeId',
            healthMetrics: '++id, name, reminderEnabled, reminderTime',
            healthLogs: '++id, metricId, date',
            healthGoals: '++id, metricId',
            notes: '++id, title, updatedAt, folderId, status, pinned, createdAt',
            folders: '++id, name, parentId',
            fastingLogs: '++id, date, type, status',
            prayerLogs: '++id, &[date+prayer]', // New in v8
            learningMaterials: 'id, category, title',
            learningLogs: '++id, &date',
            bookmarks: '++id, materialId, createdAt',
            islamicEvents: '&gregorianDate',
            dailyReflections: '&date',
            settings: '&key',
            smartInsights: '++id, generatedAt, status',
        });
        
        // FIX: Cast 'this' to Dexie to resolve incorrect type inference.
        (this as Dexie).version(9).stores({
            // Repeat previous schema + add new table
            accounts: '++id, name, type',
            transactions: '++id, categoryId, date, type',
            categories: '++id, name, type',
            budgets: '++id, categoryId, period',
            savingsGoals: '++id, name',
            habits: '++id, name, frequency, reminderEnabled, reminderTime, origin',
            habitLogs: '++id, &[habitId+date], date',
            routines: '++id, name',
            userProfile: 'id',
            badges: 'id',
            userBadges: '++id, badgeId',
            healthMetrics: '++id, name, reminderEnabled, reminderTime',
            healthLogs: '++id, metricId, date',
            healthGoals: '++id, metricId',
            notes: '++id, title, updatedAt, folderId, status, pinned, createdAt',
            folders: '++id, name, parentId',
            fastingLogs: '++id, date, type, status',
            prayerLogs: '++id, &[date+prayer]',
            learningMaterials: 'id, category, title',
            learningLogs: '++id, &date',
            bookmarks: '++id, materialId, createdAt',
            islamicEvents: '&gregorianDate',
            dailyReflections: '&date',
            settings: '&key',
            smartInsights: '++id, generatedAt, status',
            notifications: '++id, &key, timestamp, status, module', // New in v9
        });

        // Version 10: Add accountId to transactions for linking
        (this as Dexie).version(10).stores({
            // Repeat previous schema + add new index
            accounts: '++id, name, type',
            transactions: '++id, accountId, categoryId, date, type', // Updated index
            categories: '++id, name, type',
            budgets: '++id, categoryId, period',
            savingsGoals: '++id, name',
            habits: '++id, name, frequency, reminderEnabled, reminderTime, origin',
            habitLogs: '++id, &[habitId+date], date',
            routines: '++id, name',
            userProfile: 'id',
            badges: 'id',
            userBadges: '++id, badgeId',
            healthMetrics: '++id, name, reminderEnabled, reminderTime',
            healthLogs: '++id, metricId, date',
            healthGoals: '++id, metricId',
            notes: '++id, title, updatedAt, folderId, status, pinned, createdAt',
            folders: '++id, name, parentId',
            fastingLogs: '++id, date, type, status',
            prayerLogs: '++id, &[date+prayer]',
            learningMaterials: 'id, category, title',
            learningLogs: '++id, &date',
            bookmarks: '++id, materialId, createdAt',
            islamicEvents: '&gregorianDate',
            dailyReflections: '&date',
            settings: '&key',
            smartInsights: '++id, generatedAt, status',
            notifications: '++id, &key, timestamp, status, module',
        });

        // Version 11: Add reminders table
        (this as Dexie).version(11).stores({
            // Repeat previous schema + add reminders table
            accounts: '++id, name, type',
            transactions: '++id, accountId, categoryId, date, type',
            categories: '++id, name, type',
            budgets: '++id, categoryId, period',
            savingsGoals: '++id, name',
            habits: '++id, name, frequency, reminderEnabled, reminderTime, origin',
            habitLogs: '++id, &[habitId+date], date',
            routines: '++id, name',
            userProfile: 'id',
            badges: 'id',
            userBadges: '++id, badgeId',
            healthMetrics: '++id, name, reminderEnabled, reminderTime',
            healthLogs: '++id, metricId, date',
            healthGoals: '++id, metricId',
            notes: '++id, title, updatedAt, folderId, status, pinned, createdAt',
            folders: '++id, name, parentId',
            fastingLogs: '++id, date, type, status',
            prayerLogs: '++id, &[date+prayer]',
            learningMaterials: 'id, category, title',
            learningLogs: '++id, &date',
            bookmarks: '++id, materialId, createdAt',
            islamicEvents: '&gregorianDate',
            dailyReflections: '&date',
            settings: '&key',
            smartInsights: '++id, generatedAt, status',
            notifications: '++id, &key, timestamp, status, module',
            reminders: '++id, dueDate, status, priority, category', // New in v11
        });


        // --- Seed Data ---
        // FIX: Cast 'this' to Dexie to resolve incorrect type inference.
        (this as Dexie).on('populate', async () => {
            // Seed initial categories for Finance
            await this.categories.bulkAdd([
                { name: 'Salary', type: 'income', icon: 'payments' },
                { name: 'Freelance', type: 'income', icon: 'work' },
                { name: 'Groceries', type: 'expense', icon: 'shopping_cart' },
                { name: 'Rent', type: 'expense', icon: 'home' },
                { name: 'Utilities', type: 'expense', icon: 'electrical_services' },
                { name: 'Dining Out', type: 'expense', icon: 'restaurant' },
                { name: 'Transport', type: 'expense', icon: 'directions_car' },
                { name: 'Entertainment', type: 'expense', icon: 'theaters' },
                { name: 'Shopping', type: 'expense', icon: 'shopping_bag' },
                { name: 'Health', type: 'expense', icon: 'local_hospital' },
                { name: 'Education', type: 'expense', icon: 'school' },
                { name: 'Savings', type: 'expense', icon: 'savings' },
                { name: 'Investment', type: 'expense', icon: 'trending_up' },
                { name: 'Other', type: 'expense', icon: 'receipt_long' },
            ]);

            // Seed User Profile for Habits
            await this.userProfile.put({ id: 1, totalXp: 0 });

            // Seed Badges for Habits
            await this.badges.bulkAdd([
                { id: 'streak-7', name: 'Week-Long Warrior', description: 'Maintain a 7-day streak on any habit.', icon: 'local_fire_department' },
                { id: 'streak-30', name: 'Month of Mastery', description: 'Maintain a 30-day streak on any habit.', icon: 'military_tech' },
                { id: 'completions-10', name: 'Habit Starter', description: 'Complete 10 habit logs in total.', icon: 'rocket_launch' },
                { id: 'completions-100', name: 'Centurion', description: 'Complete 100 habit logs in total.', icon: 'shield' },
                { id: 'xp-1000', name: 'XP Collector', description: 'Earn 1000 XP from habits.', icon: 'star' },
            ]);

            // Seed some default health metrics
            await this.healthMetrics.bulkAdd([
                { name: 'Sleep', unit: 'hrs', reminderEnabled: false, reminderTime: '22:00' },
                { name: 'Steps', unit: 'steps', reminderEnabled: false, reminderTime: '20:00' },
                { name: 'Calories', unit: 'kcal', reminderEnabled: false, reminderTime: '21:00' },
                { name: 'Weight', unit: 'kg', reminderEnabled: false, reminderTime: '08:00' },
                { name: 'Mood', unit: '1-5', reminderEnabled: false, reminderTime: '12:00' },
            ]);
            
            // Seed learning materials for new users
            await this.learningMaterials.bulkAdd(learningMaterials);

            // Seed default settings
            await this.settings.put({ key: 'islamicHabitIntegration', value: false });
        });
    }
}

export const db = new LifeOSDexie();