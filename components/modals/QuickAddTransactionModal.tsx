import React, { useState, useMemo } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { Category, Account, Transaction } from '../../types';
import { transactionsService, accountsService } from '../../services/dataService';

interface QuickAddTransactionModalProps {
    closeModal: () => void;
}

const formatCurrency = (value: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);

const QuickAddTransactionModal: React.FC<QuickAddTransactionModalProps> = ({ closeModal }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    
    const allCategories = useSupabaseQuery<Category>('categories');
    const categories = React.useMemo(() => (allCategories ?? []).filter(c => c.type === 'expense'), [allCategories]);
    const accounts = useSupabaseQuery<Account>('accounts');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            alert("Please enter a valid, positive amount.");
            return;
        }

        if (!description || !categoryId || !accountId) {
            alert('Please fill out all fields.');
            return;
        }

        const selectedAccount = accounts?.find(a => a.id === parseInt(accountId));
        if (!selectedAccount) {
            alert('Selected account not found.');
            return;
        }

        const transactionData = {
            description,
            amount: numericAmount,
            categoryId: parseInt(categoryId),
            type: 'expense' as const,
            date: new Date(),
            accountId: parseInt(accountId),
            currency: selectedAccount.currency,
        };

        // Add transaction
        await transactionsService.create(transactionData as Transaction);

        // Decrease account balance for expense
        if (selectedAccount.balance !== undefined) {
            await accountsService.update(parseInt(accountId), {
                balance: selectedAccount.balance - transactionData.amount
            });
        }

        closeModal();
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6">Add Expense</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Amount</label>
                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Account</label>
                        <select value={accountId} onChange={e => setAccountId(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required>
                            <option value="">Select an account</option>
                            {accounts?.map(acc => <option key={acc.id} value={acc.id?.toString()}>{acc.name} ({formatCurrency(acc.balance, acc.currency)})</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                        <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required>
                            <option value="">Select a category</option>
                            {categories?.map(cat => <option key={cat.id} value={cat.id?.toString()}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={closeModal} className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuickAddTransactionModal;