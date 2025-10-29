import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

// If running in the browser on a non-localhost origin but NEXT_PUBLIC_API_BASE
// is still pointing to localhost, warn so deployment env var can be fixed.
if (typeof window !== 'undefined') {
  try {
    const host = window.location.hostname;
    if (host !== 'localhost' && API_BASE.includes('localhost')) {
      // eslint-disable-next-line no-console
      console.error('[CONFIG] NEXT_PUBLIC_API_BASE is not set for production — frontend is pointing to', API_BASE, '\nSet NEXT_PUBLIC_API_BASE in your Vercel project settings to your backend URL (including /api)');
    }
  } catch (e) { /* ignore in SSR */ }
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);

  useEffect(()=>{
    // load token/user from localStorage
    const t = localStorage.getItem('aif_token');
    const u = localStorage.getItem('aif_user');
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
  }, []);

  useEffect(()=>{ if (token) loadFriends(); }, [token]);

  function logout(){
    setToken(null); setUser(null);
    localStorage.removeItem('aif_token');
    localStorage.removeItem('aif_user');
  }

  async function api(path, method='GET', body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return res.json();
  }

  async function register(){
    const res = await api('/auth/register','POST',{ name, email, password });
    if (res.token){ persistLogin(res); } else alert(res.message || JSON.stringify(res));
  }

  async function login(){
    const res = await api('/auth/login','POST',{ email, password });
    if (res.token){ persistLogin(res); } else alert(res.message || JSON.stringify(res));
  }

  function persistLogin(res){
    setToken(res.token); setUser(res.user);
    localStorage.setItem('aif_token', res.token);
    localStorage.setItem('aif_user', JSON.stringify(res.user));
    setEmail(''); setPassword(''); setName('');
  }

  async function createFriend(fname, personality){
    const res = await api('/ai-friends','POST',{ name: fname, personality });
    if (res.friend) loadFriends(); else alert(res.message || JSON.stringify(res));
  }

  async function loadFriends(){
    const res = await api('/ai-friends');
    if (res.friends) setFriends(res.friends);
  }

  function onSelectFriend(f){ setSelectedFriend(f); }

  return (
    <div className="app-root">
  <Sidebar user={user} friends={friends} onSelectFriend={onSelectFriend} onCreateFriend={createFriend} onReload={loadFriends} onLogout={logout} />

      <main className="main-area">
        {!user && (
          <section className="auth-section">
            <h2>Register / Login</h2>
            <div className="form-row">
              <input placeholder="Name (register)" value={name} onChange={e=>setName(e.target.value)} />
              <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
              <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            <div style={{ marginTop:8 }}>
              <button onClick={register}>Register</button>
              <button onClick={login} style={{ marginLeft:8 }}>Login</button>
            </div>
          </section>
        )}

        {user && (
          <ChatWindow apiBase={API_BASE} token={token} friend={selectedFriend} />
        )}
      </main>
    </div>
  );
}

