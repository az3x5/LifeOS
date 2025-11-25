/**
 * Data Service - High-level API for all data operations
 * Replaces Dexie database operations
 */

import {
    fetchFromSupabase, insertToSupabase, upsertToSupabase, updateInSupabase, deleteFromSupabase, getUserId
} from './supabaseService';
import {
    Account, Transaction, Category, Budget, SavingsGoal,
    Habit, HabitLog, Routine, UserProfile, Badge, UserBadge, HabitFolder, HabitCategory,
    HealthMetric, HealthLog, HealthGoal,
    Note, Folder,
    FastingLog, PrayerLog, LearningMaterial, LearningLog, Bookmark, IslamicBookmark,
    IslamicEvent, DailyReflection, Setting, SmartInsight, AppNotification, Reminder, ReminderFolder
} from '../types';

// ============ FINANCE ============

export const accountsService = {
    getAll: () => fetchFromSupabase<Account>('accounts'),
    getById: (id: number) => fetchFromSupabase<Account>('accounts', { id }),
    create: (data: Account) => insertToSupabase('accounts', data),
    update: (id: number, data: Partial<Account>) => updateInSupabase('accounts', id, data),
    delete: (id: number) => deleteFromSupabase('accounts', id),
};

export const transactionsService = {
    getAll: () => fetchFromSupabase<Transaction>('transactions'),
    getByAccountId: (accountId: number) => fetchFromSupabase<Transaction>('transactions', { accountId }),
    create: (data: Transaction) => insertToSupabase('transactions', data),
    update: (id: number, data: Partial<Transaction>) => updateInSupabase('transactions', id, data),
    delete: (id: number) => deleteFromSupabase('transactions', id),
};

export const categoriesService = {
    getAll: () => fetchFromSupabase<Category>('categories'),
    create: (data: Category) => insertToSupabase('categories', data),
    update: (id: number, data: Partial<Category>) => updateInSupabase('categories', id, data),
    delete: (id: number) => deleteFromSupabase('categories', id),
};

export const budgetsService = {
    getAll: () => fetchFromSupabase<Budget>('budgets'),
    create: (data: Budget) => insertToSupabase('budgets', data),
    update: (id: number, data: Partial<Budget>) => updateInSupabase('budgets', id, data),
    delete: (id: number) => deleteFromSupabase('budgets', id),
};

export const savingsGoalsService = {
    getAll: () => fetchFromSupabase<SavingsGoal>('savings_goals'),
    create: (data: SavingsGoal) => insertToSupabase('savings_goals', data),
    update: (id: number, data: Partial<SavingsGoal>) => updateInSupabase('savings_goals', id, data),
    delete: (id: number) => deleteFromSupabase('savings_goals', id),
};

// ============ HABITS ============

export const habitsService = {
    getAll: () => fetchFromSupabase<Habit>('habits'),
    getById: (id: number) => fetchFromSupabase<Habit>('habits', { id }),
    create: (data: Habit) => insertToSupabase('habits', data),
    update: (id: number, data: Partial<Habit>) => updateInSupabase('habits', id, data),
    delete: (id: number) => deleteFromSupabase('habits', id),
};

export const habitCategoriesService = {
    getAll: () => fetchFromSupabase<HabitCategory>('habit_categories'),
    getById: (id: number) => fetchFromSupabase<HabitCategory>('habit_categories', { id }),
    create: (data: HabitCategory) => insertToSupabase('habit_categories', data),
    update: (id: number, data: Partial<HabitCategory>) => updateInSupabase('habit_categories', id, data),
    delete: (id: number) => deleteFromSupabase('habit_categories', id),
};

export const habitLogsService = {
    getAll: () => fetchFromSupabase<HabitLog>('habit_logs'),
    getByHabitId: (habitId: number) => fetchFromSupabase<HabitLog>('habit_logs', { habitId }),
    create: (data: HabitLog) => insertToSupabase('habit_logs', data),
    update: (id: number, data: Partial<HabitLog>) => updateInSupabase('habit_logs', id, data),
    delete: (id: number) => deleteFromSupabase('habit_logs', id),
};

export const routinesService = {
    getAll: () => fetchFromSupabase<Routine>('routines'),
    create: (data: Routine) => insertToSupabase('routines', data),
    update: (id: number, data: Partial<Routine>) => updateInSupabase('routines', id, data),
    delete: (id: number) => deleteFromSupabase('routines', id),
};

