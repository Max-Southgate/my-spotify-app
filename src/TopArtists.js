import React from 'react';
import { getTopArtists, getTopTracks } from './spotifyApi';
import { useLoad, PageHead, RangeSwitch, Status, Cd, CaseStack, RANGE_TEXT } from './ui';

function TopArtists({ token, range, setRange, onExpired }) {
    const state = useLoad(() => Promise.all([getTopArtists(token, range), getTopTracks(token, range)]), [token, range], onExpired);
    const [artists, tracks] = state.data || [];
    // "N of your top tracks": Spotify removed follower counts and popularity, this is what we can count ourselves.
    const inTopTracks = (id) => tracks.filter((t) => t.artists.some((a) => a.id === id)).length;
    const top = artists?.[0];

    return (
        <>
            <PageHead title="Top artists"><RangeSwitch range={range} setRange={setRange} /></PageHead>
            {!state.data ? <Status state={state} what="your top artists" /> : !top ? <p className="status">Not enough listening yet for this time range.</p> : (
                <>
                    <section className="tile hero-feature" aria-label="Your number one artist">
                        <CaseStack images={top.images} size={170} />
                        <div className="hero-feature-text">
                            <p className="label accent">#01 · {RANGE_TEXT[range]}</p>
                            <h2 className="hero-name"><a href={top.external_urls.spotify} target="_blank" rel="noopener noreferrer">{top.name}</a></h2>
                            {top.genres.length > 0 && <div className="chips">{top.genres.slice(0, 3).map((g) => <span className="pill" key={g}>{g}</span>)}</div>}
                            <span className="muted">{inTopTracks(top.id)} of your top {tracks.length} tracks</span>
                        </div>
                    </section>
                    <div className="card-grid">
                        {artists.slice(0, 20).map((a, i) => (
                            <a className="media-card" key={a.id} href={a.external_urls.spotify} target="_blank" rel="noopener noreferrer">
                                <Cd images={a.images} size={120} />
                                <span className="card-rank"><span className="rank">#{String(i + 1).padStart(2, '0')}</span></span>
                                <b>{a.name}</b>
                                {a.genres[0] && <span className="pill">{a.genres[0]}</span>}
                                <span className="muted small">{inTopTracks(a.id)} top tracks</span>
                            </a>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

export default TopArtists;
