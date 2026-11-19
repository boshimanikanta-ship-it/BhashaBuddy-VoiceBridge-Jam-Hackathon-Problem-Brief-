import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Bookmark,
  Clock,
  Compass,
  Download,
  Globe2,
  Grid,
  Heart,
  Home,
  Menu,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { api } from '../services/api';
import type { Episode, PodcastShow } from '../types/podcast';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/channels', label: 'Language Channels', icon: Globe2 },
  { to: '/categories', label: 'Categories', icon: Grid },
];

const LIBRARY_NAV: NavItem[] = [
  { to: '/library', label: 'My Library', icon: Bookmark },
  { to: '/favorites', label: 'Favorites', icon: Heart },
  { to: '/downloads', label: 'Downloads', icon: Download },
  { to: '/recent', label: 'Recently Played', icon: Clock },
];

const ACCOUNT_NAV: NavItem[] = [
  { to: '/profile', label: 'User Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const EchoLogo: React.FC = () => (
  <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group">
    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-orange-500 flex items-center justify-center shadow-md shadow-violet-950/50">
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M4 12v-2m4 5V7m4 11V4m4 13V7m4 7v-4" />
      </svg>
    </span>
    <span className="font-display text-lg font-bold tracking-tight text-white">
      Echo<span className="text-orange-400">Episodes</span>
    </span>
  </Link>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { currentEpisode } = useAudioPlayer();
  const { preferences, notifications, unreadCount, markAllNotificationsRead } = useLibrary();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState<{ episodes: Episode[]; shows: PodcastShow[] }>({
    episodes: [],
    shows: [],
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const trimmed = searchValue.normalize('NFC').trim();
    if (!trimmed) {
      setSuggestions({ episodes: [], shows: [] });
      return;
    }

    const timer = window.setTimeout(() => {
      api.search(trimmed).then((res) => {
        setSuggestions({
          episodes: res.episodes.slice(0, 4),
          shows: res.shows.slice(0, 2),
        });
      });
    }, 140);

    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.normalize('NFC').trim();
    setShowSuggestions(false);
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
  };

  const renderNavSection = (title: string, items: NavItem[], onClick?: () => void) => (
    <div className="space-y-1">
      <div className="px-3 pb-1 text-xs font-medium text-slate-500">{title}</div>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-violet-600/20 text-white border border-violet-500/35'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0 text-slate-400" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0E0E13] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#13131B] border-r border-white/8 z-30">
        <div className="h-16 px-5 flex items-center border-b border-white/8">
          <EchoLogo />
        </div>
        <nav
          aria-label="Primary navigation"
          className={`flex-1 overflow-y-auto px-3 py-5 space-y-6 ${currentEpisode ? 'pb-28' : ''}`}
        >
          {renderNavSection('Discover', PRIMARY_NAV)}
          {renderNavSection('Your Audio', LIBRARY_NAV)}
          {renderNavSection('Account', ACCOUNT_NAV)}
        </nav>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#13131B] border-r border-white/10 h-full flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/8">
              <EchoLogo />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6 pb-24">
              {renderNavSection('Discover', PRIMARY_NAV, () => setMobileMenuOpen(false))}
              {renderNavSection('Your Audio', LIBRARY_NAV, () => setMobileMenuOpen(false))}
              {renderNavSection('Account', ACCOUNT_NAV, () => setMobileMenuOpen(false))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 h-14 md:h-16 bg-[#0E0E13]/92 backdrop-blur-md border-b border-white/8 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-w-[44px] min-h-[44px] -ml-2 rounded-xl flex items-center justify-center text-slate-200 hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block min-w-0">
              <p className="text-sm font-medium text-white truncate">
                Welcome, {preferences.displayName}
              </p>
              <p className="text-xs text-slate-400 truncate">
                Regional Radio across 7 Indian languages
              </p>
            </div>
          </div>

          {/* Search Bar with Real-Time Suggestions */}
          <div ref={searchBoxRef} className="relative flex-1 max-w-md">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="search"
                value={searchValue}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Search shows, hosts, transcripts (தமிழ், हिन्दी, Folklore)..."
                aria-label="Search episodes, shows, hosts, and transcripts"
                className="w-full h-10 pl-10 pr-9 rounded-xl bg-[#171721] border border-white/10 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-colors"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue('');
                    setSuggestions({ episodes: [], shows: [] });
                  }}
                  aria-label="Clear search query"
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {showSuggestions && searchValue.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-12 rounded-2xl bg-[#171721] border border-white/12 shadow-2xl p-2 z-40">
                {suggestions.shows.length === 0 && suggestions.episodes.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-slate-400 text-center">
                    No instant matches. Press Enter to view full search.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {suggestions.shows.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setShowSuggestions(false);
                          navigate(`/shows/${s.id}`);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{s.title}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            Show · {s.language} · {s.genre}
                          </div>
                        </div>
                      </button>
                    ))}
                    {suggestions.episodes.map((ep) => (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => {
                          setShowSuggestions(false);
                          navigate(`/explore?q=${encodeURIComponent(searchValue.trim())}`);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-100 truncate">{ep.title}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {ep.showTitle} · {ep.hostName}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full text-center py-2 text-xs font-medium text-orange-400 hover:text-orange-300 border-t border-white/8 mt-1"
                    >
                      View all results for “{searchValue.trim()}”
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Header Controls: Notifications & User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="Notifications"
                className="relative min-w-[40px] min-h-[40px] rounded-xl bg-[#171721] border border-white/8 flex items-center justify-center text-slate-300 hover:text-white hover:border-white/20 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 max-w-[90vw] rounded-2xl bg-[#171721] border border-white/12 shadow-2xl p-3 z-40">
                  <div className="flex items-center justify-between pb-2 border-b border-white/8">
                    <span className="text-xs font-semibold text-white">Notifications</span>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-xs text-violet-300 hover:text-violet-200"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          if (n.link) navigate(n.link);
                        }}
                        className={`w-full text-left rounded-xl p-2.5 transition-colors ${
                          n.read ? 'bg-transparent hover:bg-white/5' : 'bg-violet-600/10 hover:bg-violet-600/15'
                        }`}
                      >
                        <div className="text-xs font-semibold text-white">{n.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5 leading-snug">{n.message}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/profile"
              aria-label="Open User Profile"
              className="min-w-[40px] h-10 px-2.5 rounded-xl bg-[#171721] border border-white/8 hover:border-violet-500/40 flex items-center gap-2 transition-colors"
            >
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {preferences.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden md:inline text-xs font-medium text-slate-200 whitespace-nowrap">
                Profile
              </span>
            </Link>
          </div>
        </header>

        {/* Page Main Viewport */}
        <main className={`flex-1 px-4 md:px-8 py-6 md:py-8 max-w-[1400px] w-full mx-auto ${currentEpisode ? 'pb-32 md:pb-32' : 'pb-12'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};
