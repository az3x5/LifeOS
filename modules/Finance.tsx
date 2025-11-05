import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Dexie from 'dexie';
import { db } from '../services/db';
import { Account, Transaction, Category, Budget, SavingsGoal } from '../types';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

const TABS = ['Overview', 'Transactions', 'Accounts', 'Budgets', 'Goals', 'Settings'];

const formatCurrency = (value: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);

const Finance: React.FC = () => {
    const [activeTab, setActiveTab] = useState(TABS[0]);

    // Modal State
    const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [isAddBudgetModalOpen, setIsAddBudgetModalOpen] = useState(false);
    const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
    const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);
    const [goalToAddFunds, setGoalToAddFunds] = useState<SavingsGoal | null>(null);

    // Editing State
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

    // Confirm/Alert Modals
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);

    // Data Hooks
    const accounts = useLiveQuery(() => db.accounts.toArray(), []);
    const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []);
    const categories = useLiveQuery(() => db.categories.toArray(), []);
    const budgets = useLiveQuery(() => db.budgets.toArray(), []);
    const goals = useLiveQuery(() => db.savingsGoals.toArray(), []);

    const openEditTransactionModal = (tx: Transaction) => {
        setEditingTransaction(tx);
        setIsAddTransactionModalOpen(true);
    };

    const openEditAccountModal = (acc: Account) => {
        setEditingAccount(acc);
        setIsAddAccountModalOpen(true);
    };
    
    const openEditBudgetModal = (budget: Budget) => {
        setEditingBudget(budget);
        setIsAddBudgetModalOpen(true);
    };

    const openEditGoalModal = (goal: SavingsGoal) => {
        setEditingGoal(goal);
        setIsAddGoalModalOpen(true);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Overview':
                return <OverviewTab accounts={accounts} transactions={transactions} categories={categories} />;
            case 'Transactions':
                return <TransactionsTab transactions={transactions} categories={categories} accounts={accounts} onEdit={openEditTransactionModal} setConfirmModal={setConfirmModal} />;
            case 'Accounts':
                return <AccountsTab accounts={accounts} onEdit={openEditAccountModal} setConfirmModal={setConfirmModal} setAlertModal={setAlertModal} />;
            case 'Budgets':
                return <BudgetsTab budgets={budgets} transactions={transactions} categories={categories} onEdit={openEditBudgetModal} />;
            case 'Goals':
                return <GoalsTab goals={goals} onEdit={openEditGoalModal} onAddFunds={setGoalToAddFunds} />;
            case 'Settings':
                return <FinanceSettingsTab onManageCategories={() => setIsManageCategoriesModalOpen(true)} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <h1 className="text-4xl font-bold text-text-primary">Finance</h1>
                <div className="space-x-2 flex-wrap">
                    <button onClick={() => { setEditingGoal(null); setIsAddGoalModalOpen(true); }} className="bg-tertiary hover:bg-opacity-80 text-text-secondary font-bold py-3 px-5 rounded-lg text-sm">+ Goal</button>
                    <button onClick={() => { setEditingBudget(null); setIsAddBudgetModalOpen(true); }} className="bg-tertiary hover:bg-opacity-80 text-text-secondary font-bold py-3 px-5 rounded-lg text-sm">+ Budget</button>
                    <button onClick={() => { setEditingAccount(null); setIsAddAccountModalOpen(true); }} className="bg-tertiary hover:bg-opacity-80 text-text-secondary font-bold py-3 px-5 rounded-lg text-sm">+ Account</button>
                    <button onClick={() => { setEditingTransaction(null); setIsAddTransactionModalOpen(true); }} className="bg-accent hover:bg-accent-hover text-white font-bold py-3 px-5 rounded-lg text-sm shadow-md transition-transform transform hover:scale-105">+ Transaction</button>
                </div>
            </div>
            
            <div className="border-b border-tertiary">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-6">
                {renderTabContent()}
            </div>
            
            {(isAddTransactionModalOpen || editingTransaction) && <AddTransactionModal closeModal={() => { setIsAddTransactionModalOpen(false); setEditingTransaction(null); }} categories={categories} accounts={accounts} transactionToEdit={editingTransaction} />}
            {(isAddAccountModalOpen || editingAccount) && <AddAccountModal closeModal={() => { setIsAddAccountModalOpen(false); setEditingAccount(null); }} accountToEdit={editingAccount} />}
            {(isAddBudgetModalOpen || editingBudget) && <AddBudgetModal closeModal={() => { setIsAddBudgetModalOpen(false); setEditingBudget(null); }} categories={categories} budgetToEdit={editingBudget} />}
            {(isAddGoalModalOpen || editingGoal) && <AddGoalModal closeModal={() => { setIsAddGoalModalOpen(false); setEditingGoal(null); }} goalToEdit={editingGoal} />}
            {goalToAddFunds && <AddFundsToGoalModal goal={goalToAddFunds} accounts={accounts} categories={categories} closeModal={() => setGoalToAddFunds(null)} />}
            {isManageCategoriesModalOpen && <ManageCategoriesModal closeModal={() => setIsManageCategoriesModalOpen(false)} />}

            {confirmModal && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText="Delete"
                    icon={confirmModal.icon || "🗑️"}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
            {alertModal && (
                <AlertModal
                    isOpen={alertModal.isOpen}
                    title={alertModal.title}
                    message={alertModal.message}
                    icon={alertModal.icon || "⚠️"}
                    onClose={() => setAlertModal(null)}
                />
            )}
        </div>
    );
};

