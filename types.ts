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
    name: string;
    type: 'Bank' | 'Cash' | 'Crypto' | 'Investment' | 'Other Asset';
    balance: number;
    currency: string;
    createdAt: Date;
    includeInNetWorth: boolean;
}

export interface Transaction {
    id?: number;
    accountId: number;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    categoryId: number;
    date: Date;
    currency: string;
}

export interface Category {
    id?: number;
    name: string;
    type: 'income' | 'expense';
    icon?: string;
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
export interface Habit {
    id?: number;
    name: string;
    frequency: 'daily' | 'custom';
    daysOfWeek?: number[]; // 0 for Sunday, 6 for Saturday
    createdAt: Date;
    xp: number;
    isFrozen: boolean;
    frozenFrom?: string;
    frozenTo?: string;
    reminderEnabled?: boolean;
    reminderTime?: string;
    origin?: 'user' | 'system-islamic';
}

export interface HabitLog {
    id?: number;
    habitId: number;
    date: string; // YYY-MM-DD
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
    name: string;
    unit: string;
    reminderEnabled?: boolean;
    reminderTime?: string;
}

export interface HealthLog {
    id?: number;
    metricId: number;
    value: number;
    date: Date;
    notes?: string;
    tags?: string[];
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
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    folderId?: number;
    status: 'active' | 'trash';
    pinned: boolean;
}

export interface Folder {
    id?: number;
    name: string;
    parentId: number | null;
    createdAt: Date;
    icon?: string;
    color?: string;
}

// Islamic Knowledge types
export interface FastingLog {
    id?: number;
    date: string; // YYYY-MM-DD
    type: 'ramadan' | 'shawwal' | 'arafah' | 'ashura' | 'monday_thursday' | 'voluntary' | 'qada';
    status: 'completed' | 'missed' | 'pending';
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

export interface IslamicEvent {
    id?: number;
    gregorianDate: string; // YYYY-MM-DD (Primary Key)
    notes: string;
}

export interface DailyReflection {
    date: string; // YYYY-MM-DD (Primary Key)
    content: {
        ayah: string;
        reference: string;
        explanation: string;
    };
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
    title: string;
    description?: string;
    dueDate: Date;
    dueTime?: string; // HH:MM format
    priority: 'low' | 'medium' | 'high';
    category: 'personal' | 'work' | 'health' | 'finance' | 'other';
    status: 'pending' | 'completed' | 'overdue';
    recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
    recurringDays?: number[]; // For weekly: 0-6 (Sun-Sat)
    notificationEnabled: boolean;
    notificationTime?: number; // Minutes before due time
    tags?: string[];
    createdAt: Date;
    completedAt?: Date;
}