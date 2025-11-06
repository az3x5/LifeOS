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
    return syncTable('accounts', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            name: item.name,
            type: item.type,
        };
        if (item.balance !== undefined && item.balance !== null) data.balance = item.balance;
        if (item.currency !== undefined && item.currency !== null) data.currency = item.currency;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        return data;
    });
}

async function syncCategories() {
    const localData = await db.categories.toArray();
    return syncTable('categories', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            name: item.name,
            type: item.type,
        };
        if (item.color !== undefined && item.color !== null) data.color = item.color;
        if (item.icon !== undefined && item.icon !== null) data.icon = item.icon;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        return data;
    });
}

async function syncTransactions() {
    const localData = await db.transactions.toArray();
    return syncTable('transactions', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            type: item.type,
            amount: item.amount,
            date: item.date,
        };
        if (item.accountId !== undefined && item.accountId !== null) data.account_id = item.accountId;
        if (item.categoryId !== undefined && item.categoryId !== null) data.category_id = item.categoryId;
        if (item.description !== undefined && item.description !== null) data.description = item.description;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        return data;
    });
}

async function syncHabits() {
    const localData = await db.habits.toArray();
    return syncTable('habits', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            name: item.name,
            frequency: item.frequency,
        };
        if (item.description !== undefined && item.description !== null) data.description = item.description;
        if (item.category !== undefined && item.category !== null) data.category = item.category;
        if (item.targetDays !== undefined && item.targetDays !== null) data.target_days = item.targetDays;
        if (item.color !== undefined && item.color !== null) data.color = item.color;
        if (item.icon !== undefined && item.icon !== null) data.icon = item.icon;
        if (item.reminderTime !== undefined && item.reminderTime !== null) data.reminder_time = item.reminderTime;
        if (item.isActive !== undefined && item.isActive !== null) data.is_active = item.isActive;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        return data;
    });
}

async function syncHabitLogs() {
    const localData = await db.habitLogs.toArray();
    return syncTable('habit_logs', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            habit_id: item.habitId,
            date: item.date,
        };
        if (item.completed !== undefined && item.completed !== null) data.completed = item.completed;
        if (item.notes !== undefined && item.notes !== null) data.notes = item.notes;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        return data;
    });
}

async function syncHealthMetrics() {
    const localData = await db.healthMetrics.toArray();
    return syncTable('health_metrics', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            name: item.name,
            unit: item.unit,
            type: item.type || 'measurement', // Default type if not set
        };
        if (item.targetValue !== undefined && item.targetValue !== null) data.target_value = item.targetValue;
        if (item.targetOperator !== undefined && item.targetOperator !== null) data.target_operator = item.targetOperator;
        if (item.color !== undefined && item.color !== null) data.color = item.color;
        if (item.icon !== undefined && item.icon !== null) data.icon = item.icon;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        return data;
    });
}

async function syncHealthLogs() {
    const localData = await db.healthLogs.toArray();
    return syncTable('health_logs', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            metric_id: item.metricId,
            value: item.value,
            date: item.date,
        };
        if (item.notes !== undefined && item.notes !== null) data.notes = item.notes;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        return data;
    });
}

async function syncFolders() {
    const localData = await db.folders.toArray();
    return syncTable('folders', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            name: item.name,
        };
        if (item.parentId !== undefined && item.parentId !== null) data.parent_id = item.parentId;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        if (item.updatedAt !== undefined && item.updatedAt !== null) data.updated_at = item.updatedAt;
        return data;
    });
}

async function syncNotes() {
    const localData = await db.notes.toArray();
    return syncTable('notes', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            title: item.title,
        };
        if (item.content !== undefined && item.content !== null) data.content = item.content;
        if (item.tags !== undefined && item.tags !== null) data.tags = item.tags;
        if (item.status !== undefined && item.status !== null) data.status = item.status;
        if (item.folderId !== undefined && item.folderId !== null) data.folder_id = item.folderId;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        if (item.updatedAt !== undefined && item.updatedAt !== null) data.updated_at = item.updatedAt;
        return data;
    });
}

async function syncFastingLogs() {
    const localData = await db.fastingLogs.toArray();
    return syncTable('fasting_logs', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            date: item.date,
            type: item.type,
            status: item.status,
        };
        if (item.notes !== undefined && item.notes !== null) data.notes = item.notes;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        return data;
    });
}

async function syncIslamicEvents() {
    const localData = await db.islamicEvents.toArray();
    return syncTable('islamic_events', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            gregorian_date: item.gregorianDate,
        };
        if (item.hijriDate !== undefined && item.hijriDate !== null) data.hijri_date = item.hijriDate;
        if (item.notes !== undefined && item.notes !== null) data.notes = item.notes;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        return data;
    });
}

async function syncDailyReflections() {
    const localData = await db.dailyReflections.toArray();
    return syncTable('daily_reflections', localData, (item, userId) => {
        const data: any = {
            date: item.date,
            user_id: userId,
        };
        if (item.gratitude !== undefined && item.gratitude !== null) data.gratitude = item.gratitude;
        if (item.wins !== undefined && item.wins !== null) data.wins = item.wins;
        if (item.challenges !== undefined && item.challenges !== null) data.challenges = item.challenges;
        if (item.tomorrowGoals !== undefined && item.tomorrowGoals !== null) data.tomorrow_goals = item.tomorrowGoals;
        if (item.mood !== undefined && item.mood !== null) data.mood = item.mood;
        if (item.energyLevel !== undefined && item.energyLevel !== null) data.energy_level = item.energyLevel;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        if (item.updatedAt !== undefined && item.updatedAt !== null) data.updated_at = item.updatedAt;
        return data;
    });
}

async function syncReminders() {
    const localData = await db.reminders.toArray();
    return syncTable('reminders', localData, (item, userId) => {
        const data: any = {
            id: item.id,
            user_id: userId,
            title: item.title,
            due_date: item.dueDate,
            priority: item.priority,
            category: item.category,
            status: item.status,
        };
        if (item.description !== undefined && item.description !== null) data.description = item.description;
        if (item.dueTime !== undefined && item.dueTime !== null) data.due_time = item.dueTime;
        if (item.recurring !== undefined && item.recurring !== null) data.recurring = item.recurring;
        if (item.recurringDays !== undefined && item.recurringDays !== null) data.recurring_days = item.recurringDays;
        if (item.notificationEnabled !== undefined && item.notificationEnabled !== null) data.notification_enabled = item.notificationEnabled;
        if (item.notificationTime !== undefined && item.notificationTime !== null) data.notification_time = item.notificationTime;
        if (item.tags !== undefined && item.tags !== null) data.tags = item.tags;
        if (item.createdAt !== undefined && item.createdAt !== null) data.created_at = item.createdAt;
        if (item.completedAt !== undefined && item.completedAt !== null) data.completed_at = item.completedAt;
        return data;
    });
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
        syncFolders(),
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
        pullTable('folders', db.folders),
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
