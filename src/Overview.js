import React from 'react';
import { getTopTracks, getTopArtists, getRecentPlays } from './spotifyApi';
import { genresFromArtists, rankMovement, timeAgo, formatLength } from './stats';
import { useLoad, PageHead, RangeSwitch, Status, Art, Cd, GenreBars, Movement, SpotifyLink, coverUrl, RANGE_TEXT, LONGER_RANGE } from './ui';

const artistNames = (track) => track.artists.map((a) => a.name).join(', ');

function Overview({ token, range, setRange, onExpired }) {
    const state = useLoad(() => Promise.all([
        getTopTracks(token, range),
        LONGER_RANGE[range] ? getTopTracks(token, LONGER_RANGE[range]) : null,
        getTopArtists(token, range),
        getRecentPlays(token, 6),
    ]), [token, range], onExpired);

    const [tracks, compare, artists, recent] = state.data || [];
    const top = tracks?.[0];

    return (
        <>
            <PageHead title="Overview"><RangeSwitch range={range} setRange={setRange} /></PageHead>
            <div className="bento">
                <section className="tile span2" aria-label="Top songs">
                    <div className="topbar"><p className="label">Top songs · {RANGE_TEXT[range]}</p><a className="open-link" href="#tracks">See all</a></div>
                    {tracks ? (tracks.length ? (
                        <div>
                            {tracks.slice(0, 5).map((t, i) => (
                                <a key={t.id} className="row top" href={t.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                                    <span className="rank">{i + 1}</span>
                                    <Art images={t.album.images} size={40} />
                                    <div className="clip"><div className="t">{t.name}</div><div className="a">{artistNames(t)}</div></div>
                                    {compare ? <Movement value={rankMovement(t.id, i, compare)} /> : <span />}
                                </a>
                            ))}
                        </div>
                    ) : <p className="muted">Not enough listening yet for this time range.</p>) : <Status state={state} what="your top songs" />}
                </section>

                <section className={`tile${top ? ' cover' : ''}`} style={{ '--cover': top && coverUrl(top.album.images) ? `url("${coverUrl(top.album.images)}")` : undefined }} aria-label="Your number one track">
                    <p className="label">On repeat · #1 {RANGE_TEXT[range]}</p>
                    {!state.data ? <Status state={state} what="your top track" /> : top ? (
                        <div className="cover-body">
                            <b className="cover-title">{top.name}</b>
                            <div>{artistNames(top)}</div>
                            <div className="muted small">{top.album.name} · {top.album.release_date?.slice(0, 4)}</div>
                            <div className="chips">
                                {compare && <span className="pill"><Movement value={rankMovement(top.id, 0, compare)} /> vs {RANGE_TEXT[LONGER_RANGE[range]]}</span>}
                                <span className="pill">{formatLength(top.duration_ms)}</span>
                            </div>
                            <SpotifyLink url={top.external_urls.spotify} />
                        </div>
                    ) : <p className="muted">Not enough listening yet for this time range.</p>}
                </section>

                <section className="tile span2" aria-label="Top artists">
                    <p className="label">Top artists · {RANGE_TEXT[range]}</p>
                    {artists ? (
                        <div className="cd-row">
                            {artists.slice(0, 5).map((a) => (
                                <a key={a.id} className="cd-item" href={a.external_urls.spotify} target="_blank" rel="noopener noreferrer"><Cd images={a.images} size={136} /><span>{a.name}</span></a>
                            ))}
                        </div>
                    ) : <Status state={state} what="artists" />}
                </section>

                <section className="tile" aria-label="Top genres">
                    <p className="label">Top genres</p>
                    {artists ? <GenreBars items={genresFromArtists(artists).slice(0, 6)} mini /> : <Status state={state} what="genres" />}
                </section>

                <section className="tile span3" aria-label="Recently played">
                    <p className="label">Recently played</p>
                    {recent ? (
                        <div className="two-col">
                            {recent.map(({ track, played_at }) => (
                                <a key={played_at} className="row simple" href={track.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                                    <Art images={track.album.images} size={40} />
                                    <div className="clip"><div className="t">{track.name}</div><div className="a">{artistNames(track)}</div></div>
                                    <span className="muted small">{timeAgo(played_at)}</span>
                                </a>
                            ))}
                        </div>
                    ) : <Status state={state} what="recent plays" />}
                </section>
            </div>
        </>
    );
}

export default Overview;
