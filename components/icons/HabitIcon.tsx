
import React from 'react';

const HabitIcon: React.FC<{ className?: string }> = ({ className }) => (
    <span className={`material-symbols-outlined ${className || ''}`}>
        task_alt
    </span>
);

export default HabitIcon;