import React, { useState } from 'react';
import { Check, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import { REGIONAL_LANGUAGES } from '../data/catalogData';
import type { RegionalLanguage } from '../types/podcast';

export const ProfilePage: React.FC = () => {
  const {
    preferences,
    bookmarks,
    favorites,
    subscriptions,
    history,
    downloads,
    updateUserPreferences,
  } = useLibrary();

  const [displayName, setDisplayName] = useState(preferences.displayName);
  const [handle, setHandle] = useState(preferences.handle);
  const [bio, setBio] = useState(preferences.bio);
  const [preferredLanguages, setPreferredLanguages] = useState<RegionalLanguage[]>(
    preferences.preferredLanguages
  );
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleLang = (lang: RegionalLanguage) => {
    setPreferredLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSavedMsg(null);

    if (!displayName.trim()) {
      setFormError('Display name cannot be empty.');
      return;
    }

    await updateUserPreferences({
      displayName: displayName.trim(),
      handle: handle.trim() || '@listener',
      bio: bio.trim(),
      preferredLanguages,
    });
    setSavedMsg('Profile updated and saved to local database.');
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 rounded-3xl bg-[#171721] border border-white/10 p-6 sm:p-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-orange-500 flex items-center justify-center text-3xl font-bold text-white shrink-0">
          {preferences.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-orange-400 font-medium">
            <User className="w-3.5 h-3.5" />
            <span>Listener Profile (No Login Required)</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">{preferences.displayName}</h1>
          <p className="text-sm text-slate-400">{preferences.handle}</p>
        </div>
        <Link
          to="/library"
          className="px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-xs font-semibold text-white whitespace-nowrap self-start sm:self-center"
        >
          Open My Library
        </Link>
      </div>

      {/* Listening Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Bookmarks', value: bookmarks.length },
          { label: 'Favorites', value: favorites.length },
          { label: 'Subscriptions', value: subscriptions.length },
          { label: 'Played', value: history.length },
          { label: 'Cached', value: downloads.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-[#171721] border border-white/8 p-4 text-center"
          >
            <div className="text-2xl font-bold font-mono tabular-nums text-white">
              {stat.value}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Editable Profile Form */}
      <form
        onSubmit={handleSave}
        className="rounded-3xl bg-[#171721] border border-white/10 p-6 sm:p-8 space-y-5"
      >
        <h2 className="text-lg font-bold text-white">Personalize Your Regional Feed</h2>

        {formError && (
          <div className="rounded-xl bg-orange-500/15 border border-orange-500/40 px-4 py-2.5 text-xs text-orange-300">
            {formError}
          </div>
        )}
        {savedMsg && (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/35 px-4 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{savedMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="profile-name" className="text-xs font-medium text-slate-300">
              Display Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#0E0E13] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="profile-handle" className="text-xs font-medium text-slate-300">
              Listener Handle
            </label>
            <input
              id="profile-handle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#0E0E13] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-bio" className="text-xs font-medium text-slate-300">
            Bio & Listening Interests
          </label>
          <textarea
            id="profile-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-[#0E0E13] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-300 block">
            Preferred Regional Languages
          </span>
          <div className="flex flex-wrap gap-2">
            {REGIONAL_LANGUAGES.map((lang) => {
              const selected = preferredLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-violet-600 text-white'
                      : 'bg-[#0E0E13] border border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
        >
          Save Profile
        </button>
      </form>
    </div>
  );
};
