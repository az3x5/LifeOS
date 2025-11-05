import { db } from './db';
import { supabase } from './supabase';

// Enhanced sync service with full table support and user authentication
// Handles two-way sync between local Dexie DB and Supabase

/**
 * Get the current authenticated user ID
 */
async function getUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
}

/**
 * Generic sync function for any table
 */
async function syncTable<T extends Record<string, any>>(
    tableName: string,
    localData: T[],
    transformData?: (item: T, userId: string) => any
): Promise<boolean> {
    if (!supabase) return false;

    try {
        if (localData.length === 0) return true;

        const userId = await getUserId();
        if (!userId) {
            console.error('No authenticated user for sync');
            return false;
        }

        // Transform data to include user_id
        const dataToSync = localData.map(item => {
            if (transformData) {
                return transformData(item, userId);
            }
            return { ...item, user_id: userId };
        });

        const { error } = await supabase.from(tableName).upsert(dataToSync, {
            onConflict: 'id',
        });

        if (error) {
            console.error(`Supabase sync error (${tableName}):`, error);
            throw error;
        }

        console.log(`${localData.length} ${tableName} synced to Supabase.`);
        return true;
    } catch (error) {
        console.error(`Failed to sync ${tableName}:`, error);
        return false;
    }
}

/**
 * Pull data from Supabase for a specific table
 */
async function pullTable<T>(
    tableName: string,
    localTable: any
): Promise<boolean> {
    if (!supabase) return false;

    try {
        const userId = await getUserId();
        if (!userId) return false;

        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error(`Supabase pull error (${tableName}):`, error);
            throw error;
        }

        if (data && data.length > 0) {
            // Clear local table and insert remote data
            await localTable.clear();
            await localTable.bulkAdd(data);
            console.log(`${data.length} ${tableName} pulled from Supabase.`);
        }

        return true;
    } catch (error) {
        console.error(`Failed to pull ${tableName}:`, error);
        return false;
    }
}

// Individual sync functions for each table
async function syncAccounts() {
    const localData = await db.accounts.toArray();
    return syncTable('accounts', localData);
}

async function syncCategories() {
    const localData = await db.categories.toArray();
    return syncTable('categories', localData);
}

async function syncTransactions() {
    const localData = await db.transactions.toArray();
    return syncTable('transactions', localData);
}

async function syncHabits() {
    const localData = await db.habits.toArray();
    return syncTable('habits', localData, (item, userId) => ({
        ...item,
        user_id: userId,
        target_days: item.targetDays ? JSON.stringify(item.targetDays) : null,
    }));
}

async function syncHabitLogs() {
    const localData = await db.habitLogs.toArray();
    return syncTable('habit_logs', localData);
}

async function syncHealthMetrics() {
    const localData = await db.healthMetrics.toArray();
    return syncTable('health_metrics', localData);
}

async function syncHealthLogs() {
    const localData = await db.healthLogs.toArray();
    return syncTable('health_logs', localData);
}

async function syncNotes() {
    const localData = await db.notes.toArray();
    return syncTable('notes', localData, (item, userId) => ({
        ...item,
        user_id: userId,
        tags: item.tags ? JSON.stringify(item.tags) : null,
    }));
}

async function syncFastingLogs() {
    const localData = await db.fastingLogs.toArray();
    return syncTable('fasting_logs', localData);
}

async function syncIslamicEvents() {
    const localData = await db.islamicEvents.toArray();
    return syncTable('islamic_events', localData, (item, userId) => ({
        ...item,
        user_id: userId,
        gregorian_date: item.gregorianDate,
        hijri_date: item.hijriDate,
    }));
}

async function syncDailyReflections() {
    const localData = await db.dailyReflections.toArray();
    return syncTable('daily_reflections', localData);
}

async function syncReminders() {
    const localData = await db.reminders.toArray();
    return syncTable('reminders', localData, (item, userId) => ({
        ...item,
        user_id: userId,
        due_date: item.dueDate,
        due_time: item.dueTime,
        recurring_days: item.recurringDays ? JSON.stringify(item.recurringDays) : null,
        notification_enabled: item.notificationEnabled,
        notification_time: item.notificationTime,
        tags: item.tags ? JSON.stringify(item.tags) : null,
        created_at: item.createdAt,
        completed_at: item.completedAt,
    }));
}


/**
 * Push all local data to Supabase
 */
export async function pushAllData(): Promise<boolean> {
    const isOnline = navigator.onLine;
    if (!isOnline) {
        console.log("Offline mode: Skipping Supabase push.");
        return false;
    }

    const userId = await getUserId();
    if (!userId) {
        console.error("No authenticated user. Cannot push data.");
        return false;
    }

    console.log("Starting Supabase push...");
    const results = await Promise.all([
        syncAccounts(),
        syncCategories(),
        syncTransactions(),
        syncHabits(),
        syncHabitLogs(),
        syncHealthMetrics(),
        syncHealthLogs(),
        syncNotes(),
        syncFastingLogs(),
        syncIslamicEvents(),
        syncDailyReflections(),
        syncReminders(),
    ]);

    const allSucceeded = results.every(Boolean);
    if (allSucceeded) {
        console.log("Supabase push completed successfully.");
    } else {
        console.error("One or more Supabase push operations failed.");
    }

    return allSucceeded;
}

/**
 * Pull all data from Supabase to local DB
 */
export async function pullAllData(): Promise<boolean> {
    const isOnline = navigator.onLine;
    if (!isOnline) {
        console.log("Offline mode: Skipping Supabase pull.");
        return false;
    }

    const userId = await getUserId();
    if (!userId) {
        console.error("No authenticated user. Cannot pull data.");
        return false;
    }

    console.log("Starting Supabase pull...");
    const results = await Promise.all([
        pullTable('accounts', db.accounts),
        pullTable('categories', db.categories),
        pullTable('transactions', db.transactions),
        pullTable('habits', db.habits),
        pullTable('habit_logs', db.habitLogs),
        pullTable('health_metrics', db.healthMetrics),
        pullTable('health_logs', db.healthLogs),
        pullTable('notes', db.notes),
        pullTable('fasting_logs', db.fastingLogs),
        pullTable('islamic_events', db.islamicEvents),
        pullTable('daily_reflections', db.dailyReflections),
        pullTable('reminders', db.reminders),
    ]);

    const allSucceeded = results.every(Boolean);
    if (allSucceeded) {
        console.log("Supabase pull completed successfully.");
    } else {
        console.error("One or more Supabase pull operations failed.");
    }

    return allSucceeded;
}

/**
 * Main sync function - pulls data on login, pushes on changes
 * For initial implementation, we'll do a simple push
 */
export async function syncAllData(): Promise<boolean> {
    return pushAllData();
}

