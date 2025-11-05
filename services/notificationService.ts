import { db } from './db';
import { Module } from '../types';

// Helper to prevent creating duplicate notifications
async function createNotification(notification: {
    key: string;
    module: Module;
    message: string;
    relatedId?: number;
}) {
    const existing = await db.notifications.get({ key: notification.key });
    if (!existing) {
        await db.notifications.add({
            ...notification,
            timestamp: new Date(),
            status: 'unread',
        });
    }
}

// --- Check Functions ---

async function checkHabitNotifications() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayDay = yesterday.getDay();

    const habits = await db.habits.toArray();
    if (!habits) return;
    
    const scheduledHabits = habits.filter(h =>
        h.frequency === 'daily' || (h.frequency === 'custom' && h.daysOfWeek?.includes(yesterdayDay))
    );

    const logsForYesterday = await db.habitLogs.where({ date: yesterdayStr }).toArray();
    const completedHabitIds = new Set(logsForYesterday.map(log => log.habitId));

    for (const habit of scheduledHabits) {
        if (habit.id && !completedHabitIds.has(habit.id)) {
            await createNotification({
                key: `habit-missed-${habit.id}-${yesterdayStr}`,
                module: Module.HABITS,
                message: `You missed completing "${habit.name}" yesterday.`,
                relatedId: habit.id,
            });
        }
    }
}

async function checkFinanceNotifications() {
    const budgets = await db.budgets.where({ period: 'monthly' }).toArray();
    if (!budgets || budgets.length === 0) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthStr = `${now.getFullYear()}-${now.getMonth() + 1}`;

    const transactions = await db.transactions
        .where('date').between(startOfMonth, endOfMonth, true, true)
        .and(t => t.type === 'expense')
        .toArray();

    const expensesByCategory: { [key: number]: number } = {};
    for (const t of transactions) {
        expensesByCategory[t.categoryId] = (expensesByCategory[t.categoryId] || 0) + t.amount;
    }

    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    for (const budget of budgets) {
        const spent = expensesByCategory[budget.categoryId] || 0;
        if (spent > budget.amount) {
            const categoryName = categoryMap.get(budget.categoryId) || 'a category';
            await createNotification({
                key: `finance-budget-exceeded-${budget.id}-${monthStr}`,
                module: Module.FINANCE,
                message: `You've exceeded your monthly budget for ${categoryName}.`,
                relatedId: budget.id,
            });
        }
    }
}

// Main function to run all checks
export async function runNotificationChecks() {
    try {
        await checkHabitNotifications();
        await checkFinanceNotifications();
        // Prayer time notifications would go here if we had the data
    } catch (error) {
        console.error("Error running notification checks:", error);
    }
}
