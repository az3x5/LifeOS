import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { HealthMetric, HealthLog, HealthGoal } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import ConfirmModal from '../components/modals/ConfirmModal';
import AlertModal from '../components/modals/AlertModal';

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

const TABS = ['Dashboard', 'Logs', 'Goals', 'Reminders', 'Settings'];

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

    const metrics = useLiveQuery(() => db.healthMetrics.toArray(), []);
    const logs = useLiveQuery(() => db.healthLogs.orderBy('date').reverse().toArray(), []);
    const goals = useLiveQuery(() => db.healthGoals.toArray(), []);

    const handleOpenAddLog = () => { setEditingLog(null); setIsAddLogModalOpen(true); };
    const handleOpenEditLog = (log: HealthLog) => { setEditingLog(log); setIsAddLogModalOpen(true); };
    const handleOpenAddMetric = () => { setEditingMetric(null); setIsAddMetricModalOpen(true); };
    const handleOpenEditMetric = (metric: HealthMetric) => { setEditingMetric(metric); setIsAddMetricModalOpen(true); };
    const handleOpenAddGoal = () => { setEditingGoal(null); setIsAddGoalModalOpen(true); };
    const handleOpenEditGoal = (goal: HealthGoal) => { setEditingGoal(goal); setIsAddGoalModalOpen(true); };
    
    const handleDeleteLog = async (logId: number) => {
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        const logToDelete = await db.healthLogs.get(logId);
        if (!logToDelete) return;
        await db.healthLogs.delete(logId);
        const undoFunc = async () => { await db.healthLogs.add(logToDelete); };
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
                await db.healthGoals.delete(goalId);
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
            case 'Dashboard': return <DashboardTab metrics={metrics} logs={logs} />;
            case 'Logs': return <LogsTab logs={logs} metrics={metrics} onEdit={handleOpenEditLog} onDelete={handleDeleteLog} />;
            case 'Goals': return <GoalsTab goals={goals} metrics={metrics} logs={logs} onSelectGoal={setSelectedGoal} onEditGoal={handleOpenEditGoal} onDeleteGoal={handleDeleteGoal} />;
            case 'Reminders': return <RemindersTab metrics={metrics} onSetReminder={handleSetReminder} />;
            case 'Settings': return <SettingsTab metrics={metrics} onAddMetric={handleOpenAddMetric} onEditMetric={handleOpenEditMetric} />;
            default: return null;
        }
    };
    
    return (
        <div className="space-y-8 animate-fade-in relative">
            {undoAction && <UndoSnackbar message="Log deleted." onUndo={() => { undoAction.onUndo(); setUndoAction(null); }} onDismiss={() => setUndoAction(null)} />}
            
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                <h1 className="text-4xl font-bold text-text-primary">Health Tracker</h1>
                 <div className="space-x-2 flex-shrink-0">
                    <button onClick={handleOpenAddGoal} className="bg-tertiary hover:bg-opacity-80 text-text-secondary font-bold py-3 px-5 rounded-lg text-sm">+ Goal</button>
                    <button onClick={handleOpenAddMetric} className="bg-tertiary hover:bg-opacity-80 text-text-secondary font-bold py-3 px-5 rounded-lg text-sm">+ Metric</button>
                    <button onClick={handleOpenAddLog} className="bg-accent hover:bg-accent-hover text-white font-bold py-3 px-5 rounded-lg text-sm shadow-md transition-transform transform hover:scale-105">+ Log Data</button>
                </div>
            </div>
            
            <div className="border-b border-tertiary">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}>
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

// --- TABS ---

const DashboardTab: React.FC<{ metrics?: HealthMetric[], logs?: HealthLog[] }> = ({ metrics, logs }) => {
    const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse(), []);
    
    const summaryData = useMemo(() => {
        if (!metrics || !logs) return { sleep: 'N/A', steps: 'N/A', calories: 'N/A', chartData: [] };
        
        const sleepMetric = metrics.find(m => m.name.toLowerCase() === 'sleep');
        const stepsMetric = metrics.find(m => m.name.toLowerCase() === 'steps');
        const caloriesMetric = metrics.find(m => m.name.toLowerCase() === 'calories');
        
        const getLatestValue = (metricId?: number) => logs?.find(l => l.metricId === metricId)?.value;
        
        const chartData = last7Days.map(dateStr => {
            const dayLogs = logs?.filter(l => new Date(l.date).toISOString().startsWith(dateStr));
            return {
                date: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
                Sleep: dayLogs?.find(l => l.metricId === sleepMetric?.id)?.value || null,
                Steps: dayLogs?.find(l => l.metricId === stepsMetric?.id)?.value || null,
            };
        });

        return {
            sleep: getLatestValue(sleepMetric?.id) ?? 'N/A',
            steps: getLatestValue(stepsMetric?.id) ?? 'N/A',
            calories: getLatestValue(caloriesMetric?.id) ?? 'N/A',
            chartData
        };
    }, [metrics, logs, last7Days]);

    const recentLogs = useMemo(() => logs?.slice(0, 5) ?? [], [logs]);
    const metricMap = useMemo(() => metrics?.reduce((acc, metric) => { acc[metric.id!] = metric; return acc; }, {} as Record<number, HealthMetric>) ?? {}, [metrics]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-secondary p-6 rounded-xl border border-tertiary"><h3 className="text-base text-text-secondary">Last Sleep</h3><p className="text-3xl font-bold">{summaryData.sleep} <span className="text-lg">hrs</span></p></div>
                <div className="bg-secondary p-6 rounded-xl border border-tertiary"><h3 className="text-base text-text-secondary">Last Steps</h3><p className="text-3xl font-bold">{summaryData.steps}</p></div>
                <div className="bg-secondary p-6 rounded-xl border border-tertiary"><h3 className="text-base text-text-secondary">Last Calories</h3><p className="text-3xl font-bold">{summaryData.calories} <span className="text-lg">kcal</span></p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-secondary p-6 rounded-xl border border-tertiary h-[400px]">
                    <h2 className="text-xl font-semibold mb-4">Last 7 Days Trend</h2>
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={summaryData.chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(224, 242, 241, 0.1)" /><XAxis dataKey="date" stroke="#B2DFDB" fontSize={12} /><YAxis stroke="#B2DFDB" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#1A2E35', border: '1px solid #2D4A53' }} /><Legend /><Line type="monotone" dataKey="Sleep" stroke="#8884d8" connectNulls /><Line type="monotone" dataKey="Steps" stroke="#82ca9d" yAxisId={1} connectNulls /></LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-6">
                    <div className="bg-secondary p-6 rounded-xl border border-tertiary"><h3 className="font-semibold text-sm text-accent">AI Insight</h3><p className="text-text-secondary mt-1">Your sleep pattern seems consistent. Try adding a 15-minute walk after dinner to improve your deep sleep quality.</p></div>
                    <div className="bg-secondary p-6 rounded-xl border border-tertiary">
                        <h2 className="text-xl font-semibold mb-4">Recent Entries</h2>
                        <ul className="space-y-3">{recentLogs.map(log => <li key={log.id} className="flex justify-between p-3 bg-primary rounded-lg"><span className="font-medium">{metricMap[log.metricId]?.name || '...'}</span><span className="text-text-secondary">{log.value} {metricMap[log.metricId]?.unit}</span></li>)}</ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LogsTab: React.FC<{ logs?: HealthLog[], metrics?: HealthMetric[], onEdit: (log: HealthLog) => void, onDelete: (logId: number) => void }> = ({ logs, metrics, onEdit, onDelete }) => {
    const [filterMetric, setFilterMetric] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [filterDate, setFilterDate] = useState({ start: '', end: '' });

    const metricMap = useMemo(() => metrics?.reduce((acc, metric) => { acc[metric.id!] = metric; return acc; }, {} as Record<number, HealthMetric>) ?? {}, [metrics]);

    const filteredLogs = useMemo(() => {
        return logs?.filter(log => {
            if (filterMetric && log.metricId !== Number(filterMetric)) return false;
            if (filterTag && !log.tags?.join(', ').toLowerCase().includes(filterTag.toLowerCase())) return false;
            if (filterDate.start && new Date(log.date) < new Date(filterDate.start)) return false;
            if (filterDate.end && new Date(log.date) > new Date(filterDate.end)) return false;
            return true;
        }) ?? [];
    }, [logs, filterMetric, filterTag, filterDate]);

    return (
        <div className="bg-secondary p-2 md:p-6 rounded-xl border border-tertiary">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
                <FormSelect value={filterMetric} onChange={(e) => setFilterMetric(e.target.value)} label=""><option value="">All Metrics</option>{metrics?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</FormSelect>
                <FormInput type="text" value={filterTag} onChange={(e) => setFilterTag(e.target.value)} placeholder="Filter by tag..." label="" />
                <FormInput type="date" value={filterDate.start} onChange={(e) => setFilterDate(p => ({...p, start: e.target.value}))} label="" />
                <FormInput type="date" value={filterDate.end} onChange={(e) => setFilterDate(p => ({...p, end: e.target.value}))} label="" />
            </div>
            
            <div className="md:hidden divide-y divide-tertiary">
                {filteredLogs.map(log => (<LogCardItem key={log.id} log={log} metric={metricMap[log.metricId]} onEdit={onEdit} onDelete={onDelete} />))}
            </div>
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="border-b border-tertiary"><th className="p-4">Metric</th><th className="p-4">Value</th><th className="p-4">Date</th><th className="p-4">Notes</th><th className="p-4">Tags</th><th className="p-4"></th></tr></thead>
                    <tbody>{filteredLogs.map(log => (<LogTableRow key={log.id} log={log} metric={metricMap[log.metricId]} onEdit={onEdit} onDelete={onDelete} />))}</tbody>
                </table>
            </div>
            {filteredLogs.length === 0 && <p className="text-text-muted p-8 text-center">No logs found for the selected filters.</p>}
        </div>
    );
};
const LogCardItem: React.FC<{log: HealthLog, metric?: HealthMetric, onEdit: (log:HealthLog) => void, onDelete: (id: number) => void}> = ({log, metric, onEdit, onDelete}) => (
    <div className="p-4">
        <div className="flex justify-between items-start">
            <div><p className="font-semibold text-text-primary">{metric?.name}</p><p className="text-xl font-bold">{log.value} <span className="text-base font-normal text-text-secondary">{metric?.unit}</span></p><p className="text-sm text-text-muted">{new Date(log.date).toLocaleString()}</p></div>
            <div className="flex space-x-2"><button onClick={()=> onEdit(log)} className="p-1 text-text-secondary hover:text-accent">Edit</button><button onClick={()=> onDelete(log.id!)} className="p-1 text-text-secondary hover:text-red-500">Delete</button></div>
        </div>
        {log.notes && <p className="mt-2 text-sm text-text-primary bg-primary p-2 rounded-md">{log.notes}</p>}
        {log.tags && log.tags.length > 0 && <div className="mt-2 flex gap-2 flex-wrap">{log.tags.map(t => <span key={t} className="text-xs bg-tertiary px-2 py-1 rounded-full">{t}</span>)}</div>}
    </div>
);
const LogTableRow: React.FC<{log: HealthLog, metric?: HealthMetric, onEdit: (log:HealthLog) => void, onDelete: (id: number) => void}> = ({log, metric, onEdit, onDelete}) => (
     <tr className="border-b border-tertiary last:border-b-0 hover:bg-tertiary/40">
        <td className="p-4 font-medium">{metric?.name}</td><td>{log.value} {metric?.unit}</td><td>{new Date(log.date).toLocaleDateString()}</td><td className="max-w-xs truncate">{log.notes}</td>
        <td>{log.tags?.join(', ')}</td><td><button onClick={()=> onEdit(log)} className="p-1 text-text-secondary hover:text-accent">Edit</button><button onClick={()=> onDelete(log.id!)} className="p-1 text-text-secondary hover:text-red-500">Delete</button></td>
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

const GoalsTab: React.FC<{ goals?: HealthGoal[], metrics?: HealthMetric[], logs?: HealthLog[], onSelectGoal: (goal: HealthGoal) => void, onEditGoal: (goal: HealthGoal) => void, onDeleteGoal: (goalId: number) => void }> = ({ goals, metrics, logs, onSelectGoal, onEditGoal, onDeleteGoal }) => {
    const goalData = useMemo(() => {
        if (!goals || !metrics || !logs) return [];
        return goals.map(goal => {
            const metric = metrics.find(m => m.id === goal.metricId);
            const { progress } = calculateGoalProgress(goal, logs);
            const percentage = goal.target > 0 ? (progress / goal.target) * 100 : 0;
            return {
                ...goal,
                metricName: metric?.name || 'Unknown',
                metricUnit: metric?.unit || '',
                progress,
                percentage,
            };
        });
    }, [goals, metrics, logs]);

    if (!goals || goals.length === 0) {
        return <div className="text-center py-16 px-6 bg-secondary rounded-xl border border-tertiary"><span className="material-symbols-outlined text-6xl text-tertiary">flag</span><h2 className="mt-4 text-2xl font-bold">No Goals Yet</h2><p className="mt-2 text-text-muted">Set a goal to start tracking your health targets.</p></div>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goalData.map(goal => <GoalCard key={goal.id} goal={goal} onView={() => onSelectGoal(goal)} onEdit={() => onEditGoal(goal)} onDelete={() => onDeleteGoal(goal.id!)} />)}
        </div>
    );
};

const RemindersTab: React.FC<{ metrics?: HealthMetric[], onSetReminder: (metric: HealthMetric) => void }> = ({ metrics, onSetReminder }) => (
    <div className="bg-secondary p-6 rounded-xl border border-tertiary">
        <h2 className="text-xl font-semibold mb-4">Health Metric Reminders</h2>
        <p className="text-text-muted mb-6">Set time-based notifications for logging your health data. Make sure you've enabled notifications in the main app settings.</p>
        <div className="space-y-3">
            {metrics?.map(metric => (
                <div key={metric.id} className="flex items-center justify-between p-3 bg-primary rounded-lg">
                    <div>
                        <p className="font-semibold text-text-primary">{metric.name}</p>
                        {metric.reminderEnabled && metric.reminderTime ? (<p className="text-sm text-accent flex items-center"><span className="material-symbols-outlined text-sm mr-1">notifications_active</span>Enabled at {new Date(`1970-01-01T${metric.reminderTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>) : (<p className="text-sm text-text-muted">No reminder set</p>)}
                    </div>
                    <button onClick={() => onSetReminder(metric)} className="bg-tertiary hover:bg-opacity-80 text-text-secondary font-bold py-2 px-4 rounded-lg text-sm">{metric.reminderEnabled ? 'Edit' : 'Set Reminder'}</button>
                </div>
            ))}
            {(!metrics || metrics.length === 0) && <p className="text-text-muted">Create some metrics first to set reminders.</p>}
        </div>
    </div>
);

const SettingsCard: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
    <div className="bg-secondary p-6 rounded-xl border border-tertiary">
        <h2 className="text-2xl font-semibold mb-6 text-text-primary">{title}</h2>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const SettingItem: React.FC<{title: string; description: string; children: React.ReactNode}> = ({ title, description, children }) => (
     <div className="flex items-center justify-between">
        <div>
            <h3 className="font-medium text-text-primary">{title}</h3>
            <p className="text-sm text-text-muted">{description}</p>
        </div>
        {children}
    </div>
);

const SettingsTab: React.FC<{ metrics?: HealthMetric[], onAddMetric: () => void, onEditMetric: (metric: HealthMetric) => void }> = ({ metrics, onAddMetric, onEditMetric }) => {
    const [aiInsights, setAiInsights] = useState(true);

    const handleDeleteMetric = async (metricId: number) => {
        const logsCount = await db.healthLogs.where({ metricId }).count();
        const goalsCount = await db.healthGoals.where({ metricId }).count();

        if (logsCount > 0 || goalsCount > 0) {
            setAlertModal({
                isOpen: true,
                title: 'Cannot Delete Metric',
                message: "This metric cannot be deleted because it is used in existing logs or goals.",
                icon: '📊'
            });
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Delete Metric',
            message: "Are you sure you want to permanently delete this metric? This action cannot be undone.",
            icon: '📊',
            onConfirm: async () => {
                await db.healthMetrics.delete(metricId);
                setConfirmModal(null);
            }
        });
    }

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <SettingsCard title="Manage Metrics">
                <div className="flex justify-end">
                    <button onClick={onAddMetric} className="bg-tertiary hover:bg-opacity-80 text-text-secondary font-bold py-2 px-4 rounded-lg text-sm">+ New Metric</button>
                </div>
                <ul className="divide-y divide-tertiary">
                    {metrics?.map(m => (
                        <li key={m.id} className="py-3 flex justify-between items-center">
                            <span>{m.name} ({m.unit})</span>
                            <div className="flex items-center gap-2">
                                <button className="text-accent text-sm hover:underline" onClick={() => onEditMetric(m)}>Edit</button>
                                <button className="text-red-500 text-sm hover:underline" onClick={() => handleDeleteMetric(m.id!)}>Delete</button>
                            </div>
                        </li>
                    ))}
                    {(!metrics || metrics.length === 0) && <p className="text-text-muted text-center py-4">No custom metrics defined.</p>}
                </ul>
            </SettingsCard>

            <SettingsCard title="Preferences">
                <SettingItem title="Enable AI Insights" description="Show smart tips and summaries on your dashboard.">
                    <Toggle enabled={aiInsights} setEnabled={setAiInsights} />
                </SettingItem>
                <SettingItem title="Dashboard Layout" description="Choose how your dashboard is displayed (coming soon).">
                    <select disabled className="bg-tertiary border border-primary rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50">
                        <option>Default</option>
                    </select>
                </SettingItem>
            </SettingsCard>

            <SettingsCard title="Data & Privacy">
                <SettingItem title="Export Health Data" description="Download all your health logs and metrics.">
                    <button disabled title="Export (coming soon)" className="bg-tertiary text-text-secondary font-bold py-2 px-4 rounded-lg text-sm opacity-50 cursor-not-allowed">Export CSV</button>
                </SettingItem>
                <SettingItem title="Local Data Encryption" description="Encrypt your health data on this device (coming soon).">
                    <Toggle enabled={false} disabled={true} />
                </SettingItem>
                 <SettingItem title="Enable PIN Lock" description="Require a PIN to open the Health module (coming soon).">
                    <Toggle enabled={false} disabled={true} />
                </SettingItem>
            </SettingsCard>
        </div>
    );
};

// --- GOAL COMPONENTS ---

const GoalCard: React.FC<{ goal: any, onView: () => void, onEdit: () => void, onDelete: () => void }> = ({ goal, onView, onEdit, onDelete }) => {
    return (
        <div className="bg-secondary p-6 rounded-xl border border-tertiary flex flex-col justify-between group">
            <div onClick={onView} className="cursor-pointer">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-text-secondary capitalize">{goal.period} Goal</p>
                        <h3 className="text-xl font-bold text-text-primary">{goal.metricName}</h3>
                    </div>
                    <div className="w-16 h-16"><ProgressRing percentage={goal.percentage} /></div>
                </div>
                <div className="mt-4">
                    <p className="text-2xl font-bold">{goal.progress.toLocaleString()} / <span className="text-text-secondary">{goal.target.toLocaleString()} {goal.metricUnit}</span></p>
                </div>
            </div>
            <div className="mt-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="text-accent text-sm font-semibold hover:underline mr-4">Edit</button>
                <button onClick={onDelete} className="text-red-400 text-sm font-semibold hover:underline">Delete</button>
            </div>
        </div>
    );
};

const ProgressRing: React.FC<{ percentage: number }> = ({ percentage }) => {
    const sqSize = 100;
    const strokeWidth = 10;
    const radius = (sqSize - strokeWidth) / 2;
    const viewBox = `0 0 ${sqSize} ${sqSize}`;
    const dashArray = radius * Math.PI * 2;
    const dashOffset = dashArray - (dashArray * Math.min(percentage, 100)) / 100;

    return (
        <svg width="100%" height="100%" viewBox={viewBox}>
            <circle className="text-tertiary" stroke="currentColor" fill="transparent" strokeWidth={strokeWidth} cx={sqSize / 2} cy={sqSize / 2} r={radius} />
            <circle className="text-accent" stroke="currentColor" fill="transparent" strokeWidth={strokeWidth} cx={sqSize / 2} cy={sqSize / 2} r={radius}
                strokeLinecap="round" transform={`rotate(-90 ${sqSize/2} ${sqSize/2})`}
                style={{ strokeDasharray: dashArray, strokeDashoffset: dashOffset, transition: 'stroke-dashoffset 0.5s ease-out' }} />
            <text className="fill-current text-text-primary font-bold" x="50%" y="50%" dy=".3em" textAnchor="middle" fontSize="24">{`${Math.round(percentage)}%`}</text>
        </svg>
    );
};

const GoalDetailModal: React.FC<{ goal: HealthGoal, metrics?: HealthMetric[], logs?: HealthLog[], closeModal: () => void }> = ({ goal, metrics, logs, closeModal }) => {
    const metric = useMemo(() => metrics?.find(m => m.id === goal.metricId), [metrics, goal]);
    const { progress, average } = useMemo(() => calculateGoalProgress(goal, logs), [goal, logs]);

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
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-tertiary animate-fade-in-up">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold">{metric?.name} Goal</h2>
                        <p className="text-text-secondary capitalize">{goal.period} Target: {goal.target} {metric?.unit}</p>
                    </div>
                    <button onClick={closeModal} className="p-2 -mr-2 text-2xl">&times;</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                        <p className="text-text-secondary">Current Progress</p>
                        <p className="text-4xl font-bold">{progress.toLocaleString()} <span className="text-lg text-text-secondary">{metric?.unit}</span></p>
                    </div>
                     <div>
                        <p className="text-text-secondary">{goal.period === 'daily' ? 'Today' : `This ${goal.period.replace('ly','')}`}'s Average</p>
                        <p className="text-4xl font-bold">{average.toFixed(1)} <span className="text-lg text-text-secondary">{metric?.unit}</span></p>
                    </div>
                </div>
                 <div className="mt-4 p-4 bg-primary rounded-lg"><p className="text-text-secondary"><strong className="text-accent">AI Recommendation:</strong> {progress >= goal.target ? 'Great work hitting your goal!' : `You're close! A short evening walk could help you reach your ${metric?.name.toLowerCase()} target.`}</p></div>
                <div className="h-[300px] mt-6">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(224,242,241,0.1)" />
                            <XAxis dataKey="date" stroke="#B2DFDB" fontSize={12} />
                            <YAxis stroke="#B2DFDB" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A2E35', border: '1px solid #2D4A53' }} />
                            <Legend />
                            <Line type="monotone" dataKey="value" name={metric?.name} stroke="#00A99D" connectNulls />
                            <Line type="step" dataKey="target" name="Target" stroke="#F56565" strokeDasharray="5 5" />
                        </LineChart>
                    </ResponsiveContainer>
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
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!metricId || !value) return;
        const logData = { metricId: parseInt(metricId), value: parseFloat(value), date: new Date(date), notes: notes, tags: tags.split(',').map(t=>t.trim()).filter(Boolean) as string[] };
        if(logToEdit) { await db.healthLogs.update(logToEdit.id!, logData); } else { await db.healthLogs.add(logData); }
        closeModal();
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-3xl font-bold mb-6">{logToEdit ? 'Edit' : 'Log'} Health Data</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <FormSelect label="Metric" value={metricId} onChange={(e:any) => setMetricId(e.target.value)}><option value="">Select Metric</option>{metrics?.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}</FormSelect>
                    <FormInput label="Value" type="number" step="any" value={value} onChange={(e:any) => setValue(e.target.value)} placeholder="0.0" />
                    <FormInput label="Date" type="date" value={date} onChange={(e:any) => setDate(e.target.value)} />
                    <FormInput label="Notes (Optional)" value={notes} onChange={(e:any) => setNotes(e.target.value)} placeholder="Any details..." />
                    <FormInput label="Tags (comma-separated)" value={tags} onChange={(e:any) => setTags(e.target.value)} placeholder="e.g., morning, post-workout" />
                     <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={closeModal} className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button><button type="submit" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Save</button></div>
                </form>
            </div>
        </div>
    );
};
const AddMetricModal: React.FC<{closeModal: () => void, metricToEdit?: HealthMetric | null}> = ({ closeModal, metricToEdit }) => {
    const [name, setName] = useState(metricToEdit?.name ?? ''); 
    const [unit, setUnit] = useState(metricToEdit?.unit ?? '');
    
    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (!name || !unit) return; 
        const metricData = { name, unit, reminderEnabled: metricToEdit?.reminderEnabled ?? false, reminderTime: metricToEdit?.reminderTime ?? '09:00' };
        if (metricToEdit) {
            await db.healthMetrics.update(metricToEdit.id!, metricData);
        } else {
            await db.healthMetrics.add(metricData); 
        }
        closeModal(); 
    };

    return (<div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary"><h2 className="text-3xl font-bold mb-6">{metricToEdit ? 'Edit' : 'New'} Health Metric</h2><form onSubmit={handleSubmit} className="space-y-5"><FormInput label="Metric Name" value={name} onChange={(e:any) => setName(e.target.value)} placeholder="e.g., Blood Pressure" /><FormInput label="Unit" value={unit} onChange={(e:any) => setUnit(e.target.value)} placeholder="e.g., mmHg" /><div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={closeModal} className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button><button type="submit" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Save Metric</button></div></form></div></div>);
};
const AddGoalModal: React.FC<{closeModal: () => void, metrics?: HealthMetric[], goalToEdit?: HealthGoal | null}> = ({ closeModal, metrics, goalToEdit }) => {
    const [metricId, setMetricId] = useState(goalToEdit?.metricId.toString() ?? '');
    const [target, setTarget] = useState(goalToEdit?.target.toString() ?? '');
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>(goalToEdit?.period ?? 'daily');
    
    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (!metricId || !target) return; 
        const goalData = { metricId: Number(metricId), target: Number(target), period, startDate: goalToEdit?.startDate ?? new Date() };
        if (goalToEdit) {
            await db.healthGoals.update(goalToEdit.id!, goalData);
        } else {
            await db.healthGoals.add(goalData); 
        }
        closeModal(); 
    };
    return (<div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary"><h2 className="text-3xl font-bold mb-6">{goalToEdit ? 'Edit' : 'New'} Health Goal</h2><form onSubmit={handleSubmit} className="space-y-5"><FormSelect label="Metric" value={metricId} onChange={e => setMetricId(e.target.value)}><option>Select Metric</option>{metrics?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</FormSelect><FormInput label="Target" type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder={`e.g., 7 (${metrics?.find(m=>m.id===Number(metricId))?.unit})`} /><div className="flex space-x-2 bg-primary p-1 rounded-lg"><button type="button" onClick={() => setPeriod('daily')} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${period === 'daily' ? 'bg-accent shadow-md' : 'hover:bg-tertiary'}`}>Daily</button><button type="button" onClick={() => setPeriod('weekly')} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${period === 'weekly' ? 'bg-accent shadow-md' : 'hover:bg-tertiary'}`}>Weekly</button><button type="button" onClick={() => setPeriod('monthly')} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${period === 'monthly' ? 'bg-accent shadow-md' : 'hover:bg-tertiary'}`}>Monthly</button></div><div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={closeModal} className="bg-tertiary text-text-secondary py-2 px-6 rounded-lg">Cancel</button><button type="submit" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Set Goal</button></div></form></div></div>);
}

const SetHealthReminderModal: React.FC<{ metric: HealthMetric, closeModal: () => void }> = ({ metric, closeModal }) => {
    const [enabled, setEnabled] = useState(metric.reminderEnabled ?? false); 
    const [time, setTime] = useState(metric.reminderTime ?? '09:00');
    
    const handleSave = async () => { 
        await db.healthMetrics.update(metric.id!, { reminderEnabled: enabled, reminderTime: time }); 
        closeModal(); 
    };
    
    const handleRemove = async () => { 
        await db.healthMetrics.update(metric.id!, { reminderEnabled: false }); 
        closeModal(); 
    }

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary">
                <h2 className="text-3xl font-bold mb-2">Reminder for</h2>
                <p className="text-text-secondary mb-6">{metric.name}</p>
                <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-primary rounded-lg">
                        <label htmlFor="enable-reminder" className="font-medium text-text-primary">Enable Reminder</label>
                        <Toggle enabled={enabled} setEnabled={setEnabled} />
                    </div>
                    {enabled && (
                        <div className="p-4 bg-primary rounded-lg">
                            <label htmlFor="reminder-time" className="block text-sm font-medium text-text-secondary mb-2">Reminder Time</label>
                            <input id="reminder-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-tertiary border border-primary rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-accent text-text-primary"/>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-4">
                        <button type="button" onClick={handleRemove} title="Remove Reminder" className="text-red-500 hover:underline text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled={!metric.reminderEnabled}>Remove</button>
                        <div className="flex space-x-4">
                            <button type="button" onClick={closeModal} title="Cancel" className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button>
                            <button type="button" onClick={handleSave} title="Save Reminder" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Save</button>
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