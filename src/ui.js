import React, { useEffect, useState } from 'react';

export const RANGES = [['short_term', '4 weeks'], ['medium_term', '6 months'], ['long_term', 'All time']];
export const RANGE_TEXT = { short_term: 'last 4 weeks', medium_term: 'last 6 months', long_term: 'all time' };
// Sizes are given in design pixels (at 16px = 1rem) and rendered in rem, so they scale with the window like the CSS.
export const rem = (px) => `${px / 16}rem`;
export const LONGER_RANGE = { short_term: 'medium_term', medium_term: 'long_term', long_term: null };

// Runs an async loader when deps change. 401 sends the user back to login; other errors are shown.
export function useLoad(load, deps, onExpired) {
    const [state, setState] = useState({ data: null, error: null, loading: true });
    useEffect(() => {
        let live = true;
        setState({ data: null, error: null, loading: true });
        load()
            .then((data) => live && setState({ data, error: null, loading: false }))
            .catch((error) => {
                if (!live) return;
                if (error.status === 401) onExpired();
                else setState({ data: null, error, loading: false });
            });
        return () => { live = false; };
    }, deps); // eslint-disable-line react-hooks/exhaustive-deps -- deps are chosen by the caller
    return state;
}

// Level scale: green -> amber -> red. Used by the nav icons.
const STOPS = [[79, 214, 143], [255, 181, 71], [255, 95, 109]];
export function ramp(t, alpha = 1) {
    const x = Math.min(1, Math.max(0, t)) * (STOPS.length - 1);
    const i = Math.min(STOPS.length - 2, Math.floor(x));
    const c = STOPS[i].map((v, k) => Math.round(v + (STOPS[i + 1][k] - v) * (x - i)));
    return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

const ICONS = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    tracks: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    artists: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></>,
    genres: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
    insights: <path d="M2 12h3l3-8 4 16 3-10 2 2h5" />,
    external: <path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />,
};

export function Icon({ name, size = 20 }) {
    return (
        <svg viewBox="0 0 24 24" style={{ width: rem(size), height: rem(size) }} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[name]}
        </svg>
    );
}

// Active nav icon: its slice of the level scale, top to bottom of the menu.
function NavIcon({ name, index, count, on }) {
    if (!on) return <Icon name={name} />;
    const id = `nav-grad-${name}`;
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ width: rem(20), height: rem(20), filter: `drop-shadow(0 0 6px ${ramp(index / (count - 1), 0.6)})` }}>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={ramp(index / count)} />
                    <stop offset="1" stopColor={ramp((index + 1) / count)} />
                </linearGradient>
            </defs>
            {ICONS[name]}
        </svg>
    );
}

export function BrandMark({ size = 24 }) {
    return (
        <svg viewBox="0 0 24 24" style={{ width: rem(size), height: rem(size) }} aria-hidden="true" className="brand-mark">
            <rect x="2" y="9" width="3" height="6" rx="1.5" /><rect x="7" y="5" width="3" height="14" rx="1.5" />
            <rect x="12" y="2" width="3" height="20" rx="1.5" /><rect x="17" y="7" width="3" height="10" rx="1.5" />
        </svg>
    );
}

export function Sidebar({ pages, active, onLogout }) {
    return (
        <nav className="side" aria-label="Main">
            <div className="brand"><BrandMark />Wavelength</div>
            {pages.map(([id, label], i) => (
                <a key={id} href={`#${id}`} className={`nav-item${id === active ? ' on' : ''}`} aria-current={id === active ? 'page' : undefined}>
                    <NavIcon name={id} index={i} count={pages.length} on={id === active} />
                    <span>{label}</span>
                </a>
            ))}
            <button type="button" className="logout" onClick={onLogout}>Log out</button>
        </nav>
    );
}

export function PageHead({ title, children }) {
    return <header className="topbar"><h1>{title}</h1>{children && <div className="topbar-actions">{children}</div>}</header>;
}

export function RangeSwitch({ range, setRange }) {
    return (
        <div className="switch" role="group" aria-label="Time range">
            {RANGES.map(([value, label]) => (
                <button key={value} type="button" aria-pressed={range === value} className={range === value ? 'on' : ''} onClick={() => setRange(value)}>{label}</button>
            ))}
        </div>
    );
}

