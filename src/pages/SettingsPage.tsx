import React, { useState } from 'react';
import { Check, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useLibrary } from '../context/LibraryContext';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export const SettingsPage: React.FC = () => {
  const { preferences, updateUserPreferences, clearHistoryWithConfirm } = useLibrary();
  const { setPlaybackRate } = useAudioPlayer();
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSpeedChange = async (speed: number) => {
    setPlaybackRate(speed);
    await updateUserPreferences({ defaultSpeed: speed });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const toggleAutoFallback = async () => {
    await updateUserPreferences({ autoFallbackAudio: !preferences.autoFallbackAudio });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const toggleNotifications = async () => {
    await updateUserPreferences({ notificationsEnabled: !preferences.notificationsEnabled });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-orange-400">
          <SettingsIcon className="w-4 h-4" />
          <span>Audio & Application Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400">
          Configure default playback behavior, fallback audio mode, and local cache controls.
        </p>
      </div>

      {savedNotice && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/35 px-4 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Settings saved.</span>
        </div>
      )}

      <section className="rounded-3xl bg-[#171721] border border-white/10 p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-white">Default Playback Speed</h2>
          <p className="text-xs text-slate-400">
            Applied automatically whenever you launch a new episode.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {SPEEDS.map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => handleSpeedChange(spd)}
                className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-mono tabular-nums transition-colors ${
                  preferences.defaultSpeed === spd
                    ? 'bg-violet-600 text-white'
                    : 'bg-[#0E0E13] border border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        <div className="pt-5 border-t border-white/8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Auto Web Audio Fallback</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automatically switch to the Web Audio regional synthesizer if an audio stream fails to load.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.autoFallbackAudio}
            onClick={toggleAutoFallback}
            className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ${
              preferences.autoFallbackAudio ? 'bg-violet-600' : 'bg-white/15'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                preferences.autoFallbackAudio ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="pt-5 border-t border-white/8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Broadcast Notifications</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Show activity updates when you bookmark episodes or finish offline simulator downloads.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.notificationsEnabled}
            onClick={toggleNotifications}
            className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ${
              preferences.notificationsEnabled ? 'bg-violet-600' : 'bg-white/15'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                preferences.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="pt-5 border-t border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Listening History</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Clear your recently played episodes and saved resume positions.
            </p>
          </div>
          <button
            type="button"
            onClick={clearHistoryWithConfirm}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-orange-500/15 border border-orange-500/35 text-orange-300 hover:bg-orange-500/25 text-xs font-semibold flex items-center gap-2 whitespace-nowrap self-start sm:self-center"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear History</span>
          </button>
        </div>
      </section>
    </div>
  );
};
