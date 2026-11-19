const spotifyFetch = async (token, path, options = {}) => {
    const response = await fetch(`https://api.spotify.com/v1/${path}`, {
        ...options,
        headers: { Authorization: `Bearer ${token}`, ...(options.body && { 'Content-Type': 'application/json' }) },
    });
    if (!response.ok) {
        const error = new Error(`Spotify request failed (${response.status}): ${path}`);
        error.status = response.status; // 401 = token expired, App sends the user back to login
        throw error;
    }
    return response.status === 204 ? null : response.json();
};

// Max 50 per Spotify. Callers slice what they show.
export const getTopTracks = async (token, timeRange, limit = 50) =>
    (await spotifyFetch(token, `me/top/tracks?time_range=${timeRange}&limit=${limit}`)).items;

export const getTopArtists = async (token, timeRange, limit = 50) =>
    (await spotifyFetch(token, `me/top/artists?time_range=${timeRange}&limit=${limit}`)).items;

export const getRecentPlays = async (token, limit = 6) =>
    (await spotifyFetch(token, `me/player/recently-played?limit=${limit}`)).items;

export const findArtist = async (token, name) => {
    const data = await spotifyFetch(token, `search?q=${encodeURIComponent(name)}&type=artist&limit=1`);
    return data.artists?.items[0] || null;
};

// Needs the playlist-modify-private scope (Feb 2026 endpoints: /me/playlists and /playlists/{id}/items).
export const saveAsPlaylist = async (token, name, description, uris) => {
    const playlist = await spotifyFetch(token, 'me/playlists', {
        method: 'POST',
        body: JSON.stringify({ name, description, public: false }),
    });
    await spotifyFetch(token, `playlists/${playlist.id}/items`, { method: 'POST', body: JSON.stringify({ uris }) });
    return playlist;
};
