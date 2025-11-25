import React, { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { Account, Transaction, Category, Budget, SavingsGoal } from '../types';
import { accountsService, transactionsService, categoriesService, budgetsService, savingsGoalsService } from '../services/dataService';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

const TABS = ['Overview', 'Transactions', 'Accounts', 'Budgets', 'Goals'];

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
    const accounts = useSupabaseQuery<Account>('accounts');
    const transactions = useSupabaseQuery<Transaction>('transactions');
    const categories = useSupabaseQuery<Category>('categories');
    const budgets = useSupabaseQuery<Budget>('budgets');
    const goals = useSupabaseQuery<SavingsGoal>('savings_goals');

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
                return <AccountsTab accounts={accounts} transactions={transactions} onEdit={openEditAccountModal} setConfirmModal={setConfirmModal} setAlertModal={setAlertModal} onAddAccount={() => { setEditingAccount(null); setIsAddAccountModalOpen(true); }} />;
            case 'Budgets':
                return <BudgetsTab budgets={budgets} transactions={transactions} categories={categories} onEdit={openEditBudgetModal} onAddBudget={() => { setEditingBudget(null); setIsAddBudgetModalOpen(true); }} />;
            case 'Goals':
                return <GoalsTab goals={goals} onEdit={openEditGoalModal} onAddFunds={setGoalToAddFunds} onAddGoal={() => { setEditingGoal(null); setIsAddGoalModalOpen(true); }} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <h1 className="text-4xl font-bold text-text-primary">Finance</h1>
                <button
                    onClick={() => { setEditingTransaction(null); setIsAddTransactionModalOpen(true); }}
                    className="bg-accent hover:bg-accent-hover text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all transform hover:scale-105 flex items-center gap-2 justify-center"
                >
                    <span className="material-symbols-outlined">add</span>
                    Add Transaction
                </button>
            </div>

            <div className="bg-secondary border border-tertiary rounded-2xl p-2">
                <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${
                                activeTab === tab
                                    ? 'bg-accent text-white shadow-md'
                                    : 'bg-transparent text-text-secondary hover:bg-tertiary hover:text-text-primary'
                            } whitespace-nowrap py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex-shrink-0`}
                        >
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
            {isManageCategoriesModalOpen && <ManageCategoriesModal closeModal={() => setIsManageCategoriesModalOpen(false)} transactions={transactions} />}

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

    const recentTransactions = useMemo(() => {
        if (!transactions) return [];
        return [...transactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [transactions]);

    const categoryMap = useMemo(() => categories?.reduce((acc, cat) => ({ ...acc, [cat.id!]: cat.name }), {} as {[id: number]: string}) ?? {}, [categories]);
    const accountMap = useMemo(() => accounts?.reduce((acc, acc2) => ({ ...acc, [acc2.id!]: acc2.name }), {} as {[id: number]: string}) ?? {}, [accounts]);

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
                <h3 className="font-semibold text-sm text-accent mb-2">💡 AI Summary</h3>
                <p className="text-text-secondary">{overviewData.aiSummary}</p>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income vs Expenses Chart */}
                <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                    <h3 className="text-lg font-semibold mb-4 text-text-primary">Income vs Expenses</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={overviewData.incomeVsExpense}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(224, 242, 241, 0.1)" />
                            <XAxis dataKey="date" stroke="#B2DFDB" fontSize={12} />
                            <YAxis stroke="#B2DFDB" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A2E35', border: '1px solid #2D4A53' }} />
                            <Legend />
                            <Bar dataKey="Income" fill="#10B981" />
                            <Bar dataKey="Expenses" fill="#EF4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Breakdown Pie Chart */}
                <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                    <h3 className="text-lg font-semibold mb-4 text-text-primary">Expenses by Category</h3>
                    {overviewData.categoryBreakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={overviewData.categoryBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {overviewData.categoryBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1A2E35', border: '1px solid #2D4A53' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-text-muted">
                            No expense data available
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                <h3 className="text-lg font-semibold mb-4 text-text-primary">Recent Transactions</h3>
                {recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                        {recentTransactions.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between p-3 bg-primary rounded-lg hover:bg-tertiary/40 transition-colors">
                                <div className="flex-1">
                                    <p className="font-medium text-text-primary">{tx.description}</p>
                                    <p className="text-sm text-text-muted">
                                        {accountMap[tx.accountId] || 'Unknown'} • {categoryMap[tx.categoryId] || 'Uncategorized'} • {new Date(tx.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <p className={`font-bold text-lg ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-text-muted text-center py-8">No transactions yet</p>
                )}
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
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterAccount, setFilterAccount] = useState('all');
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const categoryMap = useMemo(() => categories?.reduce((acc, cat) => ({ ...acc, [cat.id!]: cat }), {} as { [id: number]: Category }) ?? {}, [categories]);
    const accountMap = useMemo(() => accounts?.reduce((acc, accnt) => ({ ...acc, [accnt.id!]: accnt }), {} as { [id: number]: Account }) ?? {}, [accounts]);

    const filteredAndSortedTransactions = useMemo(() => {
        let filtered = transactions ?? [];

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.description?.toLowerCase().includes(query) ||
                categoryMap[t.categoryId]?.name?.toLowerCase().includes(query) ||
                accountMap[t.accountId]?.name?.toLowerCase().includes(query)
            );
        }

        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(t => t.type === filterType);
        }

        // Apply category filter
        if (filterCategory !== 'all') {
            filtered = filtered.filter(t => t.categoryId === parseInt(filterCategory));
        }

        // Apply account filter
        if (filterAccount !== 'all') {
            filtered = filtered.filter(t => t.accountId === parseInt(filterAccount));
        }

        // Apply sorting
        filtered = [...filtered].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                    break;
                case 'amount':
                    comparison = a.amount - b.amount;
                    break;
                case 'description':
                    comparison = (a.description || '').localeCompare(b.description || '');
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [transactions, searchQuery, filterType, filterCategory, filterAccount, sortBy, sortOrder, categoryMap, accountMap]);

    const handleDelete = async (tx: Transaction) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Transaction',
            message: `Delete transaction "${tx.description}"? This action cannot be undone.`,
            icon: '💸',
            onConfirm: async () => {
                // Revert transaction effect
                if (tx.accountId != null && typeof tx.amount === 'number' && isFinite(tx.amount)) {
                    const amountToRevert = tx.type === 'income' ? -tx.amount : tx.amount;
                    const account = accounts?.find(a => a.id === tx.accountId);
                    if (account && typeof account.balance === 'number' && isFinite(account.balance)) {
                        await accountsService.update(account.id!, { balance: account.balance + amountToRevert });
                    }
                }
                await transactionsService.delete(tx.id!);
                setConfirmModal(null);
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-secondary p-4 rounded-xl border border-tertiary">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                        className="bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                        <option value="all">All Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                        <option value="all">All Categories</option>
                        {categories?.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    {/* Account Filter */}
                    <select
                        value={filterAccount}
                        onChange={(e) => setFilterAccount(e.target.value)}
                        className="bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                        <option value="all">All Accounts</option>
                        {accounts?.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>

                {/* Sort Controls */}
                <div className="flex gap-2 mt-4">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'description')}
                        className="bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                    >
                        <option value="date">Sort by Date</option>
                        <option value="amount">Sort by Amount</option>
                        <option value="description">Sort by Description</option>
                    </select>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="bg-primary border border-tertiary rounded-lg py-2 px-3 hover:bg-tertiary/40 transition-colors"
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        <span className="material-symbols-outlined text-sm">
                            {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-secondary p-2 md:p-6 rounded-xl border border-tertiary">
                <h2 className="text-xl font-semibold mb-4 px-4 md:px-0">
                    Transactions ({filteredAndSortedTransactions.length})
                </h2>
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
                            {filteredAndSortedTransactions.map(t => (
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
                {filteredAndSortedTransactions.length === 0 && <p className="text-text-muted p-4 text-center">No transactions found.</p>}
            </div>
        </div>
    );
};

const AccountsTab: React.FC<{
    accounts?: Account[],
    transactions?: Transaction[],
    onEdit: (acc: Account) => void,
    setConfirmModal: (modal: { isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null) => void,
    setAlertModal: (modal: { isOpen: boolean; title: string; message: string; icon?: string } | null) => void,
    onAddAccount: () => void
}> = ({ accounts, transactions, onEdit, setConfirmModal, setAlertModal, onAddAccount }) => {
    const handleDelete = async (account: Account) => {
        const txCount = (transactions?.filter(t => t.accountId === account.id!) || []).length;
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
                await accountsService.delete(account.id!);
                setConfirmModal(null);
            }
        });
    };

     return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-primary">Your Accounts</h2>
                <button
                    onClick={onAddAccount}
                    className="bg-tertiary hover:bg-tertiary/80 text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Account
                </button>
            </div>
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
        </div>
    );
};

const BudgetsTab: React.FC<{ budgets?: Budget[], transactions?: Transaction[], categories?: Category[], onEdit: (budget: Budget) => void, onAddBudget: () => void }> = ({ budgets, transactions, categories, onEdit, onAddBudget }) => {
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
            await budgetsService.delete(budgetId);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-primary">Monthly Budgets</h2>
                <button
                    onClick={onAddBudget}
                    className="bg-tertiary hover:bg-tertiary/80 text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Budget
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {budgetData.map(b => <BudgetCard key={b.id} budget={b} onEdit={() => onEdit(b)} onDelete={() => handleDelete(b.id!)} />)}
                {(!budgets || budgets.length === 0) && <div className="bg-secondary p-6 rounded-xl border border-tertiary md:col-span-full"><p className="text-text-muted">No budgets set up yet. Click 'Add Budget' to create one.</p></div>}
            </div>
        </div>
    );
};

const BudgetCard: React.FC<{ budget: any, onEdit: () => void, onDelete: () => void }> = ({ budget, onEdit, onDelete }) => {
    const getProgressColor = () => {
        if (budget.percentage > 100) return 'bg-gradient-to-r from-red-500 to-red-600';
        if (budget.percentage > 95) return 'bg-gradient-to-r from-red-400 to-red-500';
        if (budget.percentage > 75) return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
        return 'bg-gradient-to-r from-accent to-accent/80';
    };

    const getAlertIcon = () => {
        if (budget.percentage > 100) return { icon: '🚨', text: 'Budget Exceeded!', color: 'text-red-500' };
        if (budget.percentage > 95) return { icon: '⚠️', text: 'Almost Over Budget', color: 'text-red-400' };
        if (budget.percentage > 75) return { icon: '⚡', text: 'High Spending', color: 'text-yellow-400' };
        return null;
    };

    const alert = getAlertIcon();

    return (
        <div className="bg-secondary p-5 rounded-xl border border-tertiary group hover:shadow-lg transition-all">
            {alert && (
                <div className={`flex items-center gap-2 mb-3 p-2 bg-tertiary/50 rounded-lg ${alert.color}`}>
                    <span>{alert.icon}</span>
                    <span className="text-sm font-semibold">{alert.text}</span>
                </div>
            )}
            <div className="flex items-start justify-between">
                <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl flex items-center justify-center mr-4">
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
            <div className="w-full bg-tertiary rounded-full h-3 overflow-hidden">
                <div className={`${getProgressColor()} h-3 rounded-full transition-all duration-500`} style={{ width: `${Math.min(budget.percentage, 100)}%` }}></div>
            </div>
            <div className="flex justify-between mt-3 text-sm">
                <span className="text-text-muted font-medium">{budget.percentage.toFixed(1)}% Used</span>
                <span className={`font-bold ${budget.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {budget.remaining >= 0 ? '✓ ' : '✗ '}
                    {formatCurrency(Math.abs(budget.remaining))} {budget.remaining >= 0 ? 'Left' : 'Over'}
                </span>
            </div>
        </div>
    );
};

const GoalsTab: React.FC<{ goals?: SavingsGoal[], onEdit: (goal: SavingsGoal) => void, onAddFunds: (goal: SavingsGoal) => void, onAddGoal: () => void }> = ({ goals, onEdit, onAddFunds, onAddGoal }) => {
    const handleDelete = async (goalId: number) => {
        if (window.confirm("Are you sure you want to delete this savings goal?")) {
            await savingsGoalsService.delete(goalId);
        }
    };

    const getDaysRemaining = (deadline?: Date) => {
        if (!deadline) return null;
        const now = new Date();
        const end = new Date(deadline);
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-primary">Savings Goals</h2>
                <button
                    onClick={onAddGoal}
                    className="bg-tertiary hover:bg-tertiary/80 text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Goal
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals?.map(goal => {
                const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                const daysRemaining = getDaysRemaining(goal.deadline);
                const isCompleted = percentage >= 100;
                const isUrgent = daysRemaining !== null && daysRemaining <= 30 && !isCompleted;

                return (
                    <div key={goal.id} className="bg-secondary p-6 rounded-xl border border-tertiary group hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h3 className="font-bold text-xl text-text-primary mb-1">{goal.name}</h3>
                                {goal.deadline && (
                                    <div className={`flex items-center gap-1 text-sm ${isUrgent ? 'text-yellow-400' : 'text-text-muted'}`}>
                                        <span className="material-symbols-outlined text-sm">schedule</span>
                                        {daysRemaining !== null && daysRemaining > 0 ? (
                                            <span>{daysRemaining} days remaining</span>
                                        ) : daysRemaining === 0 ? (
                                            <span className="text-red-400">Due today!</span>
                                        ) : (
                                            <span className="text-red-400">Overdue by {Math.abs(daysRemaining!)} days</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {isCompleted && <span className="text-2xl">🎉</span>}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onEdit(goal)} title="Edit" className="p-1 text-text-muted hover:text-accent"><span className="material-symbols-outlined text-base">edit</span></button>
                                    <button onClick={() => handleDelete(goal.id!)} title="Delete" className="p-1 text-text-muted hover:text-red-500"><span className="material-symbols-outlined text-base">delete</span></button>
                                </div>
                            </div>
                        </div>

                        {/* Circular Progress */}
                        <div className="flex items-center justify-center mb-4">
                            <div className="relative w-32 h-32">
                                <svg className="transform -rotate-90 w-32 h-32">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        className="text-tertiary"
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={`${2 * Math.PI * 56}`}
                                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - Math.min(percentage, 100) / 100)}`}
                                        className={`${isCompleted ? 'text-green-400' : 'text-accent'} transition-all duration-500`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-text-primary">{percentage.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-tertiary rounded-full h-2 mb-4 overflow-hidden">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ${isCompleted ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-accent to-accent/80'}`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                        </div>

                        {/* Amount Info */}
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-sm text-text-muted">Current</p>
                                <p className="text-lg font-bold text-text-primary">{formatCurrency(goal.currentAmount)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-text-muted">Target</p>
                                <p className="text-lg font-bold text-accent">{formatCurrency(goal.targetAmount)}</p>
                            </div>
                        </div>

                        {/* Remaining Amount */}
                        {!isCompleted && (
                            <div className="bg-tertiary/50 rounded-lg p-3 mb-4">
                                <p className="text-sm text-text-muted">Still needed</p>
                                <p className="text-xl font-bold text-text-primary">{formatCurrency(goal.targetAmount - goal.currentAmount)}</p>
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            onClick={() => onAddFunds(goal)}
                            className={`w-full font-bold py-3 px-4 rounded-lg transition-all ${
                                isCompleted
                                    ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                                    : 'bg-accent hover:bg-accent-hover text-white'
                            }`}
                        >
                            {isCompleted ? '✓ Goal Completed' : '+ Add Funds'}
                        </button>
                    </div>
                );
            })}
            {(!goals || goals.length === 0) && <div className="bg-secondary p-6 rounded-xl border border-tertiary md:col-span-2"><p className="text-text-muted text-center">No goals set yet. Click 'Add Goal' to create one.</p></div>}
            </div>
        </div>
    );
};

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

        // Handle transaction with account balance update
        if (transactionToEdit) {
            // Revert old transaction effect
            const oldTx = transactionToEdit;
            if(oldTx) {
                const revertAmount = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
                const account = accounts?.find(a => a.id === oldTx.accountId);
                if (account) {
                    await accountsService.update(account.id!, { balance: account.balance + revertAmount });
                }
            }

            // Update transaction
            await transactionsService.update(transactionToEdit.id!, transactionData);

            // Apply new transaction effect (might be on a new account)
            const applyAmount = transactionData.type === 'income' ? transactionData.amount : -transactionData.amount;
            const newAccount = accounts?.find(a => a.id === transactionData.accountId);
            if (newAccount) {
                await accountsService.update(newAccount.id!, { balance: newAccount.balance + applyAmount });
            }
        } else {
            // Add new transaction
            await transactionsService.create(transactionData);
            // Apply transaction effect
            const applyAmount = transactionData.type === 'income' ? transactionData.amount : -transactionData.amount;
            const account = accounts?.find(a => a.id === transactionData.accountId);
            if (account) {
                await accountsService.update(account.id!, { balance: account.balance + applyAmount });
            }
        }
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
            await accountsService.update(accountToEdit.id!, accountData);
        } else {
            await accountsService.create(accountData);
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
            await budgetsService.update(budgetToEdit.id!, budgetData);
        } else {
            await budgetsService.create(budgetData);
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
            await savingsGoalsService.update(goalToEdit.id!, goalData);
        } else {
            await savingsGoalsService.create(goalData);
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
        
        // Add transaction and update account and goal
        await transactionsService.create(transactionData);

        const account = accounts?.find(a => a.id === +accountId);
        if (account) {
            await accountsService.update(account.id!, { balance: account.balance - transactionData.amount });
        }

        await savingsGoalsService.update(goal.id!, { currentAmount: (goal.currentAmount || 0) + transactionData.amount });
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

const ManageCategoriesModal: React.FC<{ closeModal: () => void; transactions?: Transaction[] }> = ({ closeModal, transactions }) => {
    const categories = useSupabaseQuery<Category>('categories');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        await categoriesService.create({ name: newCategoryName.trim(), type: newCategoryType, icon: 'category' });
        setNewCategoryName('');
    };

    const handleDeleteCategory = async (id: number) => {
        const txs = transactions?.filter(t => t.categoryId === id) || [];
        if (txs.length > 0) {
            alert("Cannot delete category with associated transactions.");
            return;
        }
        if (window.confirm("Delete this category?")) {
            await categoriesService.delete(id);
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