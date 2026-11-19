// Pure data helpers: no React, no fetch, so they can be unit tested.

export const MIN_PLAY_MS = 30000; // Spotify counts a stream from 30 seconds

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Export times look like "2024-03-05 18:42" and are UTC.
const toDate = (endTime) => new Date(endTime.replace(' ', 'T') + ':00Z');
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const shortYear = (y) => `'${String(y).slice(2)}`;

// Turns the streaming-history export into everything the Insights and Overview pages show.
export function computeInsights(songs) {
    if (!songs.length) return null;

    let totalMs = 0;
    let plays = 0;
    const artists = {}; // name -> { plays, ms, songs: { track -> plays } }
    const tracks = {}; // "artist - track" -> { name, artist, plays }
    const months = {}; // "2024-03" -> ms
    const heat = Array.from({ length: 7 }, () => Array(24).fill(0)); // [Mon..Sun][hour] -> ms
    let first = null;
    let last = null;

    for (const { endTime, artistName, trackName, msPlayed } of songs) {
        const d = toDate(endTime);
        if (!first || d < first) first = d;
        if (!last || d > last) last = d;
        totalMs += msPlayed;
        months[monthKey(d)] = (months[monthKey(d)] || 0) + msPlayed;
        heat[(d.getDay() + 6) % 7][d.getHours()] += msPlayed;

        const artist = (artists[artistName] ||= { plays: 0, ms: 0, songs: {} });
        artist.ms += msPlayed;
        const key = `${artistName} - ${trackName}`;
        const track = (tracks[key] ||= { name: trackName, artist: artistName, plays: 0 });

        if (msPlayed >= MIN_PLAY_MS) {
            plays += 1;
            artist.plays += 1;
            artist.songs[trackName] = (artist.songs[trackName] || 0) + 1;
            track.plays += 1;
        }
    }

    // Every month from first to last, including silent ones, so gaps show as gaps.
    const monthList = [];
    for (let y = first.getFullYear(), m = first.getMonth(); y < last.getFullYear() || (y === last.getFullYear() && m <= last.getMonth()); m === 11 ? (y++, m = 0) : m++) {
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        const edge = monthList.length === 0 || m === 0;
        monthList.push({ key, label: MONTH_NAMES[m] + (edge ? ` ${shortYear(y)}` : ''), minutes: Math.round((months[key] || 0) / 60000) });
    }
    monthList[monthList.length - 1].label = `${MONTH_NAMES[last.getMonth()]} ${shortYear(last.getFullYear())}`;

    const [topArtistName, topArtist] = Object.entries(artists).sort((a, b) => b[1].ms - a[1].ms)[0];
    const topSong = Object.values(tracks).sort((a, b) => b.plays - a.plays)[0];

    let peak = { day: 0, hour: 0, ms: -1 };
    heat.forEach((row, day) => row.forEach((ms, hour) => { if (ms > peak.ms) peak = { day, hour, ms }; }));

    return {
        from: first,
        to: last,
        totalMinutes: Math.round(totalMs / 60000),
        plays,
        uniqueArtists: Object.keys(artists).length,
        uniqueTracks: Object.keys(tracks).length,
        months: monthList,
        heat: heat.map((row) => row.map((ms) => Math.round(ms / 60000))),
        peak,
        topSong,
        topArtist: {
            name: topArtistName,
            plays: topArtist.plays,
            minutes: Math.round(topArtist.ms / 60000),
            share: totalMs ? topArtist.ms / totalMs : 0,
            songs: Object.entries(topArtist.songs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
        },
    };
}

// How many of the given artists carry each genre, most common first.
export function genresFromArtists(artists) {
    const count = {};
    artists.forEach((artist) => (artist.genres || []).forEach((g) => { count[g] = (count[g] || 0) + 1; }));
    return Object.entries(count).sort((a, b) => b[1] - a[1]).map(([genre, n]) => ({ genre, count: n }));
}

// Broad families for Spotify's very specific genre names, matched by keyword. Checked in this order, so
// "garage rock" is rock but "uk garage" is electronic, and "pop" is the catch-all last.
export const FAMILIES = [
    ['rock', 'Rock', ['rock', 'punk', 'metal', 'grunge', 'shoegaze', 'emo', 'hardcore']],
    ['hiphop', 'Hip-hop & R&B', ['hip hop', 'rap', 'r&b', 'soul', 'trap', 'drill', 'grime', 'funk']],
    ['electronic', 'Electronic', ['house', 'techno', 'edm', 'electro', 'garage', 'drum and bass', 'dubstep', 'trance', 'dance', 'jungle', 'ambient']],
    ['indie', 'Indie & alt', ['indie', 'alternative', 'lo-fi', 'bedroom']],
    ['folk', 'Folk & jazz', ['folk', 'acoustic', 'singer-songwriter', 'country', 'americana', 'jazz', 'classical', 'blues']],
    ['pop', 'Pop', ['pop']],
];

export function familyOf(genre) {
    const g = genre.toLowerCase();
    const family = FAMILIES.find(([, , words]) => words.some((w) => g.includes(w)));
    return family ? family[0] : 'other';
}

// Share of your artists (that have any genre) in each family: the "stat spread".
export function familySpread(artists) {
    const tagged = artists.filter((a) => a.genres?.length);
    return FAMILIES.map(([id, label]) => ({
        id,
        label,
        share: tagged.length ? tagged.filter((a) => a.genres.some((g) => familyOf(g) === id)).length / tagged.length : 0,
    }));
}

// Two genres are similar when the same artists carry both. Returns { a, b, shared } for each linked pair.
export function genreLinks(artists, names) {
    const wanted = new Set(names);
    const shared = new Map();
    artists.forEach((artist) => {
        const gs = [...new Set(artist.genres || [])].filter((g) => wanted.has(g)).sort();
        gs.forEach((x, i) => gs.slice(i + 1).forEach((y) => {
            const key = `${x}\u0000${y}`;
            shared.set(key, (shared.get(key) || 0) + 1);
        }));
    });
    return [...shared].map(([key, n]) => { const [a, b] = key.split('\u0000'); return { a, b, shared: n }; });
}

// Greedy walk: each next genre is the one most linked to the previous; ties keep the given order.
export function orderBySimilarity(names, links) {
    const sim = (x, y) => links.find((l) => (l.a === x && l.b === y) || (l.a === y && l.b === x))?.shared || 0;
    const rest = [...names];
    const order = rest.length ? [rest.shift()] : [];
    while (rest.length) {
        const last = order[order.length - 1];
        let best = 0;
        rest.forEach((n, i) => { if (sim(last, n) > sim(last, rest[best])) best = i; });
        order.push(rest.splice(best, 1)[0]);
    }
    return order;
}

// Wheel order: families stay together like a colour wheel, similar genres sit side by side within each.
export const wheelOrder = (names, links) =>
    [...FAMILIES.map(([id]) => id), 'other'].flatMap((id) => orderBySimilarity(names.filter((n) => familyOf(n) === id), links));

// Rank change of a track between this list and a longer-range list: 'new', 0, or +/- places (positive = climbed).
export function rankMovement(id, index, compareList) {
    if (!compareList) return null;
    const before = compareList.findIndex((t) => t.id === id);
    return before === -1 ? 'new' : before - index;
}

export function timeAgo(iso, now = Date.now()) {
    const min = Math.round((now - new Date(iso)) / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min} min ago`;
    if (min < 60 * 24) return `${Math.round(min / 60)} h ago`;
    return `${Math.round(min / 1440)} d ago`;
}

export const formatLength = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const formatRange = (from, to) => `${MONTH_NAMES[from.getMonth()]} ${shortYear(from.getFullYear())} – ${MONTH_NAMES[to.getMonth()]} ${shortYear(to.getFullYear())}`;