export const habitFoldersService = {
    getAll: () => fetchFromSupabase<HabitFolder>('habit_folders'),
    getById: (id: number) => fetchFromSupabase<HabitFolder>('habit_folders', { id }),
    create: (data: HabitFolder) => insertToSupabase('habit_folders', data),
    update: (id: number, data: Partial<HabitFolder>) => updateInSupabase('habit_folders', id, data),
    delete: (id: number) => deleteFromSupabase('habit_folders', id),
};

export const userProfileService = {
    get: () => fetchFromSupabase<UserProfile>('user_profile'),
    create: (data: UserProfile) => insertToSupabase('user_profile', data),
    update: (id: number, data: Partial<UserProfile>) => updateInSupabase('user_profile', id, data),
};

export const badgesService = {
    getAll: () => fetchFromSupabase<Badge>('badges'),
    create: (data: Badge) => insertToSupabase('badges', data),
};

export const userBadgesService = {
    getAll: () => fetchFromSupabase<UserBadge>('user_badges'),
    create: (data: UserBadge) => insertToSupabase('user_badges', data),
    delete: (id: number) => deleteFromSupabase('user_badges', id),
};

// ============ HEALTH ============

export const healthMetricsService = {
    getAll: () => fetchFromSupabase<HealthMetric>('health_metrics'),
    getById: (id: number) => fetchFromSupabase<HealthMetric>('health_metrics', { id }),
    create: (data: HealthMetric) => insertToSupabase('health_metrics', data),
    update: (id: number, data: Partial<HealthMetric>) => updateInSupabase('health_metrics', id, data),
    delete: (id: number) => deleteFromSupabase('health_metrics', id),
};

export const healthLogsService = {
    getAll: () => fetchFromSupabase<HealthLog>('health_logs'),
    getByMetricId: (metricId: number) => fetchFromSupabase<HealthLog>('health_logs', { metricId }),
    create: (data: HealthLog) => insertToSupabase('health_logs', data),
    update: (id: number, data: Partial<HealthLog>) => updateInSupabase('health_logs', id, data),
    delete: (id: number) => deleteFromSupabase('health_logs', id),
};

export const healthGoalsService = {
    getAll: () => fetchFromSupabase<HealthGoal>('health_goals'),
    create: (data: HealthGoal) => insertToSupabase('health_goals', data),
    update: (id: number, data: Partial<HealthGoal>) => updateInSupabase('health_goals', id, data),
    delete: (id: number) => deleteFromSupabase('health_goals', id),
};

// ============ NOTES ============

export const notesService = {
    getAll: () => fetchFromSupabase<Note>('notes'),
    getById: (id: number) => fetchFromSupabase<Note>('notes', { id }),
    create: (data: Note) => insertToSupabase('notes', data),
    update: (id: number, data: Partial<Note>) => updateInSupabase('notes', id, data),
    delete: (id: number) => deleteFromSupabase('notes', id),
};

export const foldersService = {
    getAll: () => fetchFromSupabase<Folder>('folders'),
    getById: (id: number) => fetchFromSupabase<Folder>('folders', { id }),
    create: (data: Folder) => insertToSupabase('folders', data),
    update: (id: number, data: Partial<Folder>) => updateInSupabase('folders', id, data),
    delete: (id: number) => deleteFromSupabase('folders', id),
};

// ============ ISLAMIC ============

export const fastingLogsService = {
    getAll: () => fetchFromSupabase<FastingLog>('fasting_logs'),
    create: (data: FastingLog) => insertToSupabase('fasting_logs', data),
    update: (id: number, data: Partial<FastingLog>) => updateInSupabase('fasting_logs', id, data),
    delete: (id: number) => deleteFromSupabase('fasting_logs', id),
};

export const islamicEventsService = {
    getAll: () => fetchFromSupabase<IslamicEvent>('islamic_events'),
    create: (data: IslamicEvent) => insertToSupabase('islamic_events', data),
    update: (id: number, data: Partial<IslamicEvent>) => updateInSupabase('islamic_events', id, data),
    delete: (id: number) => deleteFromSupabase('islamic_events', id),
};

export const learningMaterialsService = {
    getAll: () => fetchFromSupabase<LearningMaterial>('learning_materials'),
    create: (data: LearningMaterial) => insertToSupabase('learning_materials', data),
    update: (id: number, data: Partial<LearningMaterial>) => updateInSupabase('learning_materials', id, data),
    delete: (id: number) => deleteFromSupabase('learning_materials', id),
};

export const learningLogsService = {
    getAll: () => fetchFromSupabase<LearningLog>('learning_logs'),
    create: (data: LearningLog) => insertToSupabase('learning_logs', data),
    update: (id: number, data: Partial<LearningLog>) => updateInSupabase('learning_logs', id, data),
    delete: (id: number) => deleteFromSupabase('learning_logs', id),
};

