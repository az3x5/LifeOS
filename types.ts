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
export interface Habit {
    id?: number;
    userId?: string;
    name: string;
    description?: string;
    category?: string;
    frequency: 'daily' | 'custom';
    targetDays?: number[];
    color?: string;
    icon?: string;
    reminderTime?: string;
    isActive?: boolean;
    createdAt?: Date;
}

export interface HabitLog {
    id?: number;
    userId?: string;
    habitId: number;
    date: Date;
    completed?: boolean;
    notes?: string;
    createdAt?: Date;
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
    targetValue?: number;
    targetOperator?: string;
    color?: string;
    icon?: string;
    createdAt?: Date;
}

export interface HealthLog {
    id?: number;
    userId?: string;
    metricId: number;
    value: number;
    date: Date;
    notes?: string;
    createdAt?: Date;
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
    date: Date;
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

export interface IslamicEvent {
    id?: number;
    userId?: string;
    gregorianDate: Date;
    hijriDate?: string;
    notes?: string;
    createdAt?: Date;
}

export interface DailyReflection {
    date: Date;
    userId?: string;
    gratitude?: string;
    wins?: string;
    challenges?: string;
    tomorrowGoals?: string;
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
    dueDate: Date;
    dueTime?: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
    status: 'pending' | 'completed' | 'overdue';
    recurring?: string;
    recurringDays?: number[];
    notificationEnabled?: boolean;
    notificationTime?: number;
    tags?: string[];
    createdAt?: Date;
    completedAt?: Date;
}