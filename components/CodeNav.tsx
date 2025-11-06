import React, { useState } from 'react';
import { Module } from '../types';
import DashboardIcon from './icons/DashboardIcon';
import FinanceIcon from './icons/FinanceIcon';
import HabitIcon from './icons/HabitIcon';
import HealthIcon from './icons/HealthIcon';
import IslamicIcon from './icons/IslamicIcon';
import NotesIcon from './icons/NotesIcon';
import RemindersIcon from './icons/RemindersIcon';
import SettingsIcon from './icons/SettingsIcon';

interface CodeNavProps {
    activeModule: Module;
    setActiveModule: (module: Module) => void;
}

interface NavItemConfig {
    module: Module;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    subItems?: { label: string; module: Module }[];
}

const navItems: NavItemConfig[] = [
    { module: Module.DASHBOARD, icon: DashboardIcon, label: 'Dashboard' },
    { module: Module.NOTES, icon: NotesIcon, label: 'Notes' },
    { module: Module.REMINDERS, icon: RemindersIcon, label: 'Reminders' },
    { module: Module.HABITS, icon: HabitIcon, label: 'Habits' },
    { module: Module.HEALTH, icon: HealthIcon, label: 'Health' },
    { module: Module.FINANCE, icon: FinanceIcon, label: 'Finance' },
    { module: Module.ISLAMIC, icon: IslamicIcon, label: 'Islamic' },
    { module: Module.SETTINGS, icon: SettingsIcon, label: 'Settings' },
];

const CodeNav: React.FC<CodeNavProps> = ({ activeModule, setActiveModule }) => {
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const toggleExpand = (label: string) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(label)) {
            newExpanded.delete(label);
        } else {
            newExpanded.add(label);
        }
        setExpandedItems(newExpanded);
    };

    const handleNavClick = (module: Module) => {
        setActiveModule(module);
    };

    return (
        <nav className="w-full bg-secondary">
            {/* Desktop Vertical Layout */}
            <div className="hidden md:block p-4 space-y-2">
                {/* Logo Section */}
                <div className="flex items-center space-x-3 mb-6 px-2">
                    <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-xl font-bold text-white">L</span>
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-accent to-purple bg-clip-text text-transparent">LifeOS</h1>
                </div>

                {/* Navigation Items */}
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.module;
                    const isExpanded = expandedItems.has(item.label);
                    const hasSubItems = item.subItems && item.subItems.length > 0;

                    return (
                        <div key={item.module}>
                            <button
                                onClick={() => {
                                    if (hasSubItems) {
                                        toggleExpand(item.label);
                                    } else {
                                        handleNavClick(item.module);
                                    }
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                                    isActive
                                        ? 'bg-accent text-white shadow-md'
                                        : 'text-text-secondary hover:bg-tertiary hover:text-text-primary'
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <Icon className="text-xl" />
                                    <span className="font-medium">{item.label}</span>
                                </div>
                                {hasSubItems && (
                                    <span
                                        className={`material-symbols-outlined text-lg transition-transform duration-200 ${
                                            isExpanded ? 'rotate-180' : ''
                                        }`}
                                    >
                                        expand_more
                                    </span>
                                )}
                            </button>

                            {/* Sub Items */}
                            {hasSubItems && isExpanded && (
                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-tertiary">
                                    {item.subItems!.map((subItem) => (
                                        <button
                                            key={subItem.module}
                                            onClick={() => handleNavClick(subItem.module)}
                                            className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                                                activeModule === subItem.module
                                                    ? 'bg-accent text-white'
                                                    : 'text-text-secondary hover:bg-tertiary hover:text-text-primary'
                                            }`}
                                        >
                                            {subItem.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mobile Horizontal Layout */}
            <div className="md:hidden flex justify-around items-center p-2 overflow-x-auto gap-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.module;

                    return (
                        <button
                            key={item.module}
                            onClick={() => handleNavClick(item.module)}
                            className={`flex flex-col items-center justify-center space-y-0.5 transition-all duration-200 px-2 py-1 rounded-lg flex-shrink-0 min-w-fit ${
                                isActive
                                    ? 'bg-accent text-white'
                                    : 'text-text-secondary hover:bg-tertiary hover:text-text-primary'
                            }`}
                            title={item.label}
                        >
                            <Icon className="text-xl" />
                            <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default CodeNav;

