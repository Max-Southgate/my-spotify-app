// Reads StreamingHistory_music_0.json, _1.json, ... from public/Spotify Account Data/ until one is missing.
// shortcut: files live in public/ (git-ignored) and are only for running locally; replace with a file picker before deploying (see docs/ROADMAP.md).
export async function loadStreamingHistory() {
    const songs = [];
    for (let i = 0; ; i++) {
        const response = await fetch(`/Spotify Account Data/StreamingHistory_music_${i}.json`);
        // The dev server answers missing files with index.html, so check the type too.
        if (!response.ok || !(response.headers.get('content-type') || '').includes('json')) break;
        songs.push(...(await response.json()));
    }
    return songs;
}
