const spotifyGet = async (token, path) => {
    const response = await fetch(`https://api.spotify.com/v1/${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const error = new Error(`Spotify request failed (${response.status}): ${path}`);
        error.status = response.status; // 401 = token expired, App sends the user back to login
        throw error;
    }
    return response.json();
};

export const getTopTracks = async (token, timeRange) =>
    (await spotifyGet(token, `me/top/tracks?time_range=${timeRange}&limit=10`)).items;

export const getTopArtists = async (token, timeRange) =>
    (await spotifyGet(token, `me/top/artists?time_range=${timeRange}&limit=10`)).items;

export const getRecentPlays = async (token) =>
    (await spotifyGet(token, 'me/player/recently-played?limit=10')).items;

export const getTopGenres = async (token, timeRange) => {
    const data = await spotifyGet(token, `me/top/artists?time_range=${timeRange}&limit=50`);

    const genreCount = {};

    data.items.forEach(artist => { // Iterate through each artist and their genres
        artist.genres.forEach(genre => {
            genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
    });

    return Object.entries(genreCount) // Convert the genreCount object to an array of [genre, count] pairs
        .sort((a, b) => b[1] - a[1])
        .map(([genre, count]) => ({ genre, count }));
};

export const getArtistDetails = async (token, artistName) => {
    const data = await spotifyGet(token, `search?q=${encodeURIComponent(artistName)}&type=artist&limit=2`);

    if (data.artists && data.artists.items.length > 0) {
        return data.artists.items[0];
    }

    throw new Error('Artist not found');
};