// --- TABS ---

const StatCard: React.FC<{ title: string; value: string; className?: string }> = ({ title, value, className }) => (
    <div className="bg-secondary p-6 rounded-xl border border-tertiary">
        <h3 className="text-base text-text-secondary">{title}</h3>
        <p className={`text-3xl font-bold text-text-primary ${className || ''}`}>{value}</p>
    </div>
);

const OverviewTab: React.FC<{ accounts?: Account[], transactions?: Transaction[], categories?: Category[] }> = ({ accounts, transactions, categories }) => {
    const [dateFilter, setDateFilter] = useState('30d');
    
    const overviewData = useMemo(() => {
        if (!accounts || !transactions || !categories) return { netWorth: 0, income: 0, expenses: 0, aiSummary: '', incomeVsExpense: [], categoryBreakdown: [] };
        
        const netWorth = accounts.filter(a => a.includeInNetWorth).reduce((sum, a) => sum + a.balance, 0);
        
        const now = new Date();
        const startDate = new Date();
        let daysToAnalyze = 30;
        if (dateFilter === '90d') {
            startDate.setDate(now.getDate() - 90);
            daysToAnalyze = 90;
        } else if (dateFilter === 'year') {
            startDate.setFullYear(now.getFullYear(), 0, 1);
            daysToAnalyze = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
        } else {
             startDate.setDate(now.getDate() - 30);
        }
        startDate.setHours(0,0,0,0);

        const filteredTransactions = transactions.filter(t => new Date(t.date) >= startDate);
        
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
        
        const aiSummary = `In the last ${daysToAnalyze} days, you've spent ${formatCurrency(expenses)} and earned ${formatCurrency(income)}, resulting in a net saving of ${formatCurrency(income - expenses)}.`;

        const dateRange = Array.from({ length: daysToAnalyze }, (_, i) => {
             const d = new Date(startDate);
             d.setDate(d.getDate() + i);
             return d;
        });

        const incomeVsExpense = dateRange.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const dayIncome = filteredTransactions.filter(t => new Date(t.date).toISOString().startsWith(dateStr) && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
            const dayExpenses = filteredTransactions.filter(t => new Date(t.date).toISOString().startsWith(dateStr) && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
            return {
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric'}),
                Income: dayIncome,
                Expenses: dayExpenses
            };
        });

        const categoryMap = categories.reduce((acc, cat) => ({ ...acc, [cat.id!]: cat.name }), {} as {[id: number]: string});
        const expenseByCategory = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
            const catName = categoryMap[t.categoryId] || 'Uncategorized';
            acc[catName] = (acc[catName] || 0) + Number(t.amount);
            return acc;
        }, {} as {[key: string]: number});
        
        const categoryBreakdown = Object.entries(expenseByCategory).map(([name, value]) => ({name, value}));
            
        return { netWorth, income, expenses, aiSummary, incomeVsExpense, categoryBreakdown };

    }, [accounts, transactions, categories, dateFilter]);
    
    const PIE_COLORS = ['#00A99D', '#2D4A53', '#80CBC4', '#E0F2F1', '#B2DFDB'];

    return (
        <div className="space-y-8">
             <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-grow">
                    <StatCard title="Net Worth" value={formatCurrency(overviewData.netWorth)} />
                    <StatCard title="Income (period)" value={formatCurrency(overviewData.income)} className="text-green-400" />
                    <StatCard title="Expenses (period)" value={formatCurrency(overviewData.expenses)} className="text-red-400" />
                 </div>
                 <div className="flex-shrink-0">
                    <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-secondary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent text-sm w-full sm:w-auto">
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="year">This Year</option>
                    </select>
                </div>
            </div>

            <div className="bg-secondary p-5 rounded-xl border border-tertiary">
                <h3 className="font-semibold text-sm text-accent">AI Summary</h3>
                <p className="text-text-secondary mt-1">{overviewData.aiSummary}</p>
            </div>
        </div>
    );
};

