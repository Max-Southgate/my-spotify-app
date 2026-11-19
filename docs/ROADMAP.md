# Wavelength roadmap

How to take this app from "my Spotify top lists" to something close to stats.fm, in steps that each work on their own. Written November 2026. Spotify changes its API often, so recheck the links at the bottom before starting a phase.

Designs: `design/wireframes-v3.html` (part one is built, part two is this roadmap).

## Where the app is today

| Page | Data source |
|---|---|
| Overview, Top tracks, Top artists, Genres | Spotify Web API (`/me/top/*`, `/me/player/recently-played`) |
| Insights | `StreamingHistory_music_*.json` from your Spotify "Account data" export, read from `public/Spotify Account Data/` |
| Save as playlist | `POST /me/playlists` + `POST /playlists/{id}/items` |

Code map: data logic and its tests in `src/stats.js` / `src/stats.test.js`, API calls in `src/spotifyApi.js`, login (PKCE) in `src/authService.js`, shared UI in `src/ui.js`, one file per page.

Hard limits we live with (development mode):

- Up to **5 users**, each added by hand in the Spotify Developer Dashboard (User Management). The app owner needs **Spotify Premium**.
- No `popularity` or `followers` fields, no bulk fetches (`GET /tracks?ids=`), search returns at most 10 results.
- No Audio Features, Audio Analysis, Recommendations or Related Artists (closed to new apps since 27 Nov 2024).
- Getting out of development mode ("extended quota") is now only for registered businesses with a launched service and reportedly 250,000+ monthly users. Plan as if this app stays a personal tool for you and a few friends.

---

## Phase 1: Foundations (do these first)

### 1.1 Drop-in data export (size S)
Today the export files sit in `public/`. That works locally, but any deploy would publish them.

- Add a file picker / drop zone on Insights (`<input type="file" multiple accept=".json">`).
- Read files with `file.text()` → `JSON.parse` → the existing `computeInsights()`. Nothing leaves the browser.
- Optional: keep the parsed plays in IndexedDB so you only drop the files once per browser.
- Delete `src/exportData.js` and its `shortcut:` comment once this ships.

### 1.2 Stay logged in (size S)
The PKCE token response already includes a `refresh_token`. We throw it away, so you are logged out after an hour.

- In `authService.js`, store `refresh_token` and `expires_in`.
- Before a call (or on a 401), POST to `https://accounts.spotify.com/api/token` with `grant_type=refresh_token`, `refresh_token`, `client_id`.
- Spotify may return a new refresh token; always save the latest one.

### 1.3 Cache per time range (size S)
Switching pages refetches the same top lists. Keep a small in-memory cache keyed by `endpoint + range` in `spotifyApi.js`, cleared on logout.

### 1.4 Deploy (size S)
Any static host works (Netlify, Vercel, Cloudflare Pages, GitHub Pages). Add the `https://` address as a second Redirect URI in the dashboard and set `REACT_APP_REDIRECT_URI` for the production build. Do this only after 1.1, so no personal files ship.

---

## Phase 2: Your full history (size S–M)

The "Account data" export only covers the last year and has no track IDs. The **Extended streaming history** export covers your whole account and has much richer rows.

Fields you get per play (check against your own files; Spotify has changed names before):

| Field | Use |
|---|---|
| `ts` | exact end time (UTC) → heatmap, streaks, "on this day" |
| `ms_played` | real listening time |
| `spotify_track_uri` | **the track ID**: unlocks Song DNA for your whole history and lets plays join API data |
| `master_metadata_track_name`, `_album_artist_name`, `_album_album_name` | names |
| `skipped`, `reason_start`, `reason_end` | skip rate, songs you always skip |
| `shuffle` | how much you listen on shuffle |
| `platform` | which devices you listen on |
| `ip_addr`, `conn_country` | **private**: never display, never commit, drop on import |

Build steps:

1. Teach the importer (1.1) to recognise both formats (`endTime` vs `ts`).
2. Extend `computeInsights()`: years view, skip rate, shuffle share, devices, first-ever play of your top artists. Add a test per new number in `stats.test.js`.
3. De-duplicate on `ts + spotify_track_uri` when files overlap.

---

## Phase 3: Song DNA (size M)

Spotify's Audio Features endpoint is closed to this app. **ReccoBeats** (free, no API key) returns the same fields by Spotify track ID. It was tested in Nov 2026 from `127.0.0.1:3000`:

```
GET https://api.reccobeats.com/v1/audio-features?ids=<spotify track id>,<id>,...
→ danceability, energy, valence, tempo, key, mode, acousticness, instrumentalness, speechiness, liveness, loudness
```

