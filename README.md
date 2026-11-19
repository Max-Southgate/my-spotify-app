# Wavelength

Your Spotify listening, drawn like sound: top tracks, artists and genres from the Spotify Web API, plus minutes, months and a listening heatmap from your Spotify data export.

## Run it

1. In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), open your app and:
   - add the Redirect URI `http://127.0.0.1:3000/` (exactly, with the trailing slash) and save,
   - under User Management, add the Spotify email of everyone who will log in (max 5).
2. Copy `.env.example` to `.env` and fill in your Client ID.
3. Optional, for the Insights page: copy the `StreamingHistory_music_*.json` files from your Spotify "Account data" export into `public/Spotify Account Data/`. That folder is git-ignored.
4. `npm install`, then `npm start`, and open http://127.0.0.1:3000 (not `localhost`; Spotify rejects it).

`npm test` runs the tests for the stats logic (`src/stats.test.js`).

## Docs

- `docs/ROADMAP.md`: what to build next, and how to get stats.fm-level data.
- `design/wireframes-v3.html`: the design this app follows. Part one is built; part two is the roadmap.