export const bookmarksService = {
    getAll: () => fetchFromSupabase<Bookmark>('bookmarks'),
    create: (data: Bookmark) => insertToSupabase('bookmarks', data),
    update: (id: number, data: Partial<Bookmark>) => updateInSupabase('bookmarks', id, data),
    delete: (id: number) => deleteFromSupabase('bookmarks', id),
};

export const islamicBookmarksService = {
    getAll: () => fetchFromSupabase<IslamicBookmark>('islamic_bookmarks'),
    getByType: (type: 'quran' | 'hadith' | 'dua') =>
        fetchFromSupabase<IslamicBookmark>('islamic_bookmarks', { type }),
    getByReference: (reference: string) =>
        fetchFromSupabase<IslamicBookmark>('islamic_bookmarks', { reference }),
    create: (data: IslamicBookmark) => insertToSupabase('islamic_bookmarks', data),
    update: (id: number, data: Partial<IslamicBookmark>) => updateInSupabase('islamic_bookmarks', id, data),
    delete: (id: number) => deleteFromSupabase('islamic_bookmarks', id),
    deleteByReference: async (reference: string) => {
        const bookmarks = await fetchFromSupabase<IslamicBookmark>('islamic_bookmarks', { reference });
        if (bookmarks && bookmarks.length > 0) {
            return deleteFromSupabase('islamic_bookmarks', bookmarks[0].id!);
        }
    },
};

export const prayerLogsService = {
    getAll: () => fetchFromSupabase<PrayerLog>('prayer_logs'),
    create: (data: PrayerLog) => insertToSupabase('prayer_logs', data),
    update: (id: number, data: Partial<PrayerLog>) => updateInSupabase('prayer_logs', id, data),
    delete: (id: number) => deleteFromSupabase('prayer_logs', id),
};

export const dailyReflectionsService = {
    getAll: () => fetchFromSupabase<DailyReflection>('daily_reflections'),
    create: (data: DailyReflection) => insertToSupabase('daily_reflections', data),
    update: (date: string, data: Partial<DailyReflection>) => updateInSupabase('daily_reflections', date, data),
    delete: (date: string) => deleteFromSupabase('daily_reflections', date),
};

// ============ REMINDERS ============

export const remindersService = {
    getAll: () => fetchFromSupabase<Reminder>('reminders'),
    getById: (id: number) => fetchFromSupabase<Reminder>('reminders', { id }),
    create: (data: Reminder) => insertToSupabase('reminders', data),
    update: (id: number, data: Partial<Reminder>) => updateInSupabase('reminders', id, data),
    delete: (id: number) => deleteFromSupabase('reminders', id),
};

export const reminderFoldersService = {
    getAll: () => fetchFromSupabase<ReminderFolder>('reminder_folders'),
    getById: (id: number) => fetchFromSupabase<ReminderFolder>('reminder_folders', { id }),
    create: (data: ReminderFolder) => insertToSupabase('reminder_folders', data),
    update: (id: number, data: Partial<ReminderFolder>) => updateInSupabase('reminder_folders', id, data),
    delete: (id: number) => deleteFromSupabase('reminder_folders', id),
};

// ============ INSIGHTS ============

export const smartInsightsService = {
    getAll: () => fetchFromSupabase<SmartInsight>('smart_insights'),
    create: (data: SmartInsight) => insertToSupabase('smart_insights', data),
    update: (id: number, data: Partial<SmartInsight>) => updateInSupabase('smart_insights', id, data),
    delete: (id: number) => deleteFromSupabase('smart_insights', id),
};

// ============ SETTINGS ============

export const settingsService = {
    getAll: () => fetchFromSupabase<Setting>('settings'),
    getByKey: (key: string) => fetchFromSupabase<Setting>('settings', { key }),
    create: (data: Setting) => insertToSupabase('settings', data),
    update: (id: number, data: Partial<Setting>) => updateInSupabase('settings', id, data),
    delete: (id: number) => deleteFromSupabase('settings', id),
};

// ============ NOTIFICATIONS ============

export const notificationsService = {
    getAll: () => fetchFromSupabase<AppNotification>('notifications'),
    create: (data: AppNotification) => insertToSupabase('notifications', data),
    upsert: (data: AppNotification) => upsertToSupabase('notifications', data, 'key'),
    update: (id: number, data: Partial<AppNotification>) => updateInSupabase('notifications', id, data),
    delete: (id: number) => deleteFromSupabase('notifications', id),
};

