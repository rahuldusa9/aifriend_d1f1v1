import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export default function ChatWindow({ apiBase, token, friend, safeDefault=true }){
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [safeMode, setSafeMode] = useState(safeDefault);
  const [loadingReply, setLoadingReply] = useState(false);
  const polling = useRef(null);
  const mounted = useRef(false);
  const socketRef = useRef(null);

  useEffect(()=>{
    mounted.current = true;
    if (friend) {
      loadHistory();
      // startPolling(); // replaced by sockets
    }
    // initialize socket once when component mounts
    if (!socketRef.current && token) {
      try {
        const socket = io(apiBase.replace(/\/$/, ''), { transports: ['websocket'] });
        socketRef.current = socket;
        socket.on('connect', () => {
          socket.emit('register', { token });
        });
        socket.on('chat:message', (msg) => {
          // msg may be an object; push relevant messages for the current friend
          try {
            const sid = String(msg.senderId || msg.sender || msg.senderId?._id);
            const rid = String(msg.receiverId || msg.receiver || msg.receiverId?._id);
            const friendId = friend ? String(friend._id) : null;
            if (!friendId) return;
            if (sid === friendId || rid === friendId) {
              setMessages(m=>[...m, { who: msg.fromAI ? 'ai' : (String(msg.senderId)===String(friend._id) ? 'ai' : 'user'), text: msg.message, time: msg.timestamp || new Date().toISOString() }]);
            }
          } catch (e) { console.warn('socket message parse failed', e); }
        });
      } catch (e) { console.warn('socket init failed', e); }
    }
    return ()=>{ mounted.current = false; stopPolling(); };
  }, [friend]);

  function api(path, method='GET', body){
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(apiBase + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
      .then(async (r) => {
        // If rate-limited, return a structured error instead of trying to parse text as JSON
        if (!r.ok) {
          let data = null;
          try { data = await r.json(); } catch (e) { data = { message: await r.text() }; }
          const err = new Error(data && data.message ? data.message : 'API error');
          err.status = r.status;
          throw err;
        }
        return r.json();
      });
  }

  async function loadHistory(){
    if (!friend) return;
    const res = await api(`/chats/history/${friend._id}`);
    if (res.chats) setMessages(res.chats.map(c=>({ who: c.fromAI ? 'ai' : 'user', text: c.message, time: c.timestamp })) );
  }

  function startPolling(){
    stopPolling();
    // Polling kept as fallback (disabled by default); keep interval longer
    polling.current = setInterval(()=>{ loadHistory(); }, 10000);
  }
  function stopPolling(){ if (polling.current) { clearInterval(polling.current); polling.current = null; } }

  async function send(){
    if (!text.trim() || !friend) return;
    const userText = text.trim();
    setMessages(m=>[...m, { who:'user', text: userText, time: new Date().toISOString() }]);
    setText('');
    setLoadingReply(true);

    try{
      const res = await api('/chats/send','POST',{ friendId: friend._id, message: userText, safeMode });
      if (res.reply) {
        // server will also emit this via socket; still update optimistic UI
        setMessages(m=>[...m, { who:'ai', text: res.reply, time: new Date().toISOString() }]);
      }
    }catch(err){
      console.error(err);
      if (err.status === 429) {
        // if rate-limited, show a quick message and re-enable later
        setMessages(m=>[...m, { who:'ai', text: 'Rate limit reached — please wait a moment.', time: new Date().toISOString() }]);
      }
    }finally{
      if (mounted.current) setLoadingReply(false);
    }
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="friend-name">{friend ? friend.name : 'Select a friend'}</div>
        <div className="safe-toggle"><label><input type="checkbox" checked={safeMode} onChange={e=>setSafeMode(e.target.checked)} /> Safe</label></div>
      </div>

      <div className="messages" id="messages">
        {messages.map((m,i)=> (
          <div key={i} className={"bubble " + (m.who==='user' ? 'bubble-user' : 'bubble-ai')}>
            <div className="bubble-text">{m.text}</div>
            <div className="bubble-time">{new Date(m.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
          </div>
        ))}
        {loadingReply && <div className="typing">{friend ? `${friend.name} is typing...` : '...'}</div>}
      </div>

      <div className="chat-input">
        <input value={text} onChange={e=>setText(e.target.value)} placeholder={friend ? `Message ${friend.name}` : 'Select a friend to chat'} onKeyDown={e=>{ if (e.key==='Enter') send(); }} />
        <button onClick={send} disabled={!friend || !text.trim()}>Send</button>
      </div>
    </div>
  );
}