const TransactionsTab: React.FC<{
    transactions?: Transaction[],
    categories?: Category[],
    accounts?: Account[],
    onEdit: (tx: Transaction) => void,
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void
}> = ({ transactions, categories, accounts, onEdit, setConfirmModal }) => {
    const categoryMap = useMemo(() => categories?.reduce((acc, cat) => ({ ...acc, [cat.id!]: cat }), {} as { [id: number]: Category }) ?? {}, [categories]);
    const accountMap = useMemo(() => accounts?.reduce((acc, accnt) => ({ ...acc, [accnt.id!]: accnt }), {} as { [id: number]: Account }) ?? {}, [accounts]);

    const handleDelete = async (tx: Transaction) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Transaction',
            message: `Delete transaction "${tx.description}"? This action cannot be undone.`,
            icon: '💸',
            onConfirm: async () => {
                await (db as Dexie).transaction('rw', db.transactions, db.accounts, async () => {
                    // Robustness check: Ensure accountId exists and amount is a valid number before updating balance.
                    if (tx.accountId != null && typeof tx.amount === 'number' && isFinite(tx.amount)) {
                        const amountToRevert = tx.type === 'income' ? -tx.amount : tx.amount;

                        await db.accounts.where({ id: tx.accountId }).modify(account => {
                            // Even more robust: check if account.balance is valid before modifying.
                            if (typeof account.balance === 'number' && isFinite(account.balance)) {
                                account.balance += amountToRevert;
                            } else {
                                console.error(`Account (ID: ${tx.accountId}) balance is corrupted (NaN/Infinity). Skipping balance update for this deletion.`);
                            }
                        });
                    } else {
                        console.warn(`Skipping balance update for transaction (ID: ${tx.id}). It may be legacy data or have an invalid amount.`);
                    }
                    await db.transactions.delete(tx.id!);
                });
                setConfirmModal(null);
            }
        });
    };

    return (
        <div className="bg-secondary p-2 md:p-6 rounded-xl border border-tertiary">
            <h2 className="text-xl font-semibold mb-4 px-4 md:px-0">All Transactions</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-tertiary">
                        <tr>
                            <th className="p-4 font-semibold text-text-secondary">Description</th>
                            <th className="hidden md:table-cell p-4 font-semibold text-text-secondary">Account</th>
                            <th className="hidden md:table-cell p-4 font-semibold text-text-secondary">Category</th>
                            <th className="p-4 font-semibold text-text-secondary">Date</th>
                            <th className="p-4 font-semibold text-text-secondary text-right">Amount</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions?.map(t => (
                            <tr key={t.id} className="border-b border-tertiary last:border-b-0 hover:bg-tertiary/40">
                                <td className="p-4 font-medium text-text-primary">
                                    {t.description}
                                    <div className="md:hidden text-xs text-text-muted">{accountMap[t.accountId]?.name} &bull; {categoryMap[t.categoryId]?.name}</div>
                                </td>
                                <td className="hidden md:table-cell p-4 text-text-secondary">{accountMap[t.accountId]?.name || 'Unknown Account'}</td>
                                <td className="hidden md:table-cell p-4 text-text-secondary">{categoryMap[t.categoryId]?.name || 'Uncategorized'}</td>
                                <td className="p-4 text-text-secondary">{new Date(t.date).toLocaleDateString()}</td>
                                <td className={`p-4 font-bold text-right ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(t.amount)}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => onEdit(t)} title="Edit" className="p-1 text-text-muted hover:text-accent"><span className="material-symbols-outlined text-base">edit</span></button>
                                    <button onClick={() => handleDelete(t)} title="Delete" className="p-1 text-text-muted hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {(!transactions || transactions.length === 0) && <p className="text-text-muted p-4 text-center">No transactions found.</p>}
        </div>
    );
};

const AccountsTab: React.FC<{
    accounts?: Account[],
    onEdit: (acc: Account) => void,
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void,
    setAlertModal: (modal: { isOpen: boolean; title: string; message: string; icon?: string } | null) => void
}> = ({ accounts, onEdit, setConfirmModal, setAlertModal }) => {
    const handleDelete = async (account: Account) => {
        const txCount = await db.transactions.where({ accountId: account.id! }).count();
        if (txCount > 0) {
            setAlertModal({
                isOpen: true,
                title: 'Cannot Delete Account',
                message: "Cannot delete an account with associated transactions. Please delete or re-assign transactions first.",
                icon: '🚫'
            });
            return;
        }
        setConfirmModal({
            isOpen: true,
            title: 'Delete Account',
            message: `Are you sure you want to delete the account "${account.name}"? This action is permanent.`,
            icon: '🏦',
            onConfirm: async () => {
                await db.accounts.delete(account.id!);
                setConfirmModal(null);
            }
        });
    };

     return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts?.map(account => (
                <div key={account.id} className="bg-secondary p-6 rounded-xl border border-tertiary group">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">{account.name}</h3>
                            <p className="text-sm text-text-muted">{account.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-xs bg-tertiary text-text-secondary px-2 py-1 rounded-full">{account.currency}</span>
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(account)} title="Edit" className="p-1 text-text-muted hover:text-accent"><span className="material-symbols-outlined text-base">edit</span></button>
                                <button onClick={() => handleDelete(account)} title="Delete" className="p-1 text-text-muted hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button>
                             </div>
                        </div>
                    </div>
                    <p className="text-3xl font-bold mt-4">{formatCurrency(account.balance, account.currency)}</p>
                </div>
            ))}
             {(!accounts || accounts.length === 0) && <p className="text-text-muted p-4 md:col-span-2">No accounts found. Add one to get started!</p>}
        </div>
    );
};

const BudgetsTab: React.FC<{ budgets?: Budget[], transactions?: Transaction[], categories?: Category[], onEdit: (budget: Budget) => void }> = ({ budgets, transactions, categories, onEdit }) => {
    const budgetData = useMemo(() => {
        if (!budgets || !transactions || !categories) return [];
        
        const categoryMap = categories.reduce((acc, cat) => ({ ...acc, [cat.id!]: cat }), {} as {[id: number]: Category});
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyExpenses = transactions.filter(t => {
            const date = new Date(t.date);
            return t.type === 'expense' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        return budgets.map(budget => {
            const category = categoryMap[budget.categoryId]
            const spent = monthlyExpenses.filter(t => t.categoryId === budget.categoryId).reduce((sum, t) => sum + Number(t.amount), 0);
            const remaining = budget.amount - spent;
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            return { ...budget, categoryName: category?.name || 'Unknown', categoryIcon: category?.icon || 'category', spent, remaining, percentage };
        });
    }, [budgets, transactions, categories]);
    
    const handleDelete = async (budgetId: number) => {
        if (window.confirm("Are you sure you want to delete this budget?")) {
            await db.budgets.delete(budgetId);
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {budgetData.map(b => <BudgetCard key={b.id} budget={b} onEdit={() => onEdit(b)} onDelete={() => handleDelete(b.id!)} />)}
                {(!budgets || budgets.length === 0) && <div className="bg-secondary p-6 rounded-xl border border-tertiary md:col-span-full"><p className="text-text-muted">No budgets set up yet. Click '+ Budget' to create one.</p></div>}
            </div>
        </div>
    );
};

const BudgetCard: React.FC<{ budget: any, onEdit: () => void, onDelete: () => void }> = ({ budget, onEdit, onDelete }) => {
    const progressColor = budget.percentage > 95 ? 'bg-red-500' : budget.percentage > 75 ? 'bg-yellow-500' : 'bg-accent';
    
    return (
        <div className="bg-secondary p-5 rounded-xl border border-tertiary group">
            <div className="flex items-start justify-between">
                <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-tertiary rounded-lg flex items-center justify-center mr-4">
                        <span className="material-symbols-outlined text-accent text-2xl">{budget.categoryIcon}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-text-primary">{budget.categoryName}</h3>
                        <p className="text-sm text-text-secondary">{formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}</p>
                    </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} title="Edit" className="p-1 text-text-muted hover:text-accent"><span className="material-symbols-outlined text-base">edit</span></button>
                    <button onClick={onDelete} title="Delete" className="p-1 text-text-muted hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button>
                </div>
            </div>
            <div className="w-full bg-tertiary rounded-full h-2.5">
                <div className={`${progressColor} h-2.5 rounded-full`} style={{ width: `${Math.min(budget.percentage, 100)}%` }}></div>
            </div>
            <div className="flex justify-between mt-2 text-sm">
                <span className="text-text-muted">{budget.percentage.toFixed(0)}% Used</span>
                <span className={`font-medium ${budget.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(Math.abs(budget.remaining))} {budget.remaining >= 0 ? 'Left' : 'Over'}
                </span>
            </div>
        </div>
    );
};

const GoalsTab: React.FC<{ goals?: SavingsGoal[], onEdit: (goal: SavingsGoal) => void, onAddFunds: (goal: SavingsGoal) => void }> = ({ goals, onEdit, onAddFunds }) => {
    const handleDelete = async (goalId: number) => {
        if (window.confirm("Are you sure you want to delete this savings goal?")) {
            await db.savingsGoals.delete(goalId);
        }
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals?.map(goal => {
                const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                return (
                    <div key={goal.id} className="bg-secondary p-6 rounded-xl border border-tertiary group">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg">{goal.name}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-accent">{percentage.toFixed(0)}%</span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onEdit(goal)} title="Edit" className="p-1 text-text-muted hover:text-accent"><span className="material-symbols-outlined text-base">edit</span></button>
                                    <button onClick={() => handleDelete(goal.id!)} title="Delete" className="p-1 text-text-muted hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button>
                                </div>
                            </div>
                        </div>
                        <div className="w-full bg-tertiary rounded-full h-3 mb-2">
                            <div className="bg-accent h-3 rounded-full" style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                        </div>
                        <div className="text-sm flex justify-between items-center">
                            <div>
                                <span className="text-text-secondary">{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                                {goal.deadline && <span className="text-text-muted block">Due: {new Date(goal.deadline).toLocaleDateString()}</span>}
                            </div>
                            <button onClick={() => onAddFunds(goal)} className="bg-accent/20 hover:bg-accent/40 text-accent font-bold py-2 px-4 rounded-lg text-sm">Add Funds</button>
                        </div>
                    </div>
                );
            })}
            {(!goals || goals.length === 0) && <div className="bg-secondary p-6 rounded-xl border border-tertiary md:col-span-2"><p className="text-text-muted text-center">No goals set yet. Click '+ Goal' to create one.</p></div>}
        </div>
    );
};

const FinanceSettingsTab: React.FC<{ onManageCategories: () => void }> = ({ onManageCategories }) => (
    <div className="bg-secondary p-6 rounded-xl border border-tertiary">
        <h2 className="text-xl font-semibold mb-4">Finance Settings</h2>
        <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-primary rounded-lg">
                <div>
                    <h3 className="font-semibold text-text-primary">Manage Categories</h3>
                    <p className="text-sm text-text-muted">Add, edit, or delete your income and expense categories.</p>
                </div>
                <button onClick={onManageCategories} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg text-sm">Manage</button>
            </div>
        </div>
    </div>
);


// --- MODALS ---

const AddTransactionModal: React.FC<{ closeModal: () => void; categories?: Category[]; accounts?: Account[]; transactionToEdit: Transaction | null }> = ({ closeModal, categories, accounts, transactionToEdit }) => {
    const [type, setType] = useState<'income' | 'expense'>(transactionToEdit?.type || 'expense');
    const [description, setDescription] = useState(transactionToEdit?.description || '');
    const [amount, setAmount] = useState(transactionToEdit?.amount?.toString() || '');
    const [categoryId, setCategoryId] = useState(transactionToEdit?.categoryId?.toString() || '');
    const [accountId, setAccountId] = useState(transactionToEdit?.accountId?.toString() || '');
    const [date, setDate] = useState(new Date(transactionToEdit?.date || new Date()).toISOString().split('T')[0]);

    const filteredCategories = useMemo(() => categories?.filter(c => c.type === type) || [], [categories, type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !categoryId || !accountId || !date) return;
        
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            alert("Please enter a valid positive amount.");
            return;
        }

        const transactionData = {
            description: description.trim() || (filteredCategories.find(c => c.id === +categoryId)?.name ?? 'Transaction'),
            amount: numericAmount,
            type,
            categoryId: +categoryId,
            accountId: +accountId,
            date: new Date(date),
            currency: accounts?.find(a => a.id === +accountId)?.currency || 'USD',
        };

        // FIX: Cast 'db' to Dexie to resolve incorrect type inference for the 'transaction' method.
        await (db as Dexie).transaction('rw', db.transactions, db.accounts, async () => {
            if (transactionToEdit) {
                // Revert old transaction effect
                const oldTx = await db.transactions.get(transactionToEdit.id!);
                if(oldTx) {
                    const revertAmount = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
                    await db.accounts.where({ id: oldTx.accountId }).modify(account => {
                        account.balance += revertAmount;
                    });
                }
                
                // Update transaction
                await db.transactions.update(transactionToEdit.id!, transactionData);
                
                // Apply new transaction effect (might be on a new account)
                const applyAmount = transactionData.type === 'income' ? transactionData.amount : -transactionData.amount;
                await db.accounts.where({ id: transactionData.accountId }).modify(account => {
                    account.balance += applyAmount;
                });

            } else {
                // Add new transaction
                await db.transactions.add(transactionData);
                // Apply transaction effect
                const applyAmount = transactionData.type === 'income' ? transactionData.amount : -transactionData.amount;
                await db.accounts.where({ id: transactionData.accountId }).modify(account => {
                    account.balance += applyAmount;
                });
            }
        });

        closeModal();
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-3xl font-bold mb-6">{transactionToEdit ? 'Edit' : 'Add'} Transaction</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex space-x-2 bg-primary p-1 rounded-lg">
                        <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${type === 'expense' ? 'bg-red-500/80 shadow-md' : 'hover:bg-tertiary'}`}>Expense</button>
                        <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${type === 'income' ? 'bg-green-500/80 shadow-md' : 'hover:bg-tertiary'}`}>Income</button>
                    </div>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required />
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required />
                    <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required><option value="">Select Account</option>{accounts?.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}</select>
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required><option value="">Select Category</option>{filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required />
                    <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={closeModal} className="bg-tertiary text-text-secondary py-2 px-6 rounded-lg">Cancel</button><button type="submit" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Save</button></div>
                </form>
            </div>
        </div>
    );
};

