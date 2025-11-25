// FIX: Removed circular self-import that was causing compilation errors.
export enum Module {
    DASHBOARD = 'DASHBOARD',
    FINANCE = 'FINANCE',
    HABITS = 'HABITS',
    HEALTH = 'HEALTH',
    ISLAMIC = 'ISLAMIC',
    NOTES = 'NOTES',
    REMINDERS = 'REMINDERS',
    SETTINGS = 'SETTINGS',
}

// Finance types
export interface Account {
    id?: number;
    userId?: string;
    name: string;
    type: 'Bank' | 'Cash' | 'Crypto' | 'Investment' | 'Other Asset';
    balance?: number;
    currency?: string;
    createdAt?: Date;
    updatedAt?: Date;
    includeInNetWorth?: boolean;
}

export interface Transaction {
    id?: number;
    userId?: string;
    accountId?: number;
    categoryId?: number;
    type: 'income' | 'expense';
    amount: number;
    description?: string;
    date: Date;
    createdAt?: Date;
}

export interface Category {
    id?: number;
    userId?: string;
    name: string;
    type: 'income' | 'expense';
    color?: string;
    icon?: string;
    createdAt?: Date;
}

export interface Budget {
    id?: number;
    categoryId: number;
    amount: number;
    period: 'monthly'; // Can be extended later
}

export interface SavingsGoal {
    id?: number;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: Date;
}


// Habit Tracker types
export interface HabitCategory {
    id?: number;
    userId?: string;
    name: string;
    icon?: string;
    color?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Habit {
    id?: number;
    userId?: string;
    name: string;
    description?: string;
    frequency: 'daily' | 'custom';
    targetDays?: number[] | null;
    daysOfWeek?: number[] | null;
    color?: string;
    icon?: string;
    reminderTime?: string;
    reminderEnabled?: boolean;
    isActive?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    origin?: 'user' | 'system' | 'system-islamic';
    xp?: number;
    isFrozen?: boolean;
    frozenFrom?: Date | string | null;
    frozenTo?: Date | string | null;
    folderId?: number | null;
    category?: string;
}

export interface HabitFolder {
    id?: number;
    userId?: string;
    name: string;
    parentId?: number | null;  // null = root folder
    createdAt?: Date;
    updatedAt?: Date;
    icon?: string;
    color?: string;
}

export interface HabitLog {
    id?: number;
    userId?: string;
    habitId: number;
    date: string;
    completed?: boolean;
    notes?: string;
    createdAt?: Date | string;
}

export interface Routine {
    id?: number;
    name: string;
    habitIds: number[];
}

export interface UserProfile {
    id?: 1;
    totalXp: number;
}

export interface Badge {
    id: string; // e.g., 'streak-7', 'completions-100'
    name: string;
    description: string;
    icon: string;
}

export interface UserBadge {
    id?: number;
    badgeId: string;
    earnedAt: Date;
}


// Health Tracker types
export interface HealthMetric {
    id?: number;
    userId?: string;
    name: string;
    unit: string;
    type: string;
    category?: string;
    targetValue?: number;
    targetOperator?: string;
    color?: string;
    icon?: string;
    reminderEnabled?: boolean;
    reminderTime?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface HealthLog {
    id?: number;
    userId?: string;
    metricId: number;
    value: number;
    date: Date;
    notes?: string;
    tags?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface HealthGoal {
    id?: number;
    metricId: number;
    target: number;
    period: 'daily' | 'weekly' | 'monthly';
    startDate: Date;
}


// Notes types
export interface Note {
    id?: number;
    userId?: string;
    title: string;
    content?: string;
    tags?: string[];
    status?: 'active' | 'trash';
    folderId?: number | null;  // null = root/no folder
    pinned?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Folder {
    id?: number;
    userId?: string;
    name: string;
    parentId?: number | null;  // null = root folder
    createdAt?: Date;
    updatedAt?: Date;
    icon?: string;
    color?: string;
}

// Islamic Knowledge types
export interface FastingLog {
    id?: number;
    userId?: string;
    date: Date | string;
    type: string;
    status: 'completed' | 'missed' | 'pending';
    notes?: string;
    createdAt?: Date;
}

export interface PrayerLog {
    id?: number;
    date: string; // YYYY-MM-DD
    prayer: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
}

export interface LearningMaterial {
    id: number;
    category: 'tafsir' | 'fiqh' | 'hadith' | 'seerah' | 'general';
    title: string;
    summary: string;
    content: string; // Markdown
}

export interface LearningLog {
    id?: number;
    date: string; // YYYY-MM-DD, unique
}

export interface Bookmark {
    id?: number;
    materialId: number;
    notes?: string;
    createdAt: Date;
}

export interface IslamicBookmark {
    id?: number;
    userId?: string;
    type: 'quran' | 'hadith' | 'dua';
    reference: string; // e.g., '1:1' for Quran, 'bukhari:1' for Hadith
    title?: string; // e.g., 'Al-Fatihah 1:1'
    content?: string; // The actual verse/hadith text
    notes?: string;
    tags?: string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export interface IslamicEvent {
    id?: number;
    userId?: string;
    gregorianDate: Date | string;
    hijriDate?: string;
    notes?: string;
    createdAt?: Date;
}

export interface DailyReflection {
    date: Date | string;
    userId?: string;
    gratitude?: string;
    wins?: string;
    challenges?: string;
    tomorrowGoals?: string;
    content?: string | { ayah: string; reference: string; explanation: string };
    mood?: string;
    energyLevel?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// General types
export interface Setting {
    key: string; // primary key
    value: any;
}

export interface SmartInsight {
    id?: number;
    icon: string;
    title: string;
    insight: string;
    generatedAt: Date;
    status: 'active' | 'dismissed';
}

export interface AppNotification {
    id?: number;
    key: string; // Unique key to prevent duplicates, e.g., 'habit-missed-12-2023-10-27'
    module: Module;
    message: string;
    timestamp: Date;
    status: 'unread' | 'read';
    relatedId?: number; // e.g., habitId, budgetId
}

// Reminders types
export interface Reminder {
    id?: number;
    userId?: string;
    title: string;
    description?: string;
    dueDate: Date | string;
    dueTime?: string;
    priority: 'low' | 'medium' | 'high';
    category: 'personal' | 'work' | 'health' | 'finance' | 'other' | string;
    status: 'pending' | 'completed' | 'overdue';
    recurring?: 'none' | 'daily' | 'weekly' | 'monthly' | string;
    recurringDays?: number[];
    notificationEnabled?: boolean;
    notificationTime?: number;
    tags?: string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    completedAt?: Date | string;
    completed?: boolean;
    folderId?: number | null;  // null = root/no folder
}

export interface ReminderFolder {
    id?: number;
    userId?: string;
    name: string;
    parentId?: number | null;  // null = root folder
    createdAt?: Date;
    updatedAt?: Date;
    icon?: string;
    color?: string;
}