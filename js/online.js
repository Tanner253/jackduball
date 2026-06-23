/** Leaderboard + chat client for Jack DuBall */
const GameOnline = (() => {
  const USERNAME_KEY = 'jackduball_username';
  let lastChatTs = 0;
  let pollTimer = null;

  function getUsername() {
    return localStorage.getItem(USERNAME_KEY) || '';
  }

  function setUsername(name) {
    const trimmed = String(name || '').trim().slice(0, 20);
    if (trimmed) localStorage.setItem(USERNAME_KEY, trimmed);
    return trimmed;
  }

  async function fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error('leaderboard unavailable');
      const data = await res.json();
      return data.scores || [];
    } catch {
      return [];
    }
  }

  async function submitScore(score, donuts) {
    const username = getUsername() || 'Anonymous';
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, score, donuts })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.scores || [];
    } catch {
      return [];
    }
  }

  async function fetchChat(since = 0) {
    try {
      const url = since > 0 ? `/api/chat?since=${since}` : '/api/chat';
      const res = await fetch(url);
      if (!res.ok) throw new Error('chat unavailable');
      const data = await res.json();
      return data.chat || [];
    } catch {
      return [];
    }
  }

  async function sendChat(message) {
    const username = getUsername() || 'Anonymous';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, message })
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  function renderLeaderboard(scores, el) {
    if (!el) return;
    if (!scores.length) {
      el.innerHTML = '<li class="empty">No scores yet — be first!</li>';
      return;
    }
    el.innerHTML = scores.slice(0, 12).map((s, i) =>
      `<li><span class="rank">${i + 1}.</span> <strong>${escapeHtml(s.username)}</strong> — ${s.score}${s.donuts ? ` <em>(${s.donuts}🍩)</em>` : ''}</li>`
    ).join('');
  }

  function renderChat(messages, el, appendOnly = false) {
    if (!el || !messages.length) return;
    const html = messages.map((m) =>
      `<div class="chat-msg"><span class="chat-user">${escapeHtml(m.username)}:</span> ${escapeHtml(m.message)}</div>`
    ).join('');
    if (appendOnly) el.insertAdjacentHTML('beforeend', html);
    else el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
    messages.forEach((m) => { if (m.ts > lastChatTs) lastChatTs = m.ts; });
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function refreshLeaderboard(el) {
    renderLeaderboard(await fetchLeaderboard(), el);
  }

  async function refreshChat(el, full = false) {
    const msgs = await fetchChat(full ? 0 : lastChatTs);
    if (full) {
      renderChat(msgs, el, false);
    } else if (msgs.length) {
      renderChat(msgs, el, true);
    }
  }

  function startPolling(chatEl, boardEl) {
    stopPolling();
    refreshLeaderboard(boardEl);
    refreshChat(chatEl, true);
    pollTimer = setInterval(() => {
      refreshChat(chatEl, false);
      refreshLeaderboard(boardEl);
    }, 4000);
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  return {
    getUsername,
    setUsername,
    submitScore,
    sendChat,
    refreshLeaderboard,
    refreshChat,
    startPolling,
    stopPolling
  };
})();
