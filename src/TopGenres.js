import React, { useState } from 'react';
import { getTopArtists } from './spotifyApi';
import { genresFromArtists, genreLinks, familyOf, familySpread, FAMILIES } from './stats';
import { useLoad, PageHead, RangeSwitch, Status, GenreBars, RANGE_TEXT } from './ui';
import { GenreWheel, SoundSpread, FAMILY_COLORS } from './GenreCharts';

const OTHER_RANGE = { short_term: 'long_term', medium_term: 'long_term', long_term: 'short_term' };
const familyLabel = (id) => FAMILIES.find((f) => f[0] === id)?.[1] || 'Other';

function GenreDetail({ genre, artists, links }) {
    const tagged = artists.filter((a) => a.genres.includes(genre));
    const similar = links.filter((l) => l.a === genre || l.b === genre).sort((x, y) => y.shared - x.shared).slice(0, 4)
        .map((l) => ({ name: l.a === genre ? l.b : l.a, shared: l.shared }));
    return (
        <div className="genre-detail">
            <p className="label">Selected genre</p>
            <h2>{genre}</h2>
            <span className="pill"><i className="dot" style={{ background: FAMILY_COLORS[familyOf(genre)] }} />{familyLabel(familyOf(genre))}</span>
            <p className="label">{tagged.length} of your top {artists.length} artists</p>
            <div className="chips">{tagged.map((a) => <a key={a.id} className="pill link" href={a.external_urls.spotify} target="_blank" rel="noopener noreferrer">{a.name}</a>)}</div>
            <p className="label">Closest genres</p>
            {similar.length
                ? <ul className="plain">{similar.map((s) => <li key={s.name}>{s.name} <span className="muted small">· {s.shared} shared {s.shared === 1 ? 'artist' : 'artists'}</span></li>)}</ul>
                : <p className="muted small">No other genre shares an artist with this one yet.</p>}
        </div>
    );
}

function TopGenres({ token, range, setRange, onExpired }) {
    const other = OTHER_RANGE[range];
    const state = useLoad(() => Promise.all([getTopArtists(token, range), getTopArtists(token, other)]), [token, range], onExpired);
    const [picked, setPicked] = useState(null);
    const [artists, otherArtists] = state.data || [];
    const genres = artists && genresFromArtists(artists).slice(0, 15);
    const wheelGenres = genres?.slice(0, 16);
    const links = genres ? genreLinks(artists, wheelGenres.map((g) => g.genre)) : [];
    const selected = genres?.some((g) => g.genre === picked) ? picked : genres?.[0]?.genre;

    const now = artists && familySpread(artists);
    const then = otherArtists && familySpread(otherArtists);
    const shift = now && then && now.map((f, i) => ({ label: f.label, diff: f.share - then[i].share })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];

    return (
        <>
            <PageHead title="Genres"><RangeSwitch range={range} setRange={setRange} /></PageHead>
            {!genres ? <Status state={state} what="your genres" /> : !genres.length ? (
                <p className="status">Spotify didn't return any genres for your top artists in this time range.</p>
            ) : (
                <div className="genres-page">
                    <section className="tile g-bars" aria-label="Genres">
                        <p className="label">Artists per genre · from your top {artists.length} artists</p>
                        <GenreBars items={genres} />
                    </section>
                        <section className="tile g-wheel" aria-label="Genre wheel">
                            <div className="topbar">
                                <p className="label">Genre wheel · linked when the same artists play both</p>
                                <div className="chips">{[...FAMILIES.map(([id, label]) => [id, label]), ['other', 'Other']].map(([id, label]) => <span key={id} className="pill"><i className="dot" style={{ background: FAMILY_COLORS[id] }} />{label}</span>)}</div>
                            </div>
                            <div className="wheel-layout">
                                <GenreWheel genres={wheelGenres} links={links} selected={selected} onSelect={setPicked} />
                                <GenreDetail genre={selected} artists={artists} links={links} />
                            </div>
                        </section>
                        <section className="tile g-spread" aria-label="Your sound spread">
                            <p className="label">Your sound spread · share of top artists per family</p>
                            <SoundSpread series={[
                                { label: RANGE_TEXT[range], color: '#ffb547', values: now },
                                { label: RANGE_TEXT[other], color: '#4fd68f', dashed: true, values: then },
                            ]} />
                            <div className="chips spread-foot">
                                <span className="pill"><i className="dot" style={{ background: '#ffb547' }} />{RANGE_TEXT[range]}</span>
                                <span className="pill"><i className="dot dashed" />{RANGE_TEXT[other]}</span>
                                {shift && Math.abs(shift.diff) >= 0.01 && (
                                    <span className="muted small">Biggest change: <b className="text">{shift.label}</b> {shift.diff > 0 ? 'up' : 'down'} {Math.round(Math.abs(shift.diff) * 100)} points vs {RANGE_TEXT[other]}</span>
                                )}
                            </div>
                        </section>
                </div>
            )}
        </>
    );
}

export default TopGenres;
