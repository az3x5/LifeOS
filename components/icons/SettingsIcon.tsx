
import React from 'react';

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <span className={`material-symbols-outlined ${className || ''}`}>
        settings
    </span>
);

export default SettingsIcon;