
import React from 'react';

const ActivityIcon: React.FC<{ className?: string }> = ({ className }) => (
    <span className={`material-symbols-outlined ${className || ''}`}>
        history
    </span>
);

export default ActivityIcon;