const AddAccountModal: React.FC<{ closeModal: () => void; accountToEdit: Account | null }> = ({ closeModal, accountToEdit }) => {
    const [name, setName] = useState(accountToEdit?.name || '');
    const [type, setType] = useState<Account['type']>(accountToEdit?.type || 'Bank');
    const [balance, setBalance] = useState(accountToEdit?.balance?.toString() || '');
    const [currency, setCurrency] = useState(accountToEdit?.currency || 'USD');
    const [includeInNetWorth, setIncludeInNetWorth] = useState(accountToEdit?.includeInNetWorth ?? true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!name || !balance || !currency) return;
        const accountData = { name, type, balance: +balance, currency, includeInNetWorth, createdAt: accountToEdit?.createdAt || new Date() };
        if(accountToEdit) {
            await db.accounts.update(accountToEdit.id!, accountData);
        } else {
            await db.accounts.add(accountData);
        }
        closeModal();
    }

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-3xl font-bold mb-6">{accountToEdit ? 'Edit' : 'Add'} Account</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Account Name" className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3" required />
                    <select value={type} onChange={e => setType(e.target.value as Account['type'])} className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3"><option>Bank</option><option>Cash</option><option>Crypto</option><option>Investment</option><option>Other Asset</option></select>
                    <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="Current Balance" className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3" required />
                    <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} placeholder="Currency (e.g., USD)" className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3" required />
                    <label className="flex items-center gap-2"><input type="checkbox" checked={includeInNetWorth} onChange={e => setIncludeInNetWorth(e.target.checked)} className="h-4 w-4 rounded bg-primary border-tertiary" /> Include in Net Worth</label>
                    <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={closeModal} className="bg-tertiary py-2 px-6 rounded-lg">Cancel</button><button type="submit" className="bg-accent text-white font-bold py-2 px-6 rounded-lg">Save</button></div>
                </form>
            </div>
        </div>
    );
};

