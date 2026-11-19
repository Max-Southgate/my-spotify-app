import React from 'react';
import { findArtist } from './spotifyApi';
import { DAYS, DAY_NAMES, formatRange } from './stats';
import { useLoad, PageHead, Cd, Meter, MonthBars } from './ui';

function Heatmap({ heat }) {
    const max = Math.max(1, ...heat.flat());
    return (
        <div className="heat" role="img" aria-label="Minutes listened by hour of day and weekday">
            <span />
            {Array.from({ length: 24 }, (_, h) => <span className="hr" key={h}>{h % 3 === 0 ? String(h).padStart(2, '0') : ''}</span>)}
            {heat.map((row, d) => (
                <React.Fragment key={d}>
                    <span className="d">{DAYS[d]}</span>
                    {row.map((min, h) => <i key={h} className="c" style={{ '--v': `${Math.round((min / max) * 100)}%` }} title={`${DAYS[d]} ${String(h).padStart(2, '0')}:00 · ${min.toLocaleString()} min`} />)}
                </React.Fragment>
            ))}
        </div>
    );
}

function TopArtistCard({ token, artist, onExpired }) {
    const found = useLoad(() => findArtist(token, artist.name), [token, artist.name], onExpired);
    return (
        <section className="tile" aria-label="Most played artist">
            <p className="label">Most played artist</p>
            <div className="media"><Cd images={found.data?.images} size={60} spin /><div><b className="title-lg">{artist.name}</b><div className="muted small">{artist.plays.toLocaleString()} plays · {artist.minutes.toLocaleString()} min</div></div></div>
            <div><Meter value={artist.share} label={`${(artist.share * 100).toFixed(1)}% of your listening`} /> <b>{(artist.share * 100).toFixed(1)}%</b> <span className="muted small">of your listening</span></div>
            <ol className="song-list">{artist.songs.map((s) => <li key={s.name}>{s.name} <span className="muted">· {s.count}</span></li>)}</ol>
        </section>
    );
}

function Insights({ token, history, onExpired }) {
    if (history === undefined) return <><PageHead title="Insights" /><p className="status">Reading your data export…</p></>;
    if (!history) return (
        <>
            <PageHead title="Insights" />
            <section className="tile empty-state">
                <h2>Add your Spotify data export</h2>
                <ol>
                    <li>On spotify.com, open Account → Privacy settings and request <b>Account data</b>. Spotify emails it within a few days.</li>
                    <li>Unzip it and copy the <code>StreamingHistory_music_*.json</code> files into <code>public/Spotify Account Data/</code> in this project.</li>
                    <li>Refresh this page. The files stay on your computer; git ignores that folder.</li>
                </ol>
            </section>
        </>
    );

    const { peak } = history;
    return (
        <>
            <PageHead title="Insights"><span className="pill">From your data export · {formatRange(history.from, history.to)}</span></PageHead>
            <div className="kpis">
                <section className="tile"><p className="label">Minutes</p><span className="big">{history.totalMinutes.toLocaleString()}</span><span className="muted small">about {Math.round(history.totalMinutes / 1440)} days</span></section>
                <section className="tile"><p className="label">Plays</p><span className="big">{history.plays.toLocaleString()}</span><span className="muted small">of 30 seconds or more</span></section>
                <section className="tile"><p className="label">Artists</p><span className="big">{history.uniqueArtists.toLocaleString()}</span><span className="muted small">different artists</span></section>
                <section className="tile"><p className="label">Tracks</p><span className="big">{history.uniqueTracks.toLocaleString()}</span><span className="muted small">different tracks</span></section>
            </div>
            <section className="tile" aria-label="Minutes per month"><p className="label">Minutes per month</p><MonthBars months={history.months} /></section>
            <div className="bento">
                <section className="tile span2" aria-label="When you listen">
                    <div className="topbar">
                        <p className="label">When you listen · hour × weekday</p>
                        <div className="legend" aria-hidden="true">Less {[5, 30, 55, 80, 100].map((v) => <i key={v} style={{ '--v': `${v}%` }} />)} More</div>
                    </div>
                    <Heatmap heat={history.heat} />
                    <span className="muted small">Peak: {DAY_NAMES[peak.day]}s around {String(peak.hour).padStart(2, '0')}:00. Times are in your computer's time zone.</span>
                </section>
                <TopArtistCard token={token} artist={history.topArtist} onExpired={onExpired} />
            </div>
        </>
    );
}

export default Insights;