export function Status({ state, what }) {
    if (state.loading) return <p className="status">Loading {what}…</p>;
    if (state.error) return <p className="status error">Couldn't load {what}. Check your connection and refresh the page.</p>;
    return null;
}

// Smallest Spotify image that is still sharp at this size.
const pick = (images, size) => {
    if (!images?.length) return null;
    const sharp = images.filter((img) => !img.width || img.width >= size * 3);
    return (sharp[sharp.length - 1] || images[0]).url;
};

// Largest image, for art that fills a whole panel.
export const coverUrl = (images) => images?.[0]?.url;

export function Art({ images, size, alt = '' }) {
    const url = pick(images, size);
    return url
        ? <img className="art" src={url} width={size} height={size} style={{ width: rem(size), height: rem(size) }} alt={alt} loading="lazy" />
        : <div className="art empty" style={{ width: rem(size), height: rem(size) }} aria-hidden="true" />;
}

export function Cd({ images, size, spin = false }) {
    const url = pick(images, size);
    return <div className={`cd${spin ? ' spin' : ''}${url ? '' : ' blank'}`} style={{ width: rem(size), '--cover': url ? `url("${url}")` : undefined }} aria-hidden="true" />;
}

export function CaseStack({ images, size }) {
    const url = pick(images, size);
    return (
        <div className="stack" style={{ width: rem(size * 1.38), height: rem(size * 1.08) }} aria-hidden="true">
            <div className="case" style={{ width: rem(size), '--cover': url ? `url("${url}")` : undefined }} />
            <Cd images={images} size={size * 0.92} spin />
        </div>
    );
}

export function Meter({ value, segments = 20, label }) {
    const lit = Math.round(value * segments);
    return (
        <span className="meter" role="img" aria-label={label}>
            {Array.from({ length: segments }, (_, i) => {
                const zone = i / segments >= 0.82 ? ' clip' : i / segments >= 0.6 ? ' hot' : '';
                return <i key={i} className={i < lit ? `on${zone}` : ''} />;
            })}
        </span>
    );
}

// Horizontal level-meter bars. Colour runs green -> amber -> red across the full track, so colour always matches length.
export function GenreBars({ items, mini = false }) {
    const max = Math.max(1, ...items.map((g) => g.count));
    return (
        <ol className={`hbars${mini ? ' mini' : ''}`}>
            {items.map(({ genre, count }) => (
                <li key={genre}>
                    <span className="name" title={genre}>{genre}</span>
                    <span className="track" aria-hidden="true"><i style={{ '--v': Math.max(0.02, count / max) }} /></span>
                    <span className="n" aria-label={`${count} artists`}>{count}</span>
                </li>
            ))}
        </ol>
    );
}

export function MonthBars({ months }) {
    const max = Math.max(1, ...months.map((m) => m.minutes));
    return (
        <div className="months" role="img" aria-label={`Minutes listened per month, highest ${max.toLocaleString()}`}>
            {months.map((m) => (
                <div className={`m${m.minutes === max ? ' max' : ''}`} key={m.key} title={`${m.label}: ${m.minutes.toLocaleString()} min`}>
                    <div className="slot"><i style={{ '--h': `${Math.max(2, Math.round((m.minutes / max) * 100))}%` }} /></div>
                    <span className="lab">{m.label}</span><span className="val">{(m.minutes / 1000).toFixed(1)}k</span>
                </div>
            ))}
        </div>
    );
}

export function Movement({ value }) {
    if (value === null || value === undefined) return <span className="move same">–</span>;
    if (value === 'new') return <span className="move new">NEW</span>;
    if (value === 0) return <span className="move same" aria-label="no change">–</span>;
    const up = value > 0;
    return <span className={`move ${up ? 'up' : 'down'}`} aria-label={`${up ? 'up' : 'down'} ${Math.abs(value)} places`}>{up ? '▲' : '▼'} {Math.abs(value)}</span>;
}

export const SpotifyLink = ({ url, label = 'Open in Spotify' }) => (
    <a className="open-link" href={url} target="_blank" rel="noopener noreferrer">{label} <Icon name="external" size={14} /></a>
);
