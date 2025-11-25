
import React from 'react';

const HealthIcon: React.FC<{ className?: string }> = ({ className }) => (
    <span className={`material-symbols-outlined ${className || ''}`}>
        favorite
    </span>
);

export default HealthIcon;