// Authorization Code with PKCE: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const redirectUri = process.env.REACT_APP_REDIRECT_URI;
const scope = 'user-top-read playlist-read-private playlist-read-collaborative user-read-private user-read-email user-read-recently-played';

const base64url = (bytes) =>
    btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const redirectToLogin = async () => {
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
    const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    sessionStorage.setItem('pkce_verifier', verifier);
    window.location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope,
        code_challenge_method: 'S256',
        code_challenge: challenge,
        show_dialog: 'true',
    });
};

// Returns a saved token, or trades the ?code= Spotify sent back for one. null = not logged in.
export const getToken = async () => {
    const saved = sessionStorage.getItem('token');
    if (saved) return saved;

    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) return null;
    window.history.replaceState({}, '', window.location.pathname); // a code works only once, so drop it from the URL

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: sessionStorage.getItem('pkce_verifier'),
        }),
    });
    sessionStorage.removeItem('pkce_verifier');
    if (!response.ok) throw new Error('Failed to get access token');
    const { access_token } = await response.json();
    sessionStorage.setItem('token', access_token);
    return access_token;
};

export const logout = () => sessionStorage.removeItem('token');
