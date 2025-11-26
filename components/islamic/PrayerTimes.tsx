import React, { useEffect, useState, useMemo } from 'react';
import { islamicDataService, Island } from '../../services/islamicDataService';
import { useSettings } from '../../hooks/useSettings';

interface PrayerTime {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

const PrayerTimes: React.FC = () => {
  const { settings, updateSetting } = useSettings();
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const islands = useMemo(() => islamicDataService.getAllIslands(), []);
  const atolls = useMemo(() => islamicDataService.getAllAtolls(), []);

  const filteredIslands = useMemo(() => {
    if (!searchTerm) return islands;
    const term = searchTerm.toLowerCase();
    return islands.filter(island =>
      island.name_en.toLowerCase().includes(term) ||
      island.name_dv.includes(searchTerm) ||
      island.reg_no.toLowerCase().includes(term)
    );
  }, [islands, searchTerm]);

  const selectedIslandData = useMemo(() =>
    islands.find(i => i.reg_no === settings.selectedIsland),
    [islands, settings.selectedIsland]
  );

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const times = islamicDataService.getPrayerTimesByDate(today, settings.selectedIsland);
    setPrayerTimes(times);
  }, [settings.selectedIsland]);

  const handleIslandSelect = (regNo: string) => {
    updateSetting('selectedIsland', regNo);
    setShowDropdown(false);
    setSearchTerm('');
  };

  if (!prayerTimes) {
    return (
      <div className="bg-secondary border border-tertiary rounded-2xl p-6">
        <div className="flex items-center justify-center gap-2 text-text-muted">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span>Loading prayer times...</span>
        </div>
      </div>
    );
  }

  const prayerData = [
    { name: 'Fajr', time: prayerTimes.fajr, icon: 'wb_twilight', color: 'text-blue-400' },
    { name: 'Sunrise', time: prayerTimes.sunrise, icon: 'wb_sunny', color: 'text-yellow-400' },
    { name: 'Dhuhr', time: prayerTimes.dhuhr, icon: 'light_mode', color: 'text-orange-400' },
    { name: 'Asr', time: prayerTimes.asr, icon: 'wb_shade', color: 'text-amber-500' },
    { name: 'Maghrib', time: prayerTimes.maghrib, icon: 'wb_twilight', color: 'text-pink-400' },
    { name: 'Isha', time: prayerTimes.isha, icon: 'nightlight', color: 'text-indigo-400' }
  ];

  return (
    <div className="bg-secondary border border-tertiary rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
      {/* Header with Island Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-accent">schedule</span>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Prayer Times</h3>
            <p className="text-xs text-text-muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Island Selector */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 bg-tertiary hover:bg-primary border border-primary rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-accent">location_on</span>
            <span className="text-text-primary font-medium">{selectedIslandData?.name_en || 'Select Island'}</span>
            <span className="material-symbols-outlined text-text-muted">{showDropdown ? 'expand_less' : 'expand_more'}</span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-secondary border border-tertiary rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col">
              {/* Search */}
              <div className="p-3 border-b border-tertiary">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">search</span>
                  <input
                    type="text"
                    placeholder="Search islands..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-tertiary border border-primary rounded-lg pl-10 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    autoFocus
                  />
                </div>
              </div>

              {/* Island List */}
              <div className="overflow-y-auto custom-scrollbar">
                {filteredIslands.length === 0 ? (
                  <div className="p-4 text-center text-text-muted text-sm">
                    No islands found
                  </div>
                ) : (
                  filteredIslands.map((island) => (
                    <button
                      key={island.reg_no}
                      onClick={() => handleIslandSelect(island.reg_no)}
                      className={`w-full text-left px-4 py-3 hover:bg-tertiary transition-colors border-b border-tertiary last:border-b-0 ${
                        island.reg_no === selectedIsland ? 'bg-accent/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{island.name_en}</p>
                          <p className="text-xs text-text-muted">{island.name_dv} • {island.reg_no}</p>
                        </div>
                        {island.reg_no === selectedIsland && (
                          <span className="material-symbols-outlined text-accent">check_circle</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prayer Times Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {prayerData.map((prayer) => (
          <div
            key={prayer.name}
            className="bg-tertiary border border-primary rounded-xl p-4 hover:border-accent transition-all duration-200 hover:scale-105"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <span className={`material-symbols-outlined text-3xl ${prayer.color}`}>{prayer.icon}</span>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{prayer.name}</p>
              <p className="text-xl font-bold text-text-primary">{prayer.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Location Info */}
      {selectedIslandData && (
        <div className="mt-4 pt-4 border-t border-tertiary flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>Atoll: {selectedIslandData.atoll_code}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">my_location</span>
            <span>{selectedIslandData.lat}, {selectedIslandData.lng}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrayerTimes;