const AddBudgetModal: React.FC<{ closeModal: () => void; categories?: Category[]; budgetToEdit: Budget | null }> = ({ closeModal, categories, budgetToEdit }) => {
    const [categoryId, setCategoryId] = useState(budgetToEdit?.categoryId?.toString() || '');
    const [amount, setAmount] = useState(budgetToEdit?.amount?.toString() || '');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!categoryId || !amount) return;
        const budgetData = { categoryId: +categoryId, amount: +amount, period: 'monthly' as const };
        if(budgetToEdit) {
            await db.budgets.update(budgetToEdit.id!, budgetData);
        } else {
            await db.budgets.add(budgetData);
        }
        closeModal();
    }
    
    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-3xl font-bold mb-6">{budgetToEdit ? 'Edit' : 'Add'} Budget</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3" required><option value="">Select Category</option>{categories?.filter(c=>c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Budget Amount" className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3" required />
                    <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={closeModal} className="bg-tertiary py-2 px-6 rounded-lg">Cancel</button><button type="submit" className="bg-accent text-white font-bold py-2 px-6 rounded-lg">Save</button></div>
                </form>
            </div>
        </div>
    );
};

const AddGoalModal: React.FC<{ closeModal: () => void; goalToEdit: SavingsGoal | null }> = ({ closeModal, goalToEdit }) => {
    const [name, setName] = useState(goalToEdit?.name || '');
    const [targetAmount, setTargetAmount] = useState(goalToEdit?.targetAmount?.toString() || '');
    const [currentAmount, setCurrentAmount] = useState(goalToEdit?.currentAmount?.toString() || '0');
    const [deadline, setDeadline] = useState(goalToEdit?.deadline ? new Date(goalToEdit.deadline).toISOString().split('T')[0] : '');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !targetAmount) return;
        const goalData = { name, targetAmount: +targetAmount, currentAmount: +currentAmount, deadline: deadline ? new Date(deadline) : undefined };
        if (goalToEdit) {
            await db.savingsGoals.update(goalToEdit.id!, goalData);
        } else {
            await db.savingsGoals.add(goalData);
        }
        closeModal();
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-3xl font-bold mb-6">{goalToEdit ? 'Edit' : 'Add'} Goal</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Goal Name (e.g., New Laptop)" className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3" required />
                    <input type="number" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="Target Amount" className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3" required />
                    <input type="number" step="0.01" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} placeholder="Current Amount Saved" className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3" required />
                    <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3" />
                    <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={closeModal} className="bg-tertiary py-2 px-6 rounded-lg">Cancel</button><button type="submit" className="bg-accent text-white font-bold py-2 px-6 rounded-lg">Save</button></div>
                </form>
            </div>
        </div>
    );
};

const AddFundsToGoalModal: React.FC<{ goal: SavingsGoal; accounts?: Account[]; categories?: Category[]; closeModal: () => void }> = ({ goal, accounts, categories, closeModal }) => {
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState('');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !accountId) return;

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            alert("Please enter a valid positive amount to add.");
            return;
        }
        
        const savingsCategory = categories?.find(c => c.name === 'Savings');
        if (!savingsCategory) {
            alert("Could not find 'Savings' category. Please create one in Settings.");
            return;
        }

        const transactionData = {
            description: `Contribution to "${goal.name}"`,
            amount: numericAmount,
            type: 'expense' as const,
            categoryId: savingsCategory.id!,
            accountId: +accountId,
            date: new Date(),
            currency: accounts?.find(a => a.id === +accountId)?.currency || 'USD'
        };
        
        // FIX: Cast 'db' to Dexie to resolve incorrect type inference for the 'transaction' method.
        await (db as Dexie).transaction('rw', db.transactions, db.accounts, db.savingsGoals, async () => {
            await db.transactions.add(transactionData);
            await db.accounts.where({ id: +accountId }).modify(account => {
                account.balance -= transactionData.amount;
            });
            await db.savingsGoals.where({ id: goal.id! }).modify(g => {
                g.currentAmount += transactionData.amount;
            });
        });
        
        closeModal();
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-3xl font-bold mb-2">Add Funds to Goal</h2>
                <p className="text-text-secondary mb-6">"{goal.name}"</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount to add" className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3" required />
                    <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3" required><option value="">From Account</option>{accounts?.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}</select>
                    <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={closeModal} className="bg-tertiary py-2 px-6 rounded-lg">Cancel</button><button type="submit" className="bg-accent text-white font-bold py-2 px-6 rounded-lg">Add</button></div>
                </form>
            </div>
        </div>
    );
}

const ManageCategoriesModal: React.FC<{ closeModal: () => void }> = ({ closeModal }) => {
    const categories = useLiveQuery(() => db.categories.toArray(), []);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        await db.categories.add({ name: newCategoryName.trim(), type: newCategoryType, icon: 'category' });
        setNewCategoryName('');
    };

    const handleDeleteCategory = async (id: number) => {
        const txCount = await db.transactions.where({ categoryId: id }).count();
        if (txCount > 0) {
            alert("Cannot delete category with associated transactions.");
            return;
        }
        if (window.confirm("Delete this category?")) {
            await db.categories.delete(id);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-tertiary">
                <h2 className="text-3xl font-bold mb-6">Manage Categories</h2>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold mb-2">Income</h3>
                        <ul className="space-y-2">{categories?.filter(c=>c.type==='income').map(c => <li key={c.id} className="flex justify-between items-center p-2 bg-primary rounded"><span>{c.name}</span><button onClick={() => handleDeleteCategory(c.id!)} className="text-red-500 text-xs">Delete</button></li>)}</ul>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-2">Expense</h3>
                        <ul className="space-y-2">{categories?.filter(c=>c.type==='expense').map(c => <li key={c.id} className="flex justify-between items-center p-2 bg-primary rounded"><span>{c.name}</span><button onClick={() => handleDeleteCategory(c.id!)} className="text-red-500 text-xs">Delete</button></li>)}</ul>
                    </div>
                </div>
                 <div className="border-t border-tertiary mt-6 pt-6">
                    <h3 className="font-semibold mb-4">Add New Category</h3>
                    <div className="flex gap-2">
                        <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Category Name" className="flex-grow bg-primary border border-tertiary rounded-lg py-2 px-3" />
                        <select value={newCategoryType} onChange={e => setNewCategoryType(e.target.value as any)} className="bg-primary border border-tertiary rounded-lg py-2 px-3"><option value="expense">Expense</option><option value="income">Income</option></select>
                        <button onClick={handleAddCategory} className="bg-accent text-white font-bold py-2 px-4 rounded-lg">Add</button>
                    </div>
                </div>
                <div className="flex justify-end pt-6"><button onClick={closeModal} className="bg-tertiary py-2 px-6 rounded-lg">Done</button></div>
            </div>
        </div>
    );
}

export default Finance;