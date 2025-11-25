import React from 'react';

const IslamicIcon: React.FC<{ className?: string }> = ({ className }) => (
    <span className={`material-symbols-outlined ${className || ''}`}>
        mode_night
    </span>
);

export default IslamicIcon;
