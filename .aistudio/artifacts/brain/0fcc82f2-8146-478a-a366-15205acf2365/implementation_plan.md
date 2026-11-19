# EchoEpisodes – Regional Radio

EchoEpisodes is a full-stack Indian regional-language podcast discovery and streaming platform built around a persistent dark-studio audio experience. It enables listeners to explore 12 curated shows and 40 episodes across 7 Indian regional languages, search transcripts in both native Indic scripts and phonetic transliterations, manage personal bookmarks and subscriptions without mandatory login, and stream uninterrupted audio while navigating across pages.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and aesthetic choices were confirmed during Phase 1 discovery and will govern the implementation:

- **Confirmed Persistence Strategy**: Express REST API backed by a relational SQLite database (`PodcastShows`, `Episodes`, `Hosts`, `Bookmarks`, `Favorites`, `ListeningHistory`, `Subscriptions`) paired with automatic client-side `localStorage` synchronization for instant library updates and offline resilience without requiring user registration.
- **Confirmed Visual Theme**: Dark studio charcoal canvas (`#0E0E13`) with dark grey structural surfaces (`#171721`), Electric Purple (`#7C3AED` / `#8B5CF6`) primary actions, and Warm Saffron Orange (`#F97316`) highlights.
- **Confirmed Audio Delivery**: Dedicated Express streaming endpoints serving playable multi-harmonic regional broadcast audio streams with HTTP byte-range support (enabling seamless scrubbing and chapter seeking), backed by a browser Web Audio API procedural soundscape fallback if a stream fails or offline mode is simulated.

---

## 1. Overview & Core Concept

- **What It Does**: EchoEpisodes connects listeners with regional storytelling, folklore, history, technology, cinema, music, literature, education, and local news across **Hindi, Tamil, Telugu, Malayalam, Bengali, Marathi, and Kannada**.
- **Target Audience**: Multilingual Indian podcast listeners, cultural enthusiasts, and hackathon demonstrators seeking an immediate, account-free streaming and discovery workflow.
- **Key Value**: Unifies regional-script discovery (`NFC` Unicode normalization + phonetic search), continuous cross-route playback, interactive transcripts and chapters, and personal library curation in one cohesive application.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Instant Discovery & Demo Flow**:
   - Listener lands on the **Home** dashboard featuring the Spotlight Hero podcast, Trending Podcasts, Popular Regional Channels (all 7 languages), Recommended Episodes, and Recently Played history.
   - Selecting any language channel (e.g., **Tamil**) filters shows and episodes immediately by language and cultural genre, leading to show detail views (e.g., **Madras Melodies**) where any episode starts streaming in the persistent bottom player.
2. **Uninterrupted Multi-Page Listening**:
   - Playback is owned by a global React Context mounted outside the router `<Routes>` tree. Navigating from a Show Detail page to a **Host Profile**, **Search**, or **My Library** preserves exact audio playback state, progress, speed, and sleep timer without remounting the audio element.
3. **Multilingual Search & Transcript Exploration**:
   - Real-time search matches across episode titles, show names, hosts, descriptions, spoken topics, and full transcripts using `String.prototype.normalize('NFC')` for Devanagari, Tamil, Bengali, Telugu, Malayalam, and Kannada scripts alongside phonetic transliterations.
4. **Personal Curation & Stretch Controls**:
   - Listeners can bookmark episodes or save **timestamped moments** directly from the player or episode list, favorite shows, subscribe to creators, simulate offline audio caching with progress feedback, inspect synchronized episode chapters, adjust playback speed (`0.75x`–`2.0x`), and set a sleep timer (`15m`, `30m`, `45m`, or `End of Episode`) with gentle volume fade-out.

### Visual Identity & Theme

- **Aesthetic Direction**: Contemporary dark broadcast studio—inspired by Spotify, Apple Podcasts, and Audible, refined with clean editorial spacing, single-elevation flat cards, and hairline dividers rather than cluttered badge sandwiches.
- **Color Palette & Mood (60-30-10 Budget)**:
  - *60% Dominant Canvas*: `--background` Deep Charcoal (`#0E0E13`) and elevated header/sidebar rails (`#13131B`).
  - *30% Structural Surfaces*: `--surface` Dark Grey (`#171721`), subtle hairline borders (`rgba(255, 255, 255, 0.08)`), crisp off-white primary copy (`#F8FAFC`), and muted slate secondary text (`#94A3B8`).
  - *10% Accent Budget*: `--primary` Electric Purple (`#7C3AED` / hover `#8B5CF6`) for primary play/subscribe actions and active navigation indicators; `--accent` Warm Saffron Orange (`#F97316`) for active progress rails, timestamped bookmark markers, and regional spotlight cues.
- **Typography & Hierarchy**:
  - *Display & Headings*: `Outfit` (600–700 weight, `text-wrap: balance`) for hero titles, show headers, and section headings.
  - *Body & Navigation*: `DM Sans` (400–500 weight, comfortable 1.5–1.6 line height) for descriptions, transcripts, and sidebar navigation.
  - *Timecodes & Metrics*: `JetBrains Mono` with `tabular-nums` for playback clocks, chapter timestamps, durations, and subscriber counts.
- **Metadata & Control Discipline**:
  - Static metadata (language, genre, duration, publication date) renders as clean unboxed inline text separated by typographic middots (`·`), reserving button styling strictly for interactive filters, tabs, and actions.
  - Custom high-resolution regional podcast cover art and host portraits generated locally to prevent broken external image dependencies, paired with styled CSS/SVG fallback containers.

### Responsive Layout & Motion

- **Desktop & Tablet**: Fixed left navigation sidebar (`256px`) with EchoEpisodes branding and full route links (Home, Explore, Language Channels, Categories, My Library, Favorites, Downloads, Recently Played, User Profile, Settings), sticky top search/welcome/notification/profile header, multi-column CSS Grid content canvas, and persistent full-width bottom player.
- **Mobile (`375px`–`430px`)**: Compact single-row mobile header with slide-over navigation drawer, touch-friendly targets ($\ge 44\text{px}$), generous bottom padding so scrollable cards never hide behind the player, and a compact persistent mini-player bar obeying the $\le 15\%$ sticky viewport height budget with an expandable full-control sheet.
- **Interactive Feedback**: `150ms` compositor-only transitions, skeleton loading states during API fetches, confirmation dialogs before removing saved bookmarks or favorites, inline audio error banners with one-click fallback recovery, and accessible keyboard controls (`Space` play/pause, `ArrowLeft`/`ArrowRight` seek, `M` mute).

---

## 3. Key Product Decisions & Trade-Offs

- **Hybrid SQLite + LocalStorage Synchronization**:
  - *Chosen Approach*: Persist all catalog data and user interactions (`Bookmarks`, `Favorites`, `ListeningHistory`, `Subscriptions`) in SQLite via Express REST endpoints, while mirroring personal library mutations in `localStorage`.
  - *Why*: Satisfies full backend persistence requirements while guaranteeing instant optimistic UI updates, zero-login hackathon readiness, and resilience across page reloads.
  - *Alternatives Considered*: Pure `localStorage` (lacks real backend API demonstration) or mandatory user authentication (adds friction to the demo flow).
- **Server-Synthesized Playable Audio + Web Audio Fallback**:
  - *Chosen Approach*: Express serves genuine playable RIFF/WAV audio streams per episode with HTTP `206 Partial Content` range support, and the client player automatically transitions to a Web Audio API harmonic broadcast synthesizer if an audio element errors or when playing offline-simulated downloads.
  - *Why*: Eliminates broken third-party MP3 links during evaluation while making HTML5 `<audio>` progress bars, playback speed (`playbackRate`), chapter seeking, and sleep-timer volume fade-out work deterministically.
  - *Alternatives Considered*: Linking external internet radio/MP3 URLs (prone to CORS errors, timeouts, or 404s in sandboxed environments).
- **Offline Audio Download Simulator**:
  - *Chosen Approach*: Simulates chunked download progress (`0%` to `100%`), caches episode metadata and audio availability flags in `localStorage`/SQLite, and displays a clear badge noting that offline storage is simulated in-browser.
  - *Why*: Delivers a responsive, honest demonstration of download management without requiring large binary Cache API payloads.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         Client Application (React)                      │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Global Context Providers (Mounted Outside React Router <Routes>)  │  │
│  │  • AudioPlayerContext (HTML5 <audio> + WebAudio Fallback + Timer) │  │
│  │  • LibraryContext (REST Sync + LocalStorage Cache + Downloads)    │  │
│  └───────────────┬───────────────────────────────────┬───────────────┘  │
│                  │                                   │                  │
│  ┌───────────────▼───────────────┐   ┌───────────────▼───────────────┐  │
│  │      Layout & Navigation      │   │       Page Views (Routes)     │  │
│  │  • Responsive Sidebar/Drawer  │   │  • Home & Explore             │  │
│  │  • Top Header (Search/Notif)  │   │  • Language Channels (7 Lang) │  │
│  │  • Persistent Bottom Player   │   │  • Categories & Show Detail   │  │
│  │    (Speed, Sleep, Chapters,   │   │  • Host Profile & Search      │  │
│  │     Timestamped Bookmarks)    │   │  • My Library / Profile / Set │  │
│  └───────────────────────────────┘   └───────────────────────────────┘  │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ REST JSON + Audio Range Streams
┌──────────────────────────────────▼──────────────────────────────────────┐
│                     Express.js Backend (Port 3000)                      │
│                                                                         │
│  ┌──────────────────────────────┐   ┌────────────────────────────────┐  │
│  │      REST API Controllers    │   │    Audio Stream Generator      │  │
│  │  • /api/shows, /api/episodes │   │  • /api/audio/:episodeId       │  │
│  │  • /api/channels, /api/hosts │   │  • HTTP 206 Byte-Range Seeking │  │
│  │  • /api/search (NFC Unicode) │   └────────────────────────────────┘  │
│  │  • /api/library, /bookmarks  │                                       │
│  │  • /api/favorites, /history  │   ┌────────────────────────────────┐  │
│  │  • /api/subscriptions        │   │      SQLite Data Layer         │  │
│  └──────────────┬───────────────┘   │  • PodcastShows, Episodes      │  │
│                 └──────────────────►│  • Hosts, Bookmarks, Favorites │  │
│                                     │  • ListeningHistory, Subs      │  │
│                                     └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **PodcastShows (12 Shows)**: Includes *Katha Lok* (Hindi Folklore), *Madras Melodies* (Tamil Culture), *Tech Adda* (Bengali Technology), *Telugu Cinema Charithra* (Telugu Cinema), plus curated shows spanning Malayalam, Marathi, Kannada, and additional genres—storing cover image, description, language, cultural category, host reference, and subscriber count.
- **Episodes (40 Records)**: Linked to shows and hosts, each carrying a unique ID, title, description, playable audio endpoint URL, thumbnail, duration in seconds, language, genre, publication date, multi-speaker regional/English transcript, and interactive chapter markers (`title`, `timestampSec`).
- **Hosts**: Creator profiles with avatar, biography, primary regional language, social links, total listens, and subscriber count.
- **Personal Library Tables (`Bookmarks`, `Favorites`, `ListeningHistory`, `Subscriptions`)**: Track saved episodes, optional timestamped notes (`timestampSec`), favorite shows, last played position/timestamp for one-click resume, and host/show subscriptions.

### Interactive Component & State Mapping

- **Global Audio Engine**: Holds `currentEpisode`, `queue`, `isPlaying`, `currentTime`, `duration`, `volume`, `isMuted`, `playbackRate`, `sleepTimer`, and `audioError`. Route changes never touch the `<audio>` node; seeking updates `audio.currentTime` and syncs listening history throttled to the backend + `localStorage`.
- **Sleep Timer Fade Controller**: Counts down remaining seconds (or monitors `ended` for End of Episode), smoothly ramps `audio.volume` down over the final 5 seconds, pauses playback, and restores user volume afterward.
- **Unicode-Aware Search Engine**: Normalizes both query strings and indexed fields (`title`, `description`, `host`, `show`, `topics`, `transcript`) with `.normalize('NFC')`, paired with a transliteration/keyword matcher so native regional scripts and English queries return consistent results with highlighted transcript snippets.
- **Library Mutation & Confirmation Flow**: Toggling a bookmark or favorite validates input on both client and Express middleware; removing a saved bookmark, favorite, or simulated download prompts a clean confirmation modal before committing to SQLite and `localStorage`.
