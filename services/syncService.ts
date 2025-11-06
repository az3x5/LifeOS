import { db } from './db';
import { supabase } from './supabase';

// Enhanced sync service with full table support and user authentication
// Handles two-way sync between local Dexie DB and Supabase

/**
 * Convert camelCase to snake_case
 */
function toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert object keys from camelCase to snake_case
 */
function convertToSnakeCase(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = toSnakeCase(key);
        result[snakeKey] = value;
    }
    return result;
}

/**
 * Convert object keys from snake_case to camelCase
 */
function convertToCamelCase(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = toCamelCase(key);
        result[camelKey] = value;
    }
    return result;
}

/**
 * Get the current authenticated user ID
 */
async function getUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
}

/**
 * Generic sync function for any table
 * Adds updated_at timestamp for conflict resolution
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

        // Transform data to include user_id and convert to snake_case
        const dataToSync = localData.map(item => {
            const baseData = transformData ? transformData(item, userId) : { ...item, user_id: userId };

            // Convert camelCase keys to snake_case for Supabase
            const snakeCaseData = convertToSnakeCase(baseData);

            return snakeCaseData;
        });

        // Use upsert with proper conflict resolution
        // Supabase will use the primary key (id) for conflict detection
        const { error } = await supabase.from(tableName).upsert(dataToSync, {
            onConflict: 'id',
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
 * Uses timestamp-based conflict resolution: newer data wins
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
            // Get all local data for comparison
            const localData = await localTable.toArray();
            const localDataMap = new Map(localData.map((item: any) => [item.id, item]));

            const itemsToUpdate = [];

            for (const remoteItem of data) {
                // Remove Supabase-specific fields and convert to camelCase
                const { user_id, created_at, ...remoteData } = remoteItem;
                const localItem = convertToCamelCase(remoteData);

                const localRecord = localDataMap.get(remoteItem.id);

                // If no local record exists, add it
                if (!localRecord) {
                    itemsToUpdate.push(localItem);
                    continue;
                }

                // Compare timestamps if available (use created_at since updated_at doesn't exist)
                if (created_at && localRecord.createdAt) {
                    const remoteTime = new Date(created_at).getTime();
                    const localTime = new Date(localRecord.createdAt).getTime();

                    // Only update if remote is newer
                    if (remoteTime > localTime) {
                        itemsToUpdate.push(localItem);
                    }
                } else {
                    // No timestamps, always update (safer to take remote)
                    itemsToUpdate.push(localItem);
                }
            }

            if (itemsToUpdate.length > 0) {
                await localTable.bulkPut(itemsToUpdate);
                console.log(`${itemsToUpdate.length} ${tableName} merged from Supabase (${data.length} total remote).`);
            } else {
                console.log(`No updates needed for ${tableName} (all local data is current).`);
            }
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
    return syncTable('accounts', localData, (item, userId) => ({
        id: item.id,
        user_id: userId,
        name: item.name,
        type: item.type,
        balance: item.balance,
        currency: item.currency,
        created_at: item.createdAt,
    }));
}

async function syncCategories() {
    const localData = await db.categories.toArray();
    return syncTable('categories', localData, (item, userId) => ({
        id: item.id,
        user_id: userId,
        name: item.name,
        type: item.type,
        color: item.color,
        icon: item.icon,
        created_at: item.createdAt,
    }));
}

async function syncTransactions() {
    const localData = await db.transactions.toArray();
    return syncTable('transactions', localData, (item, userId) => ({
        id: item.id,
        user_id: userId,
        account_id: item.accountId,
        category_id: item.categoryId,
        type: item.type,
        amount: item.amount,
        description: item.description,
        date: item.date,
        created_at: item.createdAt,
    }));
}

async function syncHabits() {
    const localData = await db.habits.toArray();
    return syncTable('habits', localData, (item, userId) => ({
        id: item.id,
        user_id: userId,
        name: item.name,
        description: item.description,
        category: item.category,
        frequency: item.frequency,
        target_days: item.targetDays ? JSON.stringify(item.targetDays) : null,
        color: item.color,
        icon: item.icon,
        reminder_time: item.reminderTime,
        is_active: item.isActive,
        created_at: item.createdAt,
    }));
}

async function syncHabitLogs() {
    const localData = await db.habitLogs.toArray();
    return syncTable('habit_logs', localData, (item, userId) => ({
        id: item.id,
        user_id: userId,
        habit_id: item.habitId,
        date: item.date,
        completed: item.completed,
        notes: item.notes,
        created_at: item.createdAt,
    }));
}

async function syncHealthMetrics() {
    const localData = await db.healthMetrics.toArray();
    return syncTable('health_metrics', localData, (item, userId) => ({
        id: item.id,
        user_id: userId,
        name: item.name,
        unit: item.unit,
        type: item.type,
        target_value: item.targetValue,
        target_operator: item.targetOperator,
        color: item.color,
        icon: item.icon,
        created_at: item.createdAt,
    }));
}

async function syncHealthLogs() {
    const localData = await db.healthLogs.toArray();
    return syncTable('health_logs', localData, (item, userId) => ({
        id: item.id,
        user_id: userId,
        metric_id: item.metricId,
        value: item.value,
        date: item.date,
        notes: item.notes,
        created_at: item.createdAt,
    }));
}

async function syncNotes() {
    const localData = await db.notes.toArray();
    return syncTable('notes', localData, (item, userId) => ({
        id: item.id,
        user_id: userId,
        title: item.title,
        content: item.content,
        tags: item.tags ? JSON.stringify(item.tags) : null,
        status: item.status,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
    }));
}

async function syncFastingLogs() {
    const localData = await db.fastingLogs.toArray();
    return syncTable('fasting_logs', localData, (item, userId) => ({
        id: item.id,
        user_id: userId,
        date: item.date,
        type: item.type,
        status: item.status,
        notes: item.notes,
        created_at: item.createdAt,
    }));
}

async function syncIslamicEvents() {
    const localData = await db.islamicEvents.toArray();
    return syncTable('islamic_events', localData, (item, userId) => ({
        id: item.id,
        user_id: userId,
        gregorian_date: item.gregorianDate,
        hijri_date: item.hijriDate,
        notes: item.notes,
        created_at: item.createdAt,
    }));
}

async function syncDailyReflections() {
    const localData = await db.dailyReflections.toArray();
    return syncTable('daily_reflections', localData, (item, userId) => ({
        date: item.date,
        user_id: userId,
        gratitude: item.gratitude,
        wins: item.wins,
        challenges: item.challenges,
        tomorrow_goals: item.tomorrowGoals,
        mood: item.mood,
        energy_level: item.energyLevel,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
    }));
}

async function syncReminders() {
    const localData = await db.reminders.toArray();
    return syncTable('reminders', localData, (item, userId) => ({
        id: item.id,
        user_id: userId,
        title: item.title,
        description: item.description,
        due_date: item.dueDate,
        due_time: item.dueTime,
        priority: item.priority,
        category: item.category,
        status: item.status,
        recurring: item.recurring,
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

    console.log("=== Starting two-way sync ===");
    console.log("User ID:", userId);
    console.log("Timestamp:", new Date().toISOString());

    // Step 1: Pull remote changes first (merge into local)
    console.log("Step 1: Pulling remote changes...");
    const pullSuccess = await pullAllData();
    console.log("Pull result:", pullSuccess ? "SUCCESS" : "FAILED");

    // Step 2: Push local changes to remote
    console.log("Step 2: Pushing local changes...");
    const pushSuccess = await pushAllData();
    console.log("Push result:", pushSuccess ? "SUCCESS" : "FAILED");

    const syncSuccess = pullSuccess && pushSuccess;

    if (syncSuccess) {
        console.log("=== Two-way sync completed successfully ===");
    } else {
        console.warn("=== Sync completed with some errors ===");
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
