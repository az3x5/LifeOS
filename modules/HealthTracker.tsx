import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { HealthMetric, HealthLog, HealthGoal } from '../types';
import { healthMetricsService, healthLogsService, healthGoalsService } from '../services/dataService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

// --- ICONS ---
const SearchIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>search</span>;
const FilterIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>filter_list</span>;
const SortIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>sort</span>;
const GridIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>grid_view</span>;
const ListIcon = ({ className }: { className?: string }) => <span className={`material-symbols-outlined ${className ?? ''}`}>view_list</span>;

// --- SHARED COMPONENTS ---
const FormInput: React.FC<{ label: string; [key: string]: any }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
        <input {...props} className="w-full bg-primary border border-tertiary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary" />
    </div>
);
const FormSelect: React.FC<{ label: string; children: React.ReactNode; [key: string]: any }> = ({ label, children, ...props }) => (
     <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
        <select {...props} className="w-full bg-primary border border-tertiary rounded-lg py-3 px-3 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary appearance-none">
            {children}
        </select>
    </div>
);
const UndoSnackbar: React.FC<{ message: string, onUndo: () => void, onDismiss: () => void }> = ({ message, onUndo, onDismiss }) => {
    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-secondary border border-tertiary rounded-xl shadow-lg p-4 flex items-center justify-between gap-4 w-11/12 max-w-md z-50 animate-fade-in-up">
            <p className="text-text-primary text-sm">{message}</p>
            <div className="flex items-center gap-2">
                <button onClick={onUndo} className="font-bold text-accent hover:underline text-sm">Undo</button>
                <button onClick={onDismiss} className="text-text-muted hover:text-text-primary">&times;</button>
            </div>
        </div>
    );
}
const Toggle: React.FC<{ enabled: boolean; setEnabled?: (enabled: boolean) => void, onClick?: () => void, disabled?: boolean, title?: string }> = ({ enabled, setEnabled, onClick, disabled = false, title }) => (
    <button
        onClick={() => {
            if(disabled) return;
            if(onClick) onClick();
            else if(setEnabled) setEnabled(!enabled);
        }}
        disabled={disabled}
        title={title}
        className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-accent ${enabled ? 'bg-accent' : 'bg-tertiary'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <span
            className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
        />
    </button>
);

const TABS = ['Dashboard', 'Logs', 'Goals', 'Reminders'];

// --- MAIN COMPONENT ---
const HealthTracker: React.FC = () => {
    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [isAddLogModalOpen, setIsAddLogModalOpen] = useState(false);
    const [isAddMetricModalOpen, setIsAddMetricModalOpen] = useState(false);
    const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

    const [editingLog, setEditingLog] = useState<HealthLog | null>(null);
    const [editingMetric, setEditingMetric] = useState<HealthMetric | null>(null);
    const [editingGoal, setEditingGoal] = useState<HealthGoal | null>(null);

    const [selectedGoal, setSelectedGoal] = useState<HealthGoal | null>(null);
    const [selectedMetricForReminder, setSelectedMetricForReminder] = useState<HealthMetric | null>(null);

    const [undoAction, setUndoAction] = useState<{ onUndo: () => void } | null>(null);
    const undoTimeoutRef = useRef<number | null>(null);

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; icon?: string } | null>(null);
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; icon?: string } | null>(null);

    const metrics = useSupabaseQuery<HealthMetric>('health_metrics');
    const logs = useSupabaseQuery<HealthLog>('health_logs');
    const goals = useSupabaseQuery<HealthGoal>('health_goals');

    const handleOpenAddLog = () => { setEditingLog(null); setIsAddLogModalOpen(true); };
    const handleOpenEditLog = (log: HealthLog) => { setEditingLog(log); setIsAddLogModalOpen(true); };
    const handleOpenAddMetric = () => { setEditingMetric(null); setIsAddMetricModalOpen(true); };
    const handleOpenEditMetric = (metric: HealthMetric) => { setEditingMetric(metric); setIsAddMetricModalOpen(true); };
    const handleOpenAddGoal = () => { setEditingGoal(null); setIsAddGoalModalOpen(true); };
    const handleOpenEditGoal = (goal: HealthGoal) => { setEditingGoal(goal); setIsAddGoalModalOpen(true); };

    const handleDeleteLog = async (logId: number) => {
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        const logToDelete = logs?.find(l => l.id === logId);
        if (!logToDelete) return;
        await healthLogsService.delete(logId);
        const undoFunc = async () => { await healthLogsService.create(logToDelete); };
        setUndoAction({ onUndo: undoFunc });
        undoTimeoutRef.current = window.setTimeout(() => setUndoAction(null), 6000);
    };

    const handleDeleteGoal = async (goalId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Goal',
            message: "Are you sure you want to delete this goal?",
            icon: '🎯',
            onConfirm: async () => {
                await healthGoalsService.delete(goalId);
                setConfirmModal(null);
            }
        });
    };

    const handleSetReminder = (metric: HealthMetric) => {
        setSelectedMetricForReminder(metric);
        setIsReminderModalOpen(true);
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Dashboard': return <DashboardTab allMetrics={metrics} logs={logs} onEditMetric={handleOpenEditMetric} />;
            case 'Logs': return <LogsTab logs={logs} metrics={metrics} onEdit={handleOpenEditLog} onDelete={handleDeleteLog} />;
            case 'Goals': return <GoalsTab goals={goals} metrics={metrics} logs={logs} onSelectGoal={setSelectedGoal} onEditGoal={handleOpenEditGoal} onDeleteGoal={handleDeleteGoal} onAddGoal={handleOpenAddGoal} />;
            case 'Reminders': return <RemindersTab metrics={metrics} onSetReminder={handleSetReminder} />;
            default: return null;
        }
    };
    
    return (
        <div className="space-y-8 animate-fade-in relative">
            {undoAction && <UndoSnackbar message="Log deleted." onUndo={() => { undoAction.onUndo(); setUndoAction(null); }} onDismiss={() => setUndoAction(null)} />}
            
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <h1 className="text-4xl font-bold text-text-primary">Health Tracker</h1>
                <button
                    onClick={handleOpenAddLog}
                    className="bg-accent hover:bg-accent-hover text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all transform hover:scale-105 flex items-center gap-2 justify-center"
                >
                    <span className="material-symbols-outlined">add</span>
                    Log Health Data
                </button>
            </div>

            <div className="bg-secondary border border-tertiary rounded-2xl p-2">
                <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${
                                activeTab === tab
                                    ? 'bg-accent text-white shadow-md'
                                    : 'bg-transparent text-text-secondary hover:bg-tertiary hover:text-text-primary'
                            } whitespace-nowrap py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex-shrink-0`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-6">
                {renderTabContent()}
            </div>
            
            {(isAddLogModalOpen || editingLog) && <AddLogModal closeModal={() => { setIsAddLogModalOpen(false); setEditingLog(null); }} metrics={metrics} logToEdit={editingLog} />}
            {(isAddMetricModalOpen || editingMetric) && <AddMetricModal closeModal={() => { setIsAddMetricModalOpen(false); setEditingMetric(null); }} metricToEdit={editingMetric} />}
            {(isAddGoalModalOpen || editingGoal) && <AddGoalModal closeModal={() => { setIsAddGoalModalOpen(false); setEditingGoal(null); }} metrics={metrics} goalToEdit={editingGoal} />}
            {selectedGoal && <GoalDetailModal goal={selectedGoal} metrics={metrics} logs={logs} closeModal={() => setSelectedGoal(null)} />}
            {isReminderModalOpen && selectedMetricForReminder && <SetHealthReminderModal metric={selectedMetricForReminder} closeModal={() => setIsReminderModalOpen(false)} />}

            {confirmModal && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText="Delete"
                    icon={confirmModal.icon || "🗑️"}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
            {alertModal && (
                <AlertModal
                    isOpen={alertModal.isOpen}
                    title={alertModal.title}
                    message={alertModal.message}
                    icon={alertModal.icon || "⚠️"}
                    onClose={() => setAlertModal(null)}
                />
            )}
        </div>
    );
};

// --- METRIC COMPONENTS ---

const MetricCard: React.FC<{ metric: HealthMetric, logs?: HealthLog[], onEdit: () => void }> = ({ metric, logs, onEdit }) => {
    const latestLog = useMemo(() => {
        return logs?.filter(l => l.metricId === metric.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    }, [logs, metric.id]);

    return (
        <div
            onClick={onEdit}
            className="bg-secondary border-2 border-tertiary rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-accent/50"
        >
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {metric.icon && (
                        <div
                            className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                            style={{ backgroundColor: metric.color ? `${metric.color}20` : '#6366F120' }}
                        >
                            {metric.icon}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate text-text-primary">{metric.name}</h3>
                        {metric.category && (
                            <p className="text-xs text-text-secondary mt-1 capitalize">{metric.category}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Type:</span>
                    <span className="text-sm font-medium text-text-primary capitalize">{metric.type}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Unit:</span>
                    <span className="text-sm font-medium text-text-primary">{metric.unit}</span>
                </div>
                {latestLog && (
                    <div className="flex justify-between items-center pt-2 border-t border-tertiary">
                        <span className="text-sm text-text-secondary">Latest:</span>
                        <span className="text-lg font-bold text-accent">{latestLog.value} {metric.unit}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const MetricListItem: React.FC<{ metric: HealthMetric, logs?: HealthLog[], onEdit: () => void }> = ({ metric, logs, onEdit }) => {
    const latestLog = useMemo(() => {
        return logs?.filter(l => l.metricId === metric.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    }, [logs, metric.id]);

    return (
        <div
            onClick={onEdit}
            className="bg-secondary border-2 border-tertiary rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:shadow-md hover:border-accent/50 flex items-center justify-between"
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div
                    className="flex-shrink-0 w-1 h-12 rounded-full"
                    style={{ backgroundColor: metric.color || '#6366F1' }}
                />
                {metric.icon && (
                    <div
                        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: metric.color ? `${metric.color}20` : '#6366F120' }}
                    >
                        {metric.icon}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate text-text-primary">{metric.name}</h3>
                    <p className="text-xs text-text-secondary capitalize">{metric.type} • {metric.unit}</p>
                </div>
            </div>
            {latestLog && (
                <div className="text-right">
                    <p className="text-lg font-bold text-accent">{latestLog.value}</p>
                    <p className="text-xs text-text-secondary">{metric.unit}</p>
                </div>
            )}
        </div>
    );
};

// --- TABS ---

const DashboardTab: React.FC<{
    allMetrics?: HealthMetric[],
    logs?: HealthLog[],
    onEditMetric: (metric: HealthMetric) => void
}> = ({ allMetrics, logs, onEditMetric }) => {

    const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse(), []);

    const summaryData = useMemo(() => {
        if (!allMetrics || !logs) return { totalMetrics: 0, totalLogs: 0, recentActivity: 0, chartData: [] };

        const today = new Date().toISOString().split('T')[0];
        const recentActivity = logs.filter(l => new Date(l.date).toISOString().split('T')[0] === today).length;

        // Get most tracked metrics for chart
        const metricLogCounts = logs.reduce((acc, log) => {
            acc[log.metricId] = (acc[log.metricId] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        const topMetrics = Object.entries(metricLogCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([id]) => Number(id));

        const chartData = last7Days.map(dateStr => {
            const dayLogs = logs.filter(l => new Date(l.date).toISOString().startsWith(dateStr));
            const result: any = {
                date: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
            };
            topMetrics.forEach(metricId => {
                const metric = allMetrics.find(m => m.id === metricId);
                if (metric) {
                    result[metric.name] = dayLogs.find(l => l.metricId === metricId)?.value || null;
                }
            });
            return result;
        });

        return {
            totalMetrics: allMetrics.length,
            totalLogs: logs.length,
            recentActivity,
            chartData
        };
    }, [allMetrics, logs, last7Days]);

    const recentLogs = useMemo(() => logs?.slice(0, 5) ?? [], [logs]);
    const metricMap = useMemo(() => allMetrics?.reduce((acc, metric) => { acc[metric.id!] = metric; return acc; }, {} as Record<number, HealthMetric>) ?? {}, [allMetrics]);

    return (
        <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                    <h3 className="text-base text-text-secondary">Total Metrics</h3>
                    <p className="text-3xl font-bold text-text-primary">{summaryData.totalMetrics}</p>
                </div>
                <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                    <h3 className="text-base text-text-secondary">Total Logs</h3>
                    <p className="text-3xl font-bold text-text-primary">{summaryData.totalLogs}</p>
                </div>
                <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                    <h3 className="text-base text-text-secondary">Today's Activity</h3>
                    <p className="text-3xl font-bold text-text-primary">{summaryData.recentActivity}</p>
                </div>
            </div>

            {/* Chart and Recent Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-secondary p-6 rounded-xl border border-tertiary h-[400px]">
                    <h2 className="text-xl font-semibold mb-4 text-text-primary">Last 7 Days Trend</h2>
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={summaryData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(224, 242, 241, 0.1)" />
                            <XAxis dataKey="date" stroke="#B2DFDB" fontSize={12} />
                            <YAxis stroke="#B2DFDB" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A2E35', border: '1px solid #2D4A53' }} />
                            <Legend />
                            {summaryData.chartData.length > 0 && Object.keys(summaryData.chartData[0]).filter(k => k !== 'date').map((key, idx) => (
                                <Line key={key} type="monotone" dataKey={key} stroke={['#8884d8', '#82ca9d', '#ffc658'][idx % 3]} connectNulls />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-6">
                    <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                        <h3 className="font-semibold text-sm text-accent">💡 AI Insight</h3>
                        <p className="text-text-secondary mt-2 text-sm">Track your health metrics consistently to identify patterns and improve your well-being.</p>
                    </div>
                    <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                        <h2 className="text-xl font-semibold mb-4 text-text-primary">Recent Entries</h2>
                        <ul className="space-y-3">
                            {recentLogs.length > 0 ? recentLogs.map(log => (
                                <li key={log.id} className="flex justify-between p-3 bg-primary rounded-lg">
                                    <span className="font-medium text-text-primary">{metricMap[log.metricId]?.name || '...'}</span>
                                    <span className="text-text-secondary">{log.value} {metricMap[log.metricId]?.unit}</span>
                                </li>
                            )) : (
                                <p className="text-text-muted text-sm text-center py-4">No recent logs</p>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Metrics Display */}
            <div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">Your Metrics</h2>
                {allMetrics && allMetrics.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allMetrics.map(metric => (
                            <MetricCard key={metric.id} metric={metric} logs={logs} onEdit={() => onEditMetric(metric)} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-secondary rounded-xl border border-tertiary">
                        <p className="text-text-muted text-lg">No metrics yet</p>
                        <p className="text-text-secondary text-sm mt-2">Create your first health metric to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const LogsTab: React.FC<{ logs?: HealthLog[], metrics?: HealthMetric[], onEdit: (log: HealthLog) => void, onDelete: (logId: number) => void }> = ({ logs, metrics, onEdit, onDelete }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMetric, setFilterMetric] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [filterDate, setFilterDate] = useState({ start: '', end: '' });
    const [sortBy, setSortBy] = useState<'date' | 'metric' | 'value'>('date');

    const metricMap = useMemo(() => metrics?.reduce((acc, metric) => { acc[metric.id!] = metric; return acc; }, {} as Record<number, HealthMetric>) ?? {}, [metrics]);

    const filteredLogs = useMemo(() => {
        let filtered = logs?.filter(log => {
            // Search filter
            if (searchQuery) {
                const metric = metricMap[log.metricId];
                const searchLower = searchQuery.toLowerCase();
                const matchesMetric = metric?.name.toLowerCase().includes(searchLower);
                const matchesNotes = log.notes?.toLowerCase().includes(searchLower);
                const matchesTags = log.tags?.some(t => t.toLowerCase().includes(searchLower));
                if (!matchesMetric && !matchesNotes && !matchesTags) return false;
            }

            // Metric filter
            if (filterMetric && log.metricId !== Number(filterMetric)) return false;

            // Tag filter
            if (filterTag && !log.tags?.join(', ').toLowerCase().includes(filterTag.toLowerCase())) return false;

            // Date range filter
            if (filterDate.start && new Date(log.date) < new Date(filterDate.start)) return false;
            if (filterDate.end && new Date(log.date) > new Date(filterDate.end)) return false;

            return true;
        }) ?? [];

        // Sort
        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                case 'metric':
                    return (metricMap[a.metricId]?.name || '').localeCompare(metricMap[b.metricId]?.name || '');
                case 'value':
                    return b.value - a.value;
                default:
                    return 0;
            }
        });

        return filtered;
    }, [logs, searchQuery, filterMetric, filterTag, filterDate, sortBy, metricMap]);

    const clearFilters = () => {
        setSearchQuery('');
        setFilterMetric('');
        setFilterTag('');
        setFilterDate({ start: '', end: '' });
    };

    const hasActiveFilters = searchQuery || filterMetric || filterTag || filterDate.start || filterDate.end;

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary">📋 Health Logs</h3>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-sm text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                        type="text"
                        placeholder="Search logs by metric, notes, or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-primary border border-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <select
                        value={filterMetric}
                        onChange={(e) => setFilterMetric(e.target.value)}
                        className="bg-primary border border-tertiary rounded-lg py-2.5 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    >
                        <option value="">All Metrics</option>
                        {metrics?.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.icon} {m.name}
                            </option>
                        ))}
                    </select>

                    <input
                        type="text"
                        value={filterTag}
                        onChange={(e) => setFilterTag(e.target.value)}
                        placeholder="Filter by tag..."
                        className="bg-primary border border-tertiary rounded-lg py-2.5 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    />

                    <input
                        type="date"
                        value={filterDate.start}
                        onChange={(e) => setFilterDate(p => ({...p, start: e.target.value}))}
                        placeholder="Start date"
                        className="bg-primary border border-tertiary rounded-lg py-2.5 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    />

                    <input
                        type="date"
                        value={filterDate.end}
                        onChange={(e) => setFilterDate(p => ({...p, end: e.target.value}))}
                        placeholder="End date"
                        className="bg-primary border border-tertiary rounded-lg py-2.5 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    />
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2 mt-4">
                    <SortIcon className="text-text-secondary" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'date' | 'metric' | 'value')}
                        className="bg-primary border border-tertiary rounded-lg py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    >
                        <option value="date">Sort by Date</option>
                        <option value="metric">Sort by Metric</option>
                        <option value="value">Sort by Value</option>
                    </select>
                    <span className="text-sm text-text-muted ml-2">
                        {filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'}
                    </span>
                </div>
            </div>

            {/* Logs Display */}
            {filteredLogs.length > 0 ? (
                <>
                    {/* Mobile View */}
                    <div className="md:hidden space-y-3">
                        {filteredLogs.map(log => (
                            <LogCardItem key={log.id} log={log} metric={metricMap[log.metricId]} onEdit={onEdit} onDelete={onDelete} />
                        ))}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block bg-secondary rounded-xl border border-tertiary overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-primary">
                                    <tr className="border-b border-tertiary">
                                        <th className="p-4 font-semibold text-text-primary">Metric</th>
                                        <th className="p-4 font-semibold text-text-primary">Value</th>
                                        <th className="p-4 font-semibold text-text-primary">Date</th>
                                        <th className="p-4 font-semibold text-text-primary">Notes</th>
                                        <th className="p-4 font-semibold text-text-primary">Tags</th>
                                        <th className="p-4 font-semibold text-text-primary">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map(log => (
                                        <LogTableRow key={log.id} log={log} metric={metricMap[log.metricId]} onEdit={onEdit} onDelete={onDelete} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-secondary p-12 rounded-xl border border-tertiary text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold text-text-primary mb-2">
                        {hasActiveFilters ? 'No logs match your filters' : 'No health logs yet'}
                    </h3>
                    <p className="text-text-secondary mb-6">
                        {hasActiveFilters
                            ? 'Try adjusting your search or filters to find what you\'re looking for.'
                            : 'Start tracking your health by logging your first metric.'}
                    </p>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="bg-accent hover:bg-accent-hover text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
const LogCardItem: React.FC<{log: HealthLog, metric?: HealthMetric, onEdit: (log:HealthLog) => void, onDelete: (id: number) => void}> = ({log, metric, onEdit, onDelete}) => (
    <div className="bg-secondary p-5 rounded-xl border border-tertiary hover:border-accent/50 transition-all">
        <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-1">
                {metric?.icon && (
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: metric.color ? `${metric.color}20` : '#6366F120' }}
                    >
                        {metric.icon}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary truncate">{metric?.name}</p>
                    <p className="text-2xl font-bold text-accent">
                        {log.value} <span className="text-base font-normal text-text-secondary">{metric?.unit}</span>
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onEdit(log)}
                    className="p-2 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                    title="Edit log"
                >
                    <span className="material-symbols-outlined text-xl">edit</span>
                </button>
                <button
                    onClick={() => onDelete(log.id!)}
                    className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete log"
                >
                    <span className="material-symbols-outlined text-xl">delete</span>
                </button>
            </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-text-muted mb-3">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            {new Date(log.date).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })}
        </div>

        {log.notes && (
            <p className="text-sm text-text-primary bg-primary p-3 rounded-lg mb-3 border border-tertiary">
                {log.notes}
            </p>
        )}

        {log.tags && log.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
                {log.tags.map(t => (
                    <span key={t} className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full font-medium">
                        #{t}
                    </span>
                ))}
            </div>
        )}
    </div>
);

const LogTableRow: React.FC<{log: HealthLog, metric?: HealthMetric, onEdit: (log:HealthLog) => void, onDelete: (id: number) => void}> = ({log, metric, onEdit, onDelete}) => (
    <tr className="border-b border-tertiary last:border-b-0 hover:bg-primary/50 transition-colors">
        <td className="p-4">
            <div className="flex items-center gap-2">
                {metric?.icon && (
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: metric.color ? `${metric.color}20` : '#6366F120' }}
                    >
                        {metric.icon}
                    </div>
                )}
                <span className="font-medium text-text-primary">{metric?.name}</span>
            </div>
        </td>
        <td className="p-4">
            <span className="font-bold text-accent">{log.value}</span>
            <span className="text-text-secondary ml-1">{metric?.unit}</span>
        </td>
        <td className="p-4 text-text-secondary">
            {new Date(log.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })}
        </td>
        <td className="p-4 max-w-xs">
            <span className="text-text-primary truncate block" title={log.notes}>
                {log.notes || <span className="text-text-muted italic">No notes</span>}
            </span>
        </td>
        <td className="p-4">
            {log.tags && log.tags.length > 0 ? (
                <div className="flex gap-1 flex-wrap">
                    {log.tags.map(t => (
                        <span key={t} className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                            #{t}
                        </span>
                    ))}
                </div>
            ) : (
                <span className="text-text-muted italic text-sm">No tags</span>
            )}
        </td>
        <td className="p-4">
            <div className="flex gap-2">
                <button
                    onClick={() => onEdit(log)}
                    className="p-1.5 text-text-secondary hover:text-accent hover:bg-accent/10 rounded transition-colors"
                    title="Edit"
                >
                    <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button
                    onClick={() => onDelete(log.id!)}
                    className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete"
                >
                    <span className="material-symbols-outlined text-lg">delete</span>
                </button>
            </div>
        </td>
    </tr>
);

const AnalyticsTab: React.FC<{ metrics?: HealthMetric[], logs?: HealthLog[] }> = ({ metrics, logs }) => {
    const [metric1Id, setMetric1Id] = useState<string>('');
    const [metric2Id, setMetric2Id] = useState<string>('');
    const [timeFilter, setTimeFilter] = useState('30d');
    const [chartType, setChartType] = useState<'line' | 'bar'>('line');

    const filteredLogs = useMemo(() => {
        if (!logs) return [];
        const now = new Date();
        const startDate = new Date();
        if (timeFilter === '7d') startDate.setDate(now.getDate() - 7);
        else if (timeFilter === '30d') startDate.setDate(now.getDate() - 30);
        else if (timeFilter === '90d') startDate.setDate(now.getDate() - 90);
        return logs.filter(log => new Date(log.date) >= startDate);
    }, [logs, timeFilter]);
    
    const chartData = useMemo(() => {
        const dataMap = new Map<string, any>();
        const metric1 = metrics?.find(m => m.id === Number(metric1Id));
        const metric2 = metrics?.find(m => m.id === Number(metric2Id));

        filteredLogs.forEach(log => {
            const date = new Date(log.date).toISOString().split('T')[0];
            if (!dataMap.has(date)) dataMap.set(date, { date });
            const entry = dataMap.get(date);
            if (log.metricId === Number(metric1Id)) entry[metric1!.name] = log.value;
            if (log.metricId === Number(metric2Id)) entry[metric2!.name] = log.value;
        });
        return Array.from(dataMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    }, [filteredLogs, metric1Id, metric2Id, metrics]);

     const weeklyData = useMemo(() => {
        if (!metric1Id) return [];
        const metric1 = metrics?.find(m => m.id === Number(metric1Id));
        const data: Record<string, number[]> = {'Week 1':[], 'Week 2':[], 'Week 3':[], 'Week 4':[]};
        const now = new Date();
        logs?.filter(l => l.metricId === Number(metric1Id)).forEach(log => {
            const weeksAgo = Math.floor((now.getTime() - new Date(log.date).getTime()) / (1000 * 3600 * 24 * 7));
            if (weeksAgo >= 0 && weeksAgo < 4) { // Only consider the last 4 weeks
                 const weekKey = `Week ${4-weeksAgo}`;
                 if (data[weekKey]) data[weekKey].push(log.value);
            }
        });
        return Object.entries(data).map(([name, values]) => ({ name, Average: values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0 }));
    }, [logs, metric1Id, metrics]);

    return (
        <div className="space-y-8">
             <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                <h3 className="text-xl font-semibold mb-4">Analytics & Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <FormSelect value={metric1Id} onChange={e => setMetric1Id(e.target.value)} label="Primary Metric"><option value="">Select Metric</option>{metrics?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</FormSelect>
                    <FormSelect value={timeFilter} onChange={e => setTimeFilter(e.target.value)} label="Time Period"><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="90d">Last 90 Days</option></FormSelect>
                    <div className="flex bg-primary p-1 rounded-lg"><button onClick={()=>setChartType('line')} className={`flex-1 py-1 rounded ${chartType==='line'?'bg-accent':''}`}>Line</button><button onClick={()=>setChartType('bar')} className={`flex-1 py-1 rounded ${chartType==='bar'?'bg-accent':''}`}>Bar</button></div>
                    <div><button className="bg-tertiary text-sm py-2 px-3 rounded-lg w-full" disabled>Export PDF</button></div>
                </div>

                <div className="mt-6 p-4 bg-primary rounded-lg"><p className="text-text-secondary"><strong className="text-accent">AI Insight:</strong> {metric1Id && weeklyData[3]?.Average > weeklyData[2]?.Average ? `Your '${metrics?.find(m=>m.id===Number(metric1Id))?.name}' trend is positive this week!` : `Let's focus on consistency for '${metrics?.find(m=>m.id===Number(metric1Id))?.name}' this week.`}</p></div>
                
                <div className="h-[400px] mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                    { chartType === 'line' ? (
                        <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(224,242,241,0.1)" /><XAxis dataKey="date" stroke="#B2DFDB" fontSize={12} /><YAxis stroke="#B2DFDB" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#1A2E35', border: '1px solid #2D4A53' }} /><Legend />
                            {metric1Id && <Line type="monotone" dataKey={metrics?.find(m=>m.id===Number(metric1Id))?.name} stroke="#00A99D" connectNulls />}
                            {metric2Id && <Line type="monotone" dataKey={metrics?.find(m=>m.id===Number(metric2Id))?.name} stroke="#82ca9d" yAxisId="right" connectNulls />}
                        </LineChart>
                    ) : (
                        <BarChart data={weeklyData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(224,242,241,0.1)" /><XAxis dataKey="name" stroke="#B2DFDB" fontSize={12} /><YAxis stroke="#B2DFDB" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#1A2E35', border: '1px solid #2D4A53' }} /><Legend /><Bar dataKey="Average" fill="#00A99D" /></BarChart>
                    ) }
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                <h3 className="text-xl font-semibold mb-4">Compare Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormSelect value={metric1Id} onChange={e => setMetric1Id(e.target.value)} label=""><option value="">Select Metric 1</option>{metrics?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</FormSelect>
                    <FormSelect value={metric2Id} onChange={e => setMetric2Id(e.target.value)} label=""><option value="">Select Metric 2</option>{metrics?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</FormSelect>
                </div>
            </div>
        </div>
    );
};

