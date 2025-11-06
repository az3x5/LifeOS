import React, { useState } from 'react';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { HealthMetric, HealthLog } from '../../types';
import { healthMetricsService, healthLogsService } from '../../services/dataService';

interface QuickAddHealthLogModalProps {
    closeModal: () => void;
}

const QuickAddHealthLogModal: React.FC<QuickAddHealthLogModalProps> = ({ closeModal }) => {
    const [metricId, setMetricId] = useState('');
    const [value, setValue] = useState('');
    
    const metrics = useSupabaseQuery<HealthMetric>('health_metrics');
    const selectedMetric = metrics?.find(m => m.id === parseInt(metricId));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!metricId || !value) {
            alert('Please select a metric and enter a value.');
            return;
        }
        await healthLogsService.create({
            metricId: parseInt(metricId),
            value: parseFloat(value),
            date: new Date(),
        } as HealthLog);
        closeModal();
    };

    return (
        <div className="fixed inset-0 bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-secondary rounded-2xl p-8 w-full max-w-md shadow-2xl border border-tertiary animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-6">Add Health Log</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Metric</label>
                        <select value={metricId} onChange={e => setMetricId(e.target.value)}
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required>
                            <option value="">Select a metric</option>
                            {metrics?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Value ({selectedMetric?.unit})</label>
                        <input type="number" step="any" value={value} onChange={e => setValue(e.target.value)} placeholder="0.0"
                            className="w-full bg-primary border border-tertiary rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-accent" required />
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={closeModal} className="bg-tertiary hover:bg-opacity-80 text-text-secondary py-2 px-6 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuickAddHealthLogModal;