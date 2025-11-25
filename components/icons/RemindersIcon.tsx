import React from 'react';

const RemindersIcon: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <span className={`material-symbols-outlined ${className}`}>
            notifications_active
        </span>
    );
};

export default RemindersIcon;