1. Add `getAudioFeatures(ids)` in a new `src/reccobeats.js` (keep third-party calls out of `spotifyApi.js`). Batch the IDs, and cache the results in `localStorage` because features never change.
2. Page per the v3 design: mood map (scatter, any two features), radar for one track against your average, tempo and key charts. `chart.js` + `react-chartjs-2` can come back for this page only.
3. Handle missing tracks: show "no data" and leave them out of averages.
4. Risk: a third party can disappear. Keep it optional so the rest of the app still works without it.

---

## Phase 4: Discover + playlist generator (size M–L)

1. Recommendations: `GET https://api.reccobeats.com/v1/track/recommendation?seeds=<up to 5 Spotify IDs>&size=<n>`. It returns tracks with Spotify links. Quality varies by seed, so let the user change seeds.
2. Artists and albums to try: take the artists and albums of the recommended tracks. Fetch art from Spotify one album at a time (`GET /albums/{id}`), and cache it.
3. Generator: get recommendations, then audio features for them (Phase 3), then sort by distance to the slider targets (energy, danceability, mood, tempo), then save with the existing `saveAsPlaylist()`.

---

## Phase 5: stats.fm-level tracking (size L)

This is the part that makes stats.fm feel "live": exact play counts and minutes for every day since you joined, kept up to date. Spotify's API never gives play counts. stats.fm gets them by importing your extended history once and then **recording every new play itself**. You can do the same for yourself.

### How stats.fm gets its data
1. **Spotify API top lists**: the same calls this app makes.
2. **Lifetime import**: users upload the Extended streaming history (Plus feature).
3. **Ongoing sync**: their servers keep asking Spotify for each user's recently played tracks and store every play, so stats stay current after the import.
4. **Extended quota** from Spotify, so millions of users can log in. You can't get this (see the limits above), and you don't need it for yourself.

### What you need to do
1. **Request your Extended streaming history now.** spotify.com → Account → Privacy settings → tick *Extended streaming history* → Request. It can take up to 30 days, so start before you build Phase 2.
2. **Keep Premium on the account that owns the Spotify app** (development-mode rule).
3. **Choose how new plays get recorded.** Pick one:

   **Option A: Last.fm (least code).** Create a free Last.fm account, connect Spotify scrobbling in Last.fm's settings, and get a free API key at last.fm/api. From then on every play is logged by Last.fm, and `user.getRecentTracks` returns your full play log with timestamps. Downsides: another account, and plays only start counting from the day you connect.

   **Option B: your own recorder (most control).** A small Node script, run every 30 minutes by **Windows Task Scheduler** (or a free cloud cron if your PC is off a lot):
   - log in once with PKCE and keep the refresh token in a local file outside the repo,
   - call `GET /me/player/recently-played?limit=50&after=<last saved timestamp>`,
   - append new plays to a local SQLite or JSON file,
   - the web app then reads that file the same way it reads the export.
   
   Limits to know: Spotify only keeps your **last 50** plays here, and only plays of 30 seconds or more. Private sessions are not recorded. Fifty songs is roughly 2.5–3 hours of nonstop listening, so polling every 30–60 minutes doesn't miss anything. If the recorder is off longer than that during heavy listening, those plays are lost, and the next extended-history export fills the gap.

4. **Merge**: extended history (past) + recorder or Last.fm (from now on), de-duplicated on timestamp + track. Everything in Phases 2–4 then works on the merged log.

### stats.fm features and how to get each one here

| stats.fm feature | How Wavelength gets it | Phase |
|---|---|---|
| Top tracks / artists / genres | Spotify API (done) | done |
| Exact play counts and minutes, any date range | extended history + recorder or Last.fm | 2 + 5 |
| Lifetime stats since you joined | extended history | 2 |
| Listening clock / heatmap | export timestamps (done for 1 year) | done / 2 |
| Skip rate, devices, shuffle | extended history fields | 2 |
| Audio features / "mood" of your music | ReccoBeats | 3 |
| Recommendations | ReccoBeats | 4 |
| Friends, leaderboards | needs a server and other users' logins; capped at 5 users in development mode | not planned |
| Artist popularity / followers | removed from the API for apps like this | not possible |

---

## Order of work

1. Phase 1 (an evening or two each). Do 1.1 before any deploy.
2. Request the extended history export **today**, since it takes up to 30 days.
3. Phase 2 when the export arrives.
4. Phase 5 option A or B, so recording starts as early as possible.
5. Phases 3 and 4 in either order.

## Sources

- Spotify, Changes to the Web API (27 Nov 2024): https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api
- Spotify, February 2026 migration guide: https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
- Spotify, February 2026 changelog: https://developer.spotify.com/documentation/web-api/references/changes/february-2026
- Spotify, Updating the criteria for Web API extended access (Apr 2025): https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access
- TechCrunch, development mode requires Premium, 5 users (Feb 2026): https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/
- stats.fm import guide: https://support.spotistats.app/docs/import/spotify-import
- ReccoBeats docs: https://reccobeats.com/docs/documentation/Analysis/audio-features-extraction
