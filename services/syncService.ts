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

        // Use upsert with proper conflict resolution
        // Supabase will use the primary key (id, user_id) for conflict detection
        const { error } = await supabase.from(tableName).upsert(dataToSync, {
            onConflict: 'id,user_id',
            ignoreDuplicates: false, // Update existing records
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
 * Pull data from Supabase for a specific table with smart merge
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
            // Smart merge: Use upsert instead of clear + add
            // This preserves local data and only updates/adds remote changes
            const remoteData = data.map(item => {
                // Remove user_id before storing locally
                const { user_id, ...localItem } = item;
                return localItem;
            });

            // Use bulkPut to update existing records and add new ones
            await localTable.bulkPut(remoteData);
            console.log(`${data.length} ${tableName} merged from Supabase.`);
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
 * Main sync function - two-way sync (pull then push)
 * This ensures data is merged from cloud first, then local changes are pushed
 */
export async function syncAllData(): Promise<boolean> {
    const isOnline = navigator.onLine;
    if (!isOnline) {
        console.log("Offline mode: Skipping sync.");
        return false;
    }

    const userId = await getUserId();
    if (!userId) {
        console.error("No authenticated user. Cannot sync.");
        return false;
    }

    console.log("Starting two-way sync...");

    // Step 1: Pull remote changes first (merge into local)
    console.log("Step 1: Pulling remote changes...");
    const pullSuccess = await pullAllData();

    // Step 2: Push local changes to remote
    console.log("Step 2: Pushing local changes...");
    const pushSuccess = await pushAllData();

    const syncSuccess = pullSuccess && pushSuccess;

    if (syncSuccess) {
        console.log("Two-way sync completed successfully.");
    } else {
        console.warn("Sync completed with some errors.");
    }

    return syncSuccess;
}

/**
 * Debounced auto-sync - triggers sync after data changes
 * Waits 5 seconds after last change before syncing
 */
let autoSyncTimeout: NodeJS.Timeout | null = null;

export function triggerAutoSync(): void {
    // Clear existing timeout
    if (autoSyncTimeout) {
        clearTimeout(autoSyncTimeout);
    }

    // Set new timeout for 5 seconds
    autoSyncTimeout = setTimeout(async () => {
        console.log("Auto-sync triggered...");
        await syncAllData();
    }, 5000); // 5 second debounce
}

/**
 * Force immediate sync (for manual sync button)
 */
export async function forceSyncNow(): Promise<boolean> {
    // Cancel any pending auto-sync
    if (autoSyncTimeout) {
        clearTimeout(autoSyncTimeout);
        autoSyncTimeout = null;
    }

    console.log("Force sync triggered...");
    return await syncAllData();
}
