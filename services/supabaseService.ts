import { supabase } from './supabase';
import {
    Account, Transaction, Category, Budget, SavingsGoal,
    Habit, HabitLog, Routine, UserProfile, Badge, UserBadge,
    HealthMetric, HealthLog, HealthGoal,
    Note, Folder,
    FastingLog, PrayerLog, LearningMaterial, LearningLog, Bookmark, IslamicBookmark,
    IslamicEvent, DailyReflection, Setting, SmartInsight, AppNotification, Reminder
} from '../types';

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
export async function getUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
}

/**
 * Generic fetch function for any table
 */
export async function fetchFromSupabase<T>(
    tableName: string,
    filters?: Record<string, any>
): Promise<T[]> {
    try {
        const userId = await getUserId();
        if (!userId) return [];

        let query = supabase.from(tableName).select('*').eq('user_id', userId);

        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                query = query.eq(toSnakeCase(key), value);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error(`Error fetching from ${tableName}:`, error);
            return [];
        }

        return (data || []).map(item => convertToCamelCase(item)) as T[];
    } catch (error) {
        console.error(`Failed to fetch ${tableName}:`, error);
        return [];
    }
}

// Store callbacks for manual refetch triggers
const refetchCallbacks: Map<string, Set<() => void>> = new Map();

/**
 * Register a refetch callback for a table
 */
export function registerRefetchCallback(tableName: string, callback: () => void): () => void {
    if (!refetchCallbacks.has(tableName)) {
        refetchCallbacks.set(tableName, new Set());
    }
    refetchCallbacks.get(tableName)!.add(callback);

    // Return unsubscribe function
    return () => {
        refetchCallbacks.get(tableName)?.delete(callback);
    };
}

/**
 * Trigger all refetch callbacks for a table
 */
export function triggerRefetch(tableName: string): void {
    const callbacks = refetchCallbacks.get(tableName);
    if (callbacks) {
        callbacks.forEach(callback => callback());
    }
}

/**
 * Generic insert function for any table
 */
export async function insertToSupabase<T>(
    tableName: string,
    data: T
): Promise<T | null> {
    try {
        const userId = await getUserId();
        if (!userId) {
            console.error('No user ID found');
            return null;
        }

        const dataWithUser = { ...data, user_id: userId };
        const snakeCaseData = convertToSnakeCase(dataWithUser);

        console.log(`[insertToSupabase] Inserting into ${tableName}:`, snakeCaseData);

        const { data: result, error } = await supabase
            .from(tableName)
            .insert([snakeCaseData])
            .select()
            .single();

        if (error) {
            console.error(`[insertToSupabase] Error inserting into ${tableName}:`, {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                fullError: error
            });
            return null;
        }

        console.log(`[insertToSupabase] Successfully inserted into ${tableName}:`, result);

        // Trigger refetch callbacks to update UI immediately
        triggerRefetch(tableName);

        return convertToCamelCase(result) as T;
    } catch (error) {
        console.error(`[insertToSupabase] Failed to insert into ${tableName}:`, error);
        return null;
    }
}

/**
 * Generic upsert function for any table (insert or update if exists)
 * Uses a unique column to determine if record exists
 */
export async function upsertToSupabase<T>(
    tableName: string,
    data: T,
    uniqueColumn: string = 'key'
): Promise<T | null> {
    try {
        const userId = await getUserId();
        if (!userId) {
            console.error('No user ID found');
            return null;
        }

        const dataWithUser = { ...data, user_id: userId };
        const snakeCaseData = convertToSnakeCase(dataWithUser);

        const { data: result, error } = await supabase
            .from(tableName)
            .upsert([snakeCaseData], {
                onConflict: uniqueColumn,
                ignoreDuplicates: false
            })
            .select()
            .single();

        if (error) {
            console.error(`Error upserting into ${tableName}:`, error);
            return null;
        }

        // Trigger refetch callbacks to update UI immediately
        triggerRefetch(tableName);

        return convertToCamelCase(result) as T;
    } catch (error) {
        console.error(`Failed to upsert into ${tableName}:`, error);
        return null;
    }
}

/**
 * Generic update function for any table
 */
export async function updateInSupabase<T>(
    tableName: string,
    id: number | string,
    data: Partial<T>
): Promise<T | null> {
    try {
        const snakeCaseData = convertToSnakeCase(data as Record<string, any>);

        const { data: result, error } = await supabase
            .from(tableName)
            .update(snakeCaseData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`Error updating ${tableName}:`, error);
            return null;
        }

        // Trigger refetch callbacks to update UI immediately
        triggerRefetch(tableName);

        return convertToCamelCase(result) as T;
    } catch (error) {
        console.error(`Failed to update ${tableName}:`, error);
        return null;
    }
}

/**
 * Generic delete function for any table
 */
export async function deleteFromSupabase(
    tableName: string,
    id: number | string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`Error deleting from ${tableName}:`, error);
            return false;
        }

        // Trigger refetch callbacks to update UI immediately
        triggerRefetch(tableName);

        return true;
    } catch (error) {
        console.error(`Failed to delete from ${tableName}:`, error);
        return false;
    }
}

/**
 * Subscribe to real-time changes for a table
 */
export async function subscribeToTable<T>(
    tableName: string,
    callback: (data: T[]) => void
): Promise<(() => void) | null> {
    try {
        // Get current user from session
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            console.warn('No user ID available for subscription');
            return null;
        }

        const subscription = supabase
            .channel(`${tableName}_changes_${Date.now()}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: tableName,
                    filter: `user_id=eq.${userId}`,
                },
                async (payload) => {
                    console.log(`Real-time update for ${tableName}:`, payload);
                    // Refetch data when changes occur
                    const data = await fetchFromSupabase<T>(tableName);
                    callback(data);
                }
            )
            .subscribe((status) => {
                console.log(`Subscription status for ${tableName}:`, status);
            });

        return () => {
            supabase.removeChannel(subscription);
        };
    } catch (error) {
        console.error(`Failed to subscribe to ${tableName}:`, error);
        return null;
    }
}

