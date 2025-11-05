import React from 'react';

const NotificationsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <span className={`material-symbols-outlined ${className || ''}`}>
        notifications
    </span>
);

export default NotificationsIcon;