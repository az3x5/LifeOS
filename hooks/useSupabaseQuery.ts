import { useState, useEffect } from 'react';
import { fetchFromSupabase, subscribeToTable, registerRefetchCallback } from '../services/supabaseService';
import { supabase } from '../services/supabase';

/**
 * Custom hook to fetch and subscribe to data from Supabase
 * Replaces useLiveQuery from Dexie
 */
export function useSupabaseQuery<T>(
    tableName: string,
    filters?: Record<string, any>,
    dependencies: any[] = []
): T[] | undefined {
    const [data, setData] = useState<T[] | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let unsubscribe: (() => void) | null = null;
        let unregisterRefetch: (() => void) | null = null;

        const fetchData = async () => {
            setIsLoading(true);
            const result = await fetchFromSupabase<T>(tableName, filters);
            if (isMounted) {
                setData(result);
                setIsLoading(false);

                // Subscribe to real-time changes
                unsubscribe = await subscribeToTable<T>(tableName, (updatedData) => {
                    if (isMounted) {
                        setData(updatedData);
                    }
                });

                // Register callback for manual refetch triggers (for create/update/delete operations)
                unregisterRefetch = registerRefetchCallback(tableName, async () => {
                    if (isMounted) {
                        const updatedResult = await fetchFromSupabase<T>(tableName, filters);
                        setData(updatedResult);
                    }
                });
            }
        };

        fetchData();

        return () => {
            isMounted = false;
            if (unsubscribe) {
                unsubscribe();
            }
            if (unregisterRefetch) {
                unregisterRefetch();
            }
        };
    }, [tableName, JSON.stringify(filters), ...dependencies]);

    return data;
}

/**
 * Hook to fetch a single item by ID with real-time updates
 */
export function useSupabaseItem<T>(
    tableName: string,
    id: number | string | null,
    dependencies: any[] = []
): T | undefined {
    const [data, setData] = useState<T | undefined>(undefined);

    useEffect(() => {
        if (!id) {
            setData(undefined);
            return;
        }

        let isMounted = true;
        let unsubscribe: (() => void) | null = null;

        const fetchItem = async () => {
            try {
                const { data: result, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) {
                    console.error(`Error fetching item from ${tableName}:`, error);
                    return;
                }

                if (isMounted) {
                    setData(result as T);
                }

                // Subscribe to real-time changes for this specific item
                unsubscribe = await subscribeToTable<T>(tableName, (updatedData) => {
                    if (isMounted && updatedData.length > 0) {
                        // Find the item with matching ID
                        const updatedItem = updatedData.find((item: any) => item.id === id);
                        if (updatedItem) {
                            setData(updatedItem as T);
                        }
                    }
                });
            } catch (error) {
                console.error(`Failed to fetch item from ${tableName}:`, error);
            }
        };

        fetchItem();

        return () => {
            isMounted = false;
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [tableName, id, ...dependencies]);

    return data;
}

/**
 * Hook to fetch items with custom query and real-time updates
 */
export function useSupabaseCustomQuery<T>(
    tableName: string,
    queryFn: (query: any) => any,
    dependencies: any[] = []
): T[] | undefined {
    const [data, setData] = useState<T[] | undefined>(undefined);

    useEffect(() => {
        let isMounted = true;
        let unsubscribe: (() => void) | null = null;

        const fetchData = async () => {
            try {
                const query = supabase.from(tableName).select('*');
                const { data: result, error } = await queryFn(query);

                if (error) {
                    console.error(`Error in custom query for ${tableName}:`, error);
                    return;
                }

                if (isMounted) {
                    setData(result as T[]);
                }

                // Subscribe to real-time changes
                unsubscribe = await subscribeToTable<T>(tableName, (updatedData) => {
                    if (isMounted) {
                        setData(updatedData);
                    }
                });
            } catch (error) {
                console.error(`Failed to execute custom query for ${tableName}:`, error);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [tableName, ...dependencies]);

    return data;
}

