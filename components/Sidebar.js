import React, { useState } from 'react';

export default function Sidebar({ user, friends, onSelectFriend, onCreateFriend, onReload }){
  const [fname, setFname] = useState('');
  const [personality, setPersonality] = useState('supportive,playful');

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="user-info">{user ? `Hi, ${user.name}` : 'Not logged'}</div>
        <button className="reload" onClick={onReload}>⟳</button>
      </div>

      <div className="create-friend">
        <input placeholder="Friend name" value={fname} onChange={e=>setFname(e.target.value)} />
        <input placeholder="personality (csv)" value={personality} onChange={e=>setPersonality(e.target.value)} />
        <button onClick={()=>{ if (fname) { onCreateFriend(fname, personality.split(',').map(s=>s.trim()).filter(Boolean)); setFname(''); } }}>Create</button>
      </div>

      <ul className="friends-list">
        {friends.map(f=> (
          <li key={f._id} className="friend-item" onClick={()=>onSelectFriend(f)}>
            <div className="avatar">{f.name[0] || 'A'}</div>
            <div className="meta">
              <div className="name">{f.name}</div>
              <div className="traits">{f.personality?.join(', ')}</div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
