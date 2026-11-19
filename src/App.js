import React, { useCallback, useEffect, useState } from 'react';
import { getToken, logout } from './authService';
import { loadStreamingHistory } from './exportData';
import { computeInsights } from './stats';
import { Sidebar } from './ui';
import Login from './login';
import Overview from './Overview';
import TopTracks from './TopTracks';
import TopArtists from './TopArtists';
import TopGenres from './TopGenres';
import Insights from './Insights';

const PAGES = [
    ['overview', 'Overview', Overview],
    ['tracks', 'Top tracks', TopTracks],
    ['artists', 'Top artists', TopArtists],
    ['genres', 'Genres', TopGenres],
    ['insights', 'Insights', Insights],
];
const pageFromHash = () => (PAGES.some(([id]) => id === window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'overview');

function App() {
    const [token, setToken] = useState(null);
    const [checking, setChecking] = useState(true);
    const [page, setPage] = useState(pageFromHash);
    const [range, setRange] = useState('short_term');
    const [history, setHistory] = useState(undefined); // undefined = loading, null = no export found

    useEffect(() => { // Use a saved token, or finish the login Spotify just redirected back from
        getToken().then((t) => t && setToken(t)).catch(console.error).finally(() => setChecking(false));
    }, []);

    useEffect(() => {
        const onHash = () => setPage(pageFromHash());
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    useEffect(() => {
        if (!token) return;
        loadStreamingHistory().then((songs) => setHistory(computeInsights(songs))).catch(() => setHistory(null));
    }, [token]);

    useEffect(() => { // Each page gets its own tab title, and keyboard users land at the top of the new page
        document.title = `${PAGES.find(([id]) => id === page)[1]} · Wavelength`;
        window.scrollTo(0, 0);
    }, [page]);

    const onExpired = useCallback(() => { // Expired token: forget it and show the login screen again
        logout();
        setToken(null);
    }, []);

    if (checking) return null;
    if (!token) return <Login />;

    const Page = PAGES.find(([id]) => id === page)[2];
    return (
        <div className="app">
            <Sidebar pages={PAGES} active={page} onLogout={onExpired} />
            <main className="main" id="main">
                <Page token={token} range={range} setRange={setRange} history={history} onExpired={onExpired} />
            </main>
        </div>
    );
}

export default App;
