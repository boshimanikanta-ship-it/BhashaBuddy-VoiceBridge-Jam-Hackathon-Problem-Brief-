import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Layout } from './components/Layout';
import { PersistentPlayer } from './components/PersistentPlayer';
import { AudioPlayerProvider } from './context/AudioPlayerContext';
import { LibraryProvider } from './context/LibraryContext';
import { CategoriesPage } from './pages/CategoriesPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { ExplorePage } from './pages/ExplorePage';
import { HomePage } from './pages/HomePage';
import { HostProfilePage } from './pages/HostProfilePage';
import { LibraryPage } from './pages/LibraryPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { ShowDetailPage } from './pages/ShowDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <LibraryProvider>
        <AudioPlayerProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/channels/:lang" element={<ChannelsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/shows/:id" element={<ShowDetailPage />} />
              <Route path="/hosts/:id" element={<HostProfilePage />} />
              <Route path="/library" element={<LibraryPage defaultTab="all" />} />
              <Route path="/favorites" element={<LibraryPage defaultTab="favorites" />} />
              <Route path="/downloads" element={<LibraryPage defaultTab="downloads" />} />
              <Route path="/recent" element={<LibraryPage defaultTab="recent" />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
          {/* Mounted outside <Routes> so audio playback persists continuously across route transitions */}
          <PersistentPlayer />
          <ConfirmDialog />
        </AudioPlayerProvider>
      </LibraryProvider>
    </BrowserRouter>
  );
}
