
import React from 'react';

const FinanceIcon: React.FC<{ className?: string }> = ({ className }) => (
    <span className={`material-symbols-outlined ${className || ''}`}>
        account_balance_wallet
    </span>
);

export default FinanceIcon;