const GoalsTab: React.FC<{ goals?: HealthGoal[], metrics?: HealthMetric[], logs?: HealthLog[], onSelectGoal: (goal: HealthGoal) => void, onEditGoal: (goal: HealthGoal) => void, onDeleteGoal: (goalId: number) => void, onAddGoal: () => void }> = ({ goals, metrics, logs, onSelectGoal, onEditGoal, onDeleteGoal, onAddGoal }) => {
    const goalData = useMemo(() => {
        if (!goals || !metrics || !logs) return [];
        return goals.map(goal => {
            const metric = metrics.find(m => m.id === goal.metricId);
            const { progress } = calculateGoalProgress(goal, logs);
            const percentage = goal.target > 0 ? (progress / goal.target) * 100 : 0;
            return {
                ...goal,
                metric,
                metricName: metric?.name || 'Unknown',
                metricUnit: metric?.unit || '',
                metricIcon: metric?.icon || '🎯',
                metricColor: metric?.color || '#6366F1',
                progress,
                percentage,
            };
        });
    }, [goals, metrics, logs]);

    if (!goals || goals.length === 0) {
        return (
            <div className="text-center py-16 px-6 bg-secondary rounded-xl border border-tertiary">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">No Goals Set Yet</h2>
                <p className="text-text-secondary mb-6">
                    Set health goals to track your progress and stay motivated!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center text-sm text-text-muted">
                    <div className="flex items-center gap-2">
                        <span className="text-accent">✓</span>
                        <span>Track daily, weekly, or monthly targets</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-accent">✓</span>
                        <span>Monitor your progress visually</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-accent">✓</span>
                        <span>Get AI-powered insights</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-text-primary">
                        🎯 Your Health Goals ({goalData.length})
                    </h3>
                    <div className="text-sm text-text-muted">
                        {goalData.filter(g => g.percentage >= 100).length} completed
                    </div>
                </div>
                <button
                    onClick={onAddGoal}
                    className="bg-tertiary hover:bg-tertiary/80 text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Goal
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goalData.map(goal => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        onView={() => onSelectGoal(goal)}
                        onEdit={() => onEditGoal(goal)}
                        onDelete={() => onDeleteGoal(goal.id!)}
                    />
                ))}
            </div>
        </div>
    );
};

