
import React from 'react';

const DashboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <span className={`material-symbols-outlined ${className || ''}`}>
        dashboard
    </span>
);

export default DashboardIcon;