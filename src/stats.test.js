import { computeInsights, genresFromArtists, rankMovement, timeAgo, familyOf, familySpread, genreLinks, orderBySimilarity, wheelOrder } from './stats';

describe('genre similarity', () => {
    const artists = [
        { genres: ['shoegaze', 'dream pop'] },
        { genres: ['shoegaze', 'dream pop', 'post-punk'] },
        { genres: ['uk garage', 'house'] },
        { genres: ['house'] },
        { genres: [] }, // no genres: ignored by the spread
    ];

    it('puts genres in families, checking specific words before "pop"', () => {
        expect(familyOf('garage rock')).toBe('rock');
        expect(familyOf('uk garage')).toBe('electronic');
        expect(familyOf('neo soul')).toBe('hiphop');
        expect(familyOf('indie pop')).toBe('indie');
        expect(familyOf('art pop')).toBe('pop');
        expect(familyOf('gregorian chant')).toBe('other');
    });

    it('counts a family once per artist, out of artists that have genres', () => {
        const spread = Object.fromEntries(familySpread(artists).map((f) => [f.id, f.share]));
        expect(spread.rock).toBe(2 / 4);
        expect(spread.pop).toBe(2 / 4);
        expect(spread.electronic).toBe(2 / 4);
        expect(spread.folk).toBe(0);
    });

    it('links genres by shared artists', () => {
        const links = genreLinks(artists, ['shoegaze', 'dream pop', 'post-punk', 'house', 'uk garage']);
        const get = (a, b) => links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))?.shared;
        expect(get('shoegaze', 'dream pop')).toBe(2);
        expect(get('post-punk', 'shoegaze')).toBe(1);
        expect(get('house', 'uk garage')).toBe(1);
        expect(get('house', 'shoegaze')).toBeUndefined();
    });

    it('orders genres so the most similar sit next to each other', () => {
        const links = [{ a: 'a', b: 'c', shared: 3 }, { a: 'c', b: 'd', shared: 1 }];
        expect(orderBySimilarity(['a', 'b', 'c', 'd'], links)).toEqual(['a', 'c', 'd', 'b']);
        expect(orderBySimilarity([], links)).toEqual([]);
    });

    it('keeps each family together on the wheel', () => {
        expect(wheelOrder(['house', 'shoegaze', 'art pop', 'post-punk'], [])).toEqual(['shoegaze', 'post-punk', 'house', 'art pop']);
    });
});

const play = (endTime, artistName, trackName, msPlayed = 180000) => ({ endTime, artistName, trackName, msPlayed });

describe('computeInsights', () => {
    const songs = [
        play('2023-11-15 12:00', 'Mira Vale', 'Intro'),
        play('2023-11-16 12:00', 'Mira Vale', 'Glass Hours'),
        play('2024-01-11 12:00', 'Ostra', 'Intro'), // same title, different artist
        play('2024-01-11 13:00', 'Ostra', 'Intro', 5000), // a skip: counts minutes, not a play
        play('2024-11-15 12:00', 'Mira Vale', 'Glass Hours'),
    ];
    const r = computeInsights(songs);

    it('returns null for no data', () => {
        expect(computeInsights([])).toBeNull();
    });

    it('counts minutes from every play but plays only from 30 seconds', () => {
        expect(r.totalMinutes).toBe(Math.round((4 * 180000 + 5000) / 60000));
        expect(r.plays).toBe(4);
    });

    it('keeps songs with the same title apart when the artist differs', () => {
        expect(r.uniqueTracks).toBe(3);
        expect(r.topSong).toMatchObject({ name: 'Glass Hours', artist: 'Mira Vale', plays: 2 });
    });

    it('keeps months of different years apart and fills silent months', () => {
        expect(r.months[0]).toMatchObject({ key: '2023-11', label: "Nov '23", minutes: 6 });
        expect(r.months).toHaveLength(13); // Nov 2023 .. Nov 2024
        expect(r.months[1]).toMatchObject({ key: '2023-12', minutes: 0 });
        expect(r.months[12]).toMatchObject({ key: '2024-11', label: "Nov '24", minutes: 3 });
    });

    it('uses real listening time for the top artist share', () => {
        expect(r.topArtist).toMatchObject({ name: 'Mira Vale', plays: 3, minutes: 9 });
        expect(r.topArtist.share).toBeCloseTo(540000 / 725000);
        expect(r.topArtist.songs[0]).toEqual({ name: 'Glass Hours', count: 2 });
    });

    it('puts plays on the right weekday (Monday first)', () => {
        const d = new Date('2023-11-15T12:00:00Z'); // a Wednesday
        expect(r.heat[(d.getDay() + 6) % 7][d.getHours()]).toBe(3);
    });
});

it('counts genres across artists, most common first', () => {
    expect(genresFromArtists([{ genres: ['house', 'uk garage'] }, { genres: ['house'] }, {}])).toEqual([
        { genre: 'house', count: 2 },
        { genre: 'uk garage', count: 1 },
    ]);
});

it('works out rank movement against a longer range', () => {
    const before = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(rankMovement('c', 0, before)).toBe(2);
    expect(rankMovement('a', 1, before)).toBe(-1);
    expect(rankMovement('z', 0, before)).toBe('new');
    expect(rankMovement('a', 0, null)).toBeNull();
});

it('formats how long ago something was played', () => {
    const now = Date.parse('2026-11-19T12:00:00Z');
    expect(timeAgo('2026-11-19T11:56:00Z', now)).toBe('4 min ago');
    expect(timeAgo('2026-11-19T09:00:00Z', now)).toBe('3 h ago');
});