const RemindersTab: React.FC<{ metrics?: HealthMetric[], onSetReminder: (metric: HealthMetric) => void }> = ({ metrics, onSetReminder }) => {
    const metricsWithReminders = useMemo(() => metrics?.filter(m => m.reminderEnabled) || [], [metrics]);
    const metricsWithoutReminders = useMemo(() => metrics?.filter(m => !m.reminderEnabled) || [], [metrics]);

    if (!metrics || metrics.length === 0) {
        return (
            <div className="text-center py-16 px-6 bg-secondary rounded-xl border border-tertiary">
                <div className="text-6xl mb-4">🔔</div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">No Metrics Available</h2>
                <p className="text-text-secondary mb-6">
                    Create health metrics first before setting up reminders.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-accent/10 to-accent/5 p-5 rounded-xl border border-accent/20">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                        <h3 className="font-semibold text-accent mb-1">About Reminders</h3>
                        <p className="text-text-secondary text-sm">
                            Set time-based notifications to remind you to log your health metrics.
                            Make sure notifications are enabled in your device settings.
                        </p>
                    </div>
                </div>
            </div>

            {/* Active Reminders */}
            {metricsWithReminders.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-accent">notifications_active</span>
                        Active Reminders ({metricsWithReminders.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {metricsWithReminders.map(metric => (
                            <div
                                key={metric.id}
                                className="bg-secondary p-5 rounded-xl border-2 border-accent/30 hover:border-accent/50 transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1">
                                        {metric.icon && (
                                            <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                                                style={{ backgroundColor: metric.color ? `${metric.color}20` : '#6366F120' }}
                                            >
                                                {metric.icon}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-text-primary truncate">{metric.name}</p>
                                            <p className="text-sm text-accent flex items-center gap-1 mt-1">
                                                <span className="material-symbols-outlined text-sm">schedule</span>
                                                {new Date(`1970-01-01T${metric.reminderTime}`).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })} daily
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onSetReminder(metric)}
                                        className="bg-accent/10 hover:bg-accent/20 text-accent font-semibold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Metrics Without Reminders */}
            {metricsWithoutReminders.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-text-secondary">notifications_off</span>
                        Available Metrics ({metricsWithoutReminders.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {metricsWithoutReminders.map(metric => (
                            <div
                                key={metric.id}
                                className="bg-secondary p-5 rounded-xl border border-tertiary hover:border-accent/30 transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1">
                                        {metric.icon && (
                                            <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                                                style={{ backgroundColor: metric.color ? `${metric.color}20` : '#6366F120' }}
                                            >
                                                {metric.icon}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-text-primary truncate">{metric.name}</p>
                                            <p className="text-sm text-text-muted mt-1">No reminder set</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onSetReminder(metric)}
                                        className="bg-tertiary hover:bg-tertiary/80 text-text-primary font-semibold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">add_alert</span>
                                        Set
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};



// --- GOAL COMPONENTS ---

const GoalCard: React.FC<{ goal: any, onView: () => void, onEdit: () => void, onDelete: () => void }> = ({ goal, onView, onEdit, onDelete }) => {
    const isCompleted = goal.percentage >= 100;

    return (
        <div
            className={`bg-secondary p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg cursor-pointer group ${
                isCompleted ? 'border-green-500/50 bg-green-500/5' : 'border-tertiary hover:border-accent/50'
            }`}
            onClick={onView}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                    {goal.metricIcon && (
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ backgroundColor: goal.metricColor ? `${goal.metricColor}20` : '#6366F120' }}
                        >
                            {goal.metricIcon}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-secondary capitalize font-medium mb-1">
                            {goal.period === 'daily' ? '📅 Daily' : goal.period === 'weekly' ? '📆 Weekly' : '📊 Monthly'} Goal
                        </p>
                        <h3 className="text-lg font-bold text-text-primary truncate">{goal.metricName}</h3>
                    </div>
                </div>
                <div className="w-16 h-16 flex-shrink-0">
                    <ProgressRing percentage={goal.percentage} color={goal.metricColor} />
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="h-2 bg-tertiary rounded-full overflow-hidden">
                    <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{
                            width: `${Math.min(goal.percentage, 100)}%`,
                            background: isCompleted
                                ? 'linear-gradient(to right, #10B981, #34D399)'
                                : goal.metricColor
                                    ? `linear-gradient(to right, ${goal.metricColor}, ${goal.metricColor}CC)`
                                    : 'linear-gradient(to right, #6366F1, #818CF8)'
                        }}
                    />
                </div>
            </div>

            {/* Progress Numbers */}
            <div className="mb-4">
                <p className="text-2xl font-bold text-text-primary">
                    {goal.progress.toLocaleString()}
                    <span className="text-base text-text-secondary font-normal">
                        {' '}/ {goal.target.toLocaleString()} {goal.metricUnit}
                    </span>
                </p>
                {isCompleted && (
                    <p className="text-sm text-green-400 font-semibold mt-1 flex items-center gap-1">
                        <span>🎉</span> Goal achieved!
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="flex-1 bg-accent/10 hover:bg-accent/20 text-accent py-2 px-4 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 px-4 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete
                </button>
            </div>
        </div>
    );
};

const ProgressRing: React.FC<{ percentage: number, color?: string }> = ({ percentage, color = '#00A99D' }) => {
    const sqSize = 100;
    const strokeWidth = 10;
    const radius = (sqSize - strokeWidth) / 2;
    const viewBox = `0 0 ${sqSize} ${sqSize}`;
    const dashArray = radius * Math.PI * 2;
    const dashOffset = dashArray - (dashArray * Math.min(percentage, 100)) / 100;
    const isCompleted = percentage >= 100;

    return (
        <svg width="100%" height="100%" viewBox={viewBox}>
            <circle
                className="text-tertiary"
                stroke="currentColor"
                fill="transparent"
                strokeWidth={strokeWidth}
                cx={sqSize / 2}
                cy={sqSize / 2}
                r={radius}
            />
            <circle
                stroke={isCompleted ? '#10B981' : color}
                fill="transparent"
                strokeWidth={strokeWidth}
                cx={sqSize / 2}
                cy={sqSize / 2}
                r={radius}
                strokeLinecap="round"
                transform={`rotate(-90 ${sqSize/2} ${sqSize/2})`}
                style={{
                    strokeDasharray: dashArray,
                    strokeDashoffset: dashOffset,
                    transition: 'stroke-dashoffset 0.5s ease-out'
                }}
            />
            <text
                className="fill-current text-text-primary font-bold"
                x="50%"
                y="50%"
                dy=".3em"
                textAnchor="middle"
                fontSize="20"
            >
                {`${Math.round(percentage)}%`}
            </text>
        </svg>
    );
};

const GoalDetailModal: React.FC<{ goal: HealthGoal, metrics?: HealthMetric[], logs?: HealthLog[], closeModal: () => void }> = ({ goal, metrics, logs, closeModal }) => {
    const metric = useMemo(() => metrics?.find(m => m.id === goal.metricId), [metrics, goal]);
    const { progress, average } = useMemo(() => calculateGoalProgress(goal, logs), [goal, logs]);

    const progressPercentage = useMemo(() => {
        return Math.min((progress / goal.target) * 100, 100);
    }, [progress, goal.target]);

    const chartData = useMemo(() => {
        if (!logs) return [];
        const last30Days = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (29-i)); return d; });
        return last30Days.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const log = logs.find(l => l.metricId === goal.metricId && new Date(l.date).toISOString().startsWith(dateStr));
            return { date: date.toLocaleDateString('en-US', {month: 'short', day:'numeric'}), value: log?.value ?? null, target: goal.target }
        });
    }, [logs, goal]);

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-3xl shadow-2xl border border-tertiary max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        {metric?.icon && (
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                                style={{ backgroundColor: metric.color ? `${metric.color}20` : '#6366F120' }}
                            >
                                {metric.icon}
                            </div>
                        )}
                        <div>
                            <h2 className="text-3xl font-bold text-text-primary">{metric?.name} Goal</h2>
                            <p className="text-text-secondary capitalize mt-1">
                                {goal.period} Target: <span className="font-semibold text-accent">{goal.target} {metric?.unit}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={closeModal}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-text-secondary">Progress</span>
                        <span className="text-sm font-bold text-accent">{progressPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-4 bg-tertiary rounded-full overflow-hidden">
                        <div
                            className="h-full transition-all duration-500 rounded-full"
                            style={{
                                width: `${progressPercentage}%`,
                                background: progressPercentage >= 100
                                    ? 'linear-gradient(to right, #10B981, #34D399)'
                                    : metric?.color
                                        ? `linear-gradient(to right, ${metric.color}, ${metric.color}CC)`
                                        : 'linear-gradient(to right, #6366F1, #818CF8)'
                            }}
                        />
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-primary p-5 rounded-xl border border-tertiary">
                        <p className="text-sm text-text-secondary mb-1">Current Progress</p>
                        <p className="text-3xl font-bold text-text-primary">
                            {progress.toLocaleString()}
                            <span className="text-base text-text-secondary ml-1">{metric?.unit}</span>
                        </p>
                    </div>
                    <div className="bg-primary p-5 rounded-xl border border-tertiary">
                        <p className="text-sm text-text-secondary mb-1">
                            {goal.period === 'daily' ? 'Today' : `This ${goal.period.replace('ly','')}`}'s Average
                        </p>
                        <p className="text-3xl font-bold text-text-primary">
                            {average.toFixed(1)}
                            <span className="text-base text-text-secondary ml-1">{metric?.unit}</span>
                        </p>
                    </div>
                    <div className="bg-primary p-5 rounded-xl border border-tertiary">
                        <p className="text-sm text-text-secondary mb-1">Remaining</p>
                        <p className="text-3xl font-bold text-text-primary">
                            {Math.max(0, goal.target - progress).toFixed(1)}
                            <span className="text-base text-text-secondary ml-1">{metric?.unit}</span>
                        </p>
                    </div>
                </div>

                {/* AI Insight */}
                <div className="mb-6 p-5 bg-gradient-to-r from-accent/10 to-accent/5 rounded-xl border border-accent/20">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">💡</span>
                        <div>
                            <h3 className="font-semibold text-accent mb-1">AI Insight</h3>
                            <p className="text-text-secondary text-sm">
                                {progress >= goal.target
                                    ? `🎉 Excellent! You've achieved your ${goal.period} goal for ${metric?.name}. Keep up the great work!`
                                    : `You're ${progressPercentage.toFixed(0)}% of the way there! ${
                                        progressPercentage >= 75
                                            ? `Almost there! Just ${(goal.target - progress).toFixed(1)} ${metric?.unit} more to reach your target.`
                                            : `Stay consistent with your ${metric?.name.toLowerCase()} tracking to reach your goal.`
                                    }`
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="bg-primary p-5 rounded-xl border border-tertiary">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Last 30 Days Trend</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(224,242,241,0.1)" />
                                <XAxis dataKey="date" stroke="#B2DFDB" fontSize={11} />
                                <YAxis stroke="#B2DFDB" fontSize={11} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1A2E35',
                                        border: '1px solid #2D4A53',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    name={metric?.name}
                                    stroke={metric?.color || '#00A99D'}
                                    strokeWidth={2}
                                    connectNulls
                                    dot={{ fill: metric?.color || '#00A99D', r: 4 }}
                                />
                                <Line
                                    type="step"
                                    dataKey="target"
                                    name="Target"
                                    stroke="#F56565"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODALS ---

const AddLogModal: React.FC<{closeModal: () => void; metrics?: HealthMetric[]; logToEdit?: HealthLog | null}> = ({ closeModal, metrics, logToEdit }) => {
    const [metricId, setMetricId] = useState<string>(logToEdit?.metricId.toString() ?? '');
    const [value, setValue] = useState<string>(logToEdit?.value.toString() ?? '');
    const [date, setDate] = useState(new Date(logToEdit?.date ?? new Date()).toISOString().split('T')[0]);
    const [notes, setNotes] = useState(logToEdit?.notes ?? '');
    const [tags, setTags] = useState(logToEdit?.tags?.join(', ') ?? '');
    const [error, setError] = useState('');

    const selectedMetric = useMemo(() => metrics?.find(m => m.id === parseInt(metricId)), [metrics, metricId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!metricId) {
            setError('Please select a metric');
            return;
        }
        if (!value || isNaN(parseFloat(value))) {
            setError('Please enter a valid value');
            return;
        }

        const logData = {
            metricId: parseInt(metricId),
            value: parseFloat(value),
            date: new Date(date),
            notes: notes.trim(),
            tags: tags.split(',').map(t=>t.trim()).filter(Boolean) as string[]
        };

        try {
            if(logToEdit) {
                await healthLogsService.update(logToEdit.id!, logData);
            } else {
                await healthLogsService.create(logData);
            }
            closeModal();
        } catch (err) {
            setError('Failed to save log. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-tertiary max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-text-primary">
                        {logToEdit ? '✏️ Edit' : '📝 Log'} Health Data
                    </h2>
                    <button
                        onClick={closeModal}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Metric <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={metricId}
                            onChange={(e) => setMetricId(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                            required
                        >
                            <option value="">Select a metric...</option>
                            {metrics?.map(m => (
                                <option key={m.id} value={String(m.id)}>
                                    {m.icon} {m.name} ({m.unit})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Value <span className="text-red-400">*</span>
                            {selectedMetric && <span className="text-text-muted ml-2">({selectedMetric.unit})</span>}
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Enter value..."
                            className="w-full bg-primary border border-tertiary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Date <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full bg-primary border border-tertiary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any additional details..."
                            rows={3}
                            className="w-full bg-primary border border-tertiary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Tags (Optional)
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="e.g., morning, fasting, post-workout"
                            className="w-full bg-primary border border-tertiary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                        />
                        <p className="text-xs text-text-muted mt-1">Separate multiple tags with commas</p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-tertiary">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="bg-tertiary hover:bg-tertiary/80 text-text-primary py-2.5 px-6 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-accent hover:bg-accent-hover text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-lg"
                        >
                            {logToEdit ? 'Update Log' : 'Save Log'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
const AddMetricModal: React.FC<{closeModal: () => void, metricToEdit?: HealthMetric | null}> = ({ closeModal, metricToEdit }) => {
    const [name, setName] = useState(metricToEdit?.name ?? '');
    const [unit, setUnit] = useState(metricToEdit?.unit ?? '');
    const [category, setCategory] = useState(metricToEdit?.category ?? 'other');
    const [icon, setIcon] = useState(metricToEdit?.icon ?? '📊');
    const [color, setColor] = useState(metricToEdit?.color ?? '#6366F1');

    const icons = ['📊', '❤️', '🏃', '🍎', '😴', '💧', '🧠', '💪', '🩺', '⚖️', '🌡️', '💊', '🫀', '🫁', '🦴', '👁️'];
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !unit) return;
        const metricData = {
            name,
            unit,
            type: metricToEdit?.type ?? 'custom',
            category,
            icon,
            color,
            reminderEnabled: metricToEdit?.reminderEnabled ?? false,
            reminderTime: metricToEdit?.reminderTime ?? '09:00'
        };
        if (metricToEdit) {
            await healthMetricsService.update(metricToEdit.id!, metricData);
        } else {
            await healthMetricsService.create(metricData);
        }
        closeModal();
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary max-h-[90vh] overflow-y-auto">
                <h2 className="text-3xl font-bold mb-6 text-text-primary">{metricToEdit ? 'Edit' : 'New'} Health Metric</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <FormInput
                        label="Metric Name"
                        value={name}
                        onChange={(e:any) => setName(e.target.value)}
                        placeholder="e.g., Blood Pressure"
                    />
                    <FormInput
                        label="Unit"
                        value={unit}
                        onChange={(e:any) => setUnit(e.target.value)}
                        placeholder="e.g., mmHg"
                    />

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                        >
                            <option value="vitals">Vitals</option>
                            <option value="fitness">Fitness</option>
                            <option value="nutrition">Nutrition</option>
                            <option value="mental">Mental Health</option>
                            <option value="sleep">Sleep</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Icon</label>
                        <div className="grid grid-cols-8 gap-2">
                            {icons.map(i => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setIcon(i)}
                                    className={`p-2 text-2xl rounded-lg transition-all ${icon === i ? 'bg-accent scale-110' : 'bg-tertiary hover:bg-tertiary/80'}`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
                        <div className="grid grid-cols-8 gap-2">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-10 h-10 rounded-lg transition-all ${color === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-secondary scale-110' : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg"
                        >
                            Save Metric
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
const AddGoalModal: React.FC<{closeModal: () => void, metrics?: HealthMetric[], goalToEdit?: HealthGoal | null}> = ({ closeModal, metrics, goalToEdit }) => {
    const [metricId, setMetricId] = useState(goalToEdit?.metricId.toString() ?? '');
    const [target, setTarget] = useState(goalToEdit?.target.toString() ?? '');
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>(goalToEdit?.period ?? 'daily');
    const [error, setError] = useState('');

    const selectedMetric = useMemo(() => metrics?.find(m => m.id === parseInt(metricId)), [metrics, metricId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!metricId) {
            setError('Please select a metric');
            return;
        }
        if (!target || isNaN(parseFloat(target)) || parseFloat(target) <= 0) {
            setError('Please enter a valid target value');
            return;
        }

        const goalData = {
            metricId: Number(metricId),
            target: Number(target),
            period,
            startDate: goalToEdit?.startDate ?? new Date()
        };

        try {
            if (goalToEdit) {
                await healthGoalsService.update(goalToEdit.id!, goalData);
            } else {
                await healthGoalsService.create(goalData);
            }
            closeModal();
        } catch (err) {
            setError('Failed to save goal. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-tertiary">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-text-primary">
                        {goalToEdit ? '✏️ Edit' : '🎯 New'} Health Goal
                    </h2>
                    <button
                        onClick={closeModal}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Metric <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={metricId}
                            onChange={(e) => setMetricId(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                            required
                        >
                            <option value="">Select a metric...</option>
                            {metrics?.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.icon} {m.name} ({m.unit})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Target Value <span className="text-red-400">*</span>
                            {selectedMetric && <span className="text-text-muted ml-2">({selectedMetric.unit})</span>}
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            placeholder={selectedMetric ? `e.g., 10 ${selectedMetric.unit}` : 'Enter target value...'}
                            className="w-full bg-primary border border-tertiary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-3">
                            Goal Period <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-3 bg-primary p-2 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setPeriod('daily')}
                                className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                                    period === 'daily'
                                        ? 'bg-accent text-white shadow-lg scale-105'
                                        : 'bg-tertiary text-text-secondary hover:bg-tertiary/80'
                                }`}
                            >
                                📅 Daily
                            </button>
                            <button
                                type="button"
                                onClick={() => setPeriod('weekly')}
                                className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                                    period === 'weekly'
                                        ? 'bg-accent text-white shadow-lg scale-105'
                                        : 'bg-tertiary text-text-secondary hover:bg-tertiary/80'
                                }`}
                            >
                                📆 Weekly
                            </button>
                            <button
                                type="button"
                                onClick={() => setPeriod('monthly')}
                                className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                                    period === 'monthly'
                                        ? 'bg-accent text-white shadow-lg scale-105'
                                        : 'bg-tertiary text-text-secondary hover:bg-tertiary/80'
                                }`}
                            >
                                📊 Monthly
                            </button>
                        </div>
                        <p className="text-xs text-text-muted mt-2">
                            {period === 'daily' && 'Track your progress every day'}
                            {period === 'weekly' && 'Track your progress every week'}
                            {period === 'monthly' && 'Track your progress every month'}
                        </p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-tertiary">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="bg-tertiary hover:bg-tertiary/80 text-text-primary py-2.5 px-6 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-accent hover:bg-accent-hover text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-lg"
                        >
                            {goalToEdit ? 'Update Goal' : 'Create Goal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const SetHealthReminderModal: React.FC<{ metric: HealthMetric, closeModal: () => void }> = ({ metric, closeModal }) => {
    const [enabled, setEnabled] = useState(metric.reminderEnabled ?? false);
    const [time, setTime] = useState(metric.reminderTime ?? '09:00');

    const handleSave = async () => {
        try {
            await healthMetricsService.update(metric.id!, { reminderEnabled: enabled, reminderTime: time });
            closeModal();
        } catch (err) {
            console.error('Failed to save reminder:', err);
        }
    };

    const handleRemove = async () => {
        try {
            await healthMetricsService.update(metric.id!, { reminderEnabled: false });
            closeModal();
        } catch (err) {
            console.error('Failed to remove reminder:', err);
        }
    }

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-text-primary">🔔 Set Reminder</h2>
                        <p className="text-text-secondary mt-1">
                            {metric.icon} {metric.name}
                        </p>
                    </div>
                    <button
                        onClick={closeModal}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>
                </div>

                <div className="space-y-5">
                    <div className="flex items-center justify-between p-5 bg-primary rounded-xl border border-tertiary">
                        <div>
                            <label htmlFor="enable-reminder" className="font-semibold text-text-primary block">
                                Enable Reminder
                            </label>
                            <p className="text-xs text-text-muted mt-1">
                                Get notified to log this metric
                            </p>
                        </div>
                        <Toggle enabled={enabled} setEnabled={setEnabled} />
                    </div>

                    {enabled && (
                        <div className="p-5 bg-primary rounded-xl border border-tertiary animate-fadeIn">
                            <label htmlFor="reminder-time" className="block text-sm font-semibold text-text-primary mb-3">
                                ⏰ Reminder Time
                            </label>
                            <input
                                id="reminder-time"
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-tertiary border border-primary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary text-lg"
                            />
                            <p className="text-xs text-text-muted mt-2">
                                You'll receive a notification at this time daily
                            </p>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-tertiary">
                        {metric.reminderEnabled ? (
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="text-red-400 hover:text-red-300 text-sm font-semibold transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                Remove Reminder
                            </button>
                        ) : (
                            <div></div>
                        )}
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="bg-tertiary hover:bg-tertiary/80 text-text-primary py-2.5 px-6 rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="bg-accent hover:bg-accent-hover text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-lg"
                            >
                                Save Reminder
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- UTILITY FUNCTIONS ---
const calculateGoalProgress = (goal: HealthGoal, logs?: HealthLog[]): { progress: number; average: number; } => {
    if (!logs) return { progress: 0, average: 0 };
    const now = new Date();
    let startDate: Date;
    if (goal.period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (goal.period === 'weekly') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
    } else { // monthly
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const relevantLogs = logs.filter(l => l.metricId === goal.metricId && new Date(l.date) >= startDate);
    const progress = relevantLogs.reduce((sum, log) => sum + log.value, 0);
    const uniqueDays = new Set(relevantLogs.map(l => new Date(l.date).toISOString().split('T')[0])).size;
    const average = uniqueDays > 0 ? progress / uniqueDays : 0;
    return { progress, average };
};


export default HealthTracker;