import React from 'react';
import { familyOf, wheelOrder } from './stats';

// Family colours: categories need distinct hues, so this is the one place the palette widens beyond the level scale.
export const FAMILY_COLORS = { rock: '#ff5f6d', hiphop: '#ffb547', electronic: '#38bdf8', indie: '#4fd68f', folk: '#a46bff', pop: '#f052c8', other: '#8a90ad' };

const anchor = (cos) => (cos > 0.2 ? 'start' : cos < -0.2 ? 'end' : 'middle');

// Genres round a circle, grouped by family; curves join genres that share artists (thicker = more shared).
export function GenreWheel({ genres, links, selected, onSelect }) {
    const W = 640, H = 470, cx = 320, cy = 235, R = 160;
    const names = wheelOrder(genres.map((g) => g.genre), links);
    const count = Object.fromEntries(genres.map((g) => [g.genre, g.count]));
    const maxCount = Math.max(1, ...genres.map((g) => g.count));
    const maxShared = Math.max(1, ...links.map((l) => l.shared));
    const pos = Object.fromEntries(names.map((n, i) => {
        const t = -Math.PI / 2 + (i / names.length) * 2 * Math.PI;
        return [n, { x: cx + R * Math.cos(t), y: cy + R * Math.sin(t), t }];
    }));

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="wheel" role="group" aria-label="Genre wheel. Genres that share artists are linked.">
            <circle cx={cx} cy={cy} r={R} className="wheel-ring" />
            {links.map((l) => {
                const a = pos[l.a], b = pos[l.b], on = l.a === selected || l.b === selected, k = l.shared / maxShared;
                return <path key={`${l.a}|${l.b}`} d={`M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`} fill="none"
                    stroke={on ? FAMILY_COLORS[familyOf(selected)] : '#a3a9c4'} strokeOpacity={on ? 0.4 + 0.55 * k : 0.08 + 0.12 * k} strokeWidth={1 + 4 * k} />;
            })}
            {names.map((n) => {
                const p = pos[n], on = n === selected, r = 5 + (9 * count[n]) / maxCount, d = R + r + 10;
                const select = () => onSelect(n);
                return (
                    <g key={n} className={`wheel-node${on ? ' on' : ''}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${n}, ${count[n]} artists`}
                        onClick={select} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } }}>
                        <circle cx={p.x} cy={p.y} r={r} fill={FAMILY_COLORS[familyOf(n)]} />
                        <text x={cx + d * Math.cos(p.t)} y={cy + d * Math.sin(p.t)} dy="0.35em" textAnchor={anchor(Math.cos(p.t))}>{n.length > 18 ? `${n.slice(0, 17)}…` : n}</text>
                    </g>
                );
            })}
        </svg>
    );
}

// Radar ("stat spread") of genre families. series: [{ label, color, dashed, values: familySpread() }]
export function SoundSpread({ series }) {
    const W = 460, H = 300, cx = 230, cy = 150, R = 100;
    const fams = series[0].values, n = fams.length;
    const max = Math.max(0.2, ...series.flatMap((s) => s.values.map((v) => v.share)));
    const at = (i, k) => { const t = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + R * k * Math.cos(t), cy + R * k * Math.sin(t)]; };
    const ring = (k) => fams.map((_, i) => at(i, k).join(',')).join(' ');

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="radar" role="img"
            aria-label={`Genre family spread: ${fams.map((f) => `${f.label} ${Math.round(f.share * 100)}%`).join(', ')}`}>
            {[0.25, 0.5, 0.75, 1].map((k) => <polygon key={k} points={ring(k)} className="radar-ring" />)}
            {fams.map((_, i) => { const [x, y] = at(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="radar-ring" />; })}
            {[...series].reverse().map((s) => (
                <polygon key={s.label} points={s.values.map((v, i) => at(i, v.share / max).join(',')).join(' ')}
                    fill={s.color} fillOpacity={s.dashed ? 0.05 : 0.22} stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" />
            ))}
            {fams.map((f, i) => {
                const [x, y] = at(i, 1 + 16 / R), t = -Math.PI / 2 + (i * 2 * Math.PI) / n;
                return (
                    <text key={f.id} x={x} y={y} dy="0.35em" textAnchor={anchor(Math.cos(t))} className="radar-label">
                        <tspan fill={FAMILY_COLORS[f.id]}>●</tspan> {f.label} <tspan className="radar-val">{Math.round(f.share * 100)}%</tspan>
                    </text>
                );
            })}
        </svg>
    );
}
