
import React from 'react';

const NotesIcon: React.FC<{ className?: string }> = ({ className }) => (
     <span className={`material-symbols-outlined ${className || ''}`}>
        description
    </span>
);

export default NotesIcon;