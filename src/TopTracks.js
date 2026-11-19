import React, { useState } from 'react';
import { getTopTracks, saveAsPlaylist } from './spotifyApi';
import { rankMovement, formatLength } from './stats';
import { useLoad, PageHead, RangeSwitch, Status, Art, CaseStack, Movement, SpotifyLink, RANGE_TEXT, LONGER_RANGE } from './ui';

const SHOWN = 20;
const artistNames = (track) => track.artists.map((a) => a.name).join(', ');

function SaveButton({ token, tracks, range, onExpired }) {
    const [save, setSave] = useState({ status: 'idle' });
    const onClick = async () => {
        setSave({ status: 'saving' });
        const month = new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        try {
            const playlist = await saveAsPlaylist(token, `Top tracks · ${RANGE_TEXT[range]} · ${month}`, 'Made with Wavelength', tracks.map((t) => t.uri));
            setSave({ status: 'saved', url: playlist.external_urls?.spotify });
        } catch (error) {
            if (error.status === 401) return onExpired();
            setSave({ status: 'error', message: error.status === 403 ? 'Log out and back in to allow saving playlists.' : "Couldn't save the playlist. Try again." });
        }
    };
    if (save.status === 'saved') return save.url ? <SpotifyLink url={save.url} label="Saved · open playlist" /> : <span className="muted">Saved to your library</span>;
    return (
        <span className="save">
            <button type="button" className="btn-ghost" onClick={onClick} disabled={save.status === 'saving'}>{save.status === 'saving' ? 'Saving…' : `Save top ${tracks.length} as playlist`}</button>
            {save.status === 'error' && <span className="error small" role="alert">{save.message}</span>}
        </span>
    );
}

function TopTracks({ token, range, setRange, onExpired }) {
    const longer = LONGER_RANGE[range];
    const state = useLoad(() => Promise.all([getTopTracks(token, range), longer ? getTopTracks(token, longer) : null]), [token, range], onExpired);
    const [all, compare] = state.data || [];
    const tracks = all?.slice(0, SHOWN);
    const top = tracks?.[0];

    return (
        <>
            <PageHead title="Top tracks">
                {tracks?.length > 0 && <SaveButton key={range} token={token} tracks={tracks} range={range} onExpired={onExpired} />}
                <RangeSwitch range={range} setRange={setRange} />
            </PageHead>
            {!state.data ? <Status state={state} what="your top tracks" /> : !top ? <p className="status">Not enough listening yet for this time range.</p> : (
                <>
                    <section className="tile hero-feature" aria-label="Your number one track">
                        <CaseStack images={top.album.images} size={170} />
                        <div className="hero-feature-text">
                            <p className="label accent">#01 · {RANGE_TEXT[range]}</p>
                            <h2 className="hero-name"><a href={top.external_urls.spotify} target="_blank" rel="noopener noreferrer">{top.name}</a></h2>
                            <span>{artistNames(top)} · <span className="muted">{top.album.name}</span></span>
                            <div className="chips">
                                {compare && <span className="pill"><Movement value={rankMovement(top.id, 0, compare)} /> vs {RANGE_TEXT[longer]}</span>}
                                <span className="pill">{top.album.release_date?.slice(0, 4)}</span>
                                <span className="pill">{formatLength(top.duration_ms)}</span>
                            </div>
                            <SpotifyLink url={top.external_urls.spotify} />
                        </div>
                    </section>
                    <div className="card-grid">
                        {tracks.map((t, i) => (
                            <a className="media-card" key={t.id} href={t.external_urls.spotify} target="_blank" rel="noopener noreferrer" aria-label={`#${i + 1} ${t.name} by ${artistNames(t)}, open in Spotify`}>
                                <Art images={t.album.images} size={120} />
                                <span className="card-rank"><span className="rank">#{String(i + 1).padStart(2, '0')}</span>{compare && <Movement value={rankMovement(t.id, i, compare)} />}</span>
                                <b>{t.name}</b>
                                <span className="ellipsis">{artistNames(t)}</span>
                                <span className="muted small ellipsis">{t.album.name}</span>
                                <span className="muted small">{t.album.release_date?.slice(0, 4)} · {formatLength(t.duration_ms)}</span>
                            </a>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

export default TopTracks;
