/* ════════════════════════════════════════════════════════════════
   SKONGA AI STUDENT ASSISTANT - MAIN JAVASCRIPT
   Handles all chat, notes, scanning, and calculator functionality
   ════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────
   UTILITY FUNCTIONS
   ────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

function fmtTime(d) {
  return (d || new Date()).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function scrollBottom() {
  const c = $('chat-area');
  c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
}

/* ──────────────────────────────────────────────────────────────
   SIDEBAR & CHAT HISTORY MANAGEMENT
   ────────────────────────────────────────────────────────────── */
let chatSessions = [];
let activeChatId = null;

function openSidebar() {
  $('sidebar').classList.add('open');
  $('overlay').classList.add('open');
}

function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('overlay').classList.remove('open');
}

$('menuBtn').addEventListener('click', e => {
  e.stopPropagation();
  openSidebar();
});

$('sidebarClose').addEventListener('click', closeSidebar);

function renderHistList() {
  const list = $('chatHistList');
  list.innerHTML = '';
  if (!chatSessions.length) {
    list.innerHTML = '<div style="padding:16px;font-size:.8rem;color:var(--text-muted);text-align:center">Hakuna mazungumzo bado</div>';
    return;
  }
  chatSessions.slice().reverse().forEach(s => {
    const item = document.createElement('div');
    item.className = 'hist-item' + (s.id === activeChatId ? ' active-chat' : '');
    item.innerHTML = `
      <div class="hist-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
      <div class="hist-info">
        <div class="hist-title">${s.title}</div>
        <div class="hist-preview">${s.preview}</div>
        <div class="hist-time">${s.time}</div>
      </div>`;
    item.onclick = () => {
      loadSession(s.id);
      closeSidebar();
    };
    list.appendChild(item);
  });
}

function saveCurrentSession() {
  const msgs = $('chat-area').querySelectorAll('.msg-row');
  if (!msgs.length) return;
  const firstUser = $('chat-area').querySelector('.msg-row.user .bubble');
  const title = firstUser ? firstUser.textContent.replace(/\d+:\d+.*$/, '').trim().slice(0, 40) : 'Mazungumzo';
  const lastBot = [...$('chat-area').querySelectorAll('.msg-row.bot .bubble')].pop();
  const preview = lastBot ? lastBot.textContent.replace(/\d+:\d+.*$/, '').trim().slice(0, 50) : '';
  const id = activeChatId || ('chat_' + Date.now());
  activeChatId = id;
  const existing = chatSessions.find(s => s.id === id);
  if (existing) {
    existing.title = title;
    existing.preview = preview;
    existing.html = $('chat-area').innerHTML;
  } else {
    chatSessions.push({
      id,
      title,
      preview,
      time: fmtTime(new Date()),
      html: $('chat-area').innerHTML
    });
  }
  renderHistList();
}

function loadSession(id) {
  const s = chatSessions.find(x => x.id === id);
  if (!s) return;
  saveCurrentSession();
  activeChatId = id;
  $('chat-area').innerHTML = s.html;
  scrollBottom();
  switchTab('chat');
  renderHistList();
}

function newChat() {
  saveCurrentSession();
  activeChatId = null;
  $('chat-area').innerHTML = `
    <div class="welcome">
      <div class="ai-avatar-big"><svg viewBox="0 0 50 50" fill="none"><circle cx="25" cy="25" r="20" stroke="#a855f7" stroke-width="2"/><path d="M15 25 Q20 15 25 25 Q30 35 35 25" stroke="#c084fc" stroke-width="2.5" fill="none"/></svg></div>
      <h2>Hello! I'm SKONGA AI</h2>
      <p>How can I help you today?</p>
    </div>`;
  closeSidebar();
  switchTab('chat');
  renderHistList();
}

$('editBtn').addEventListener('click', newChat);

/* ──────────────────────────────────────────────────────────────
   ATTACH POPUP & FILE HANDLING
   ────────────────────────────────────────────────────────────── */
const attachToggle = $('attachToggle');
const attachPopup = $('attachPopup');

function openAttach(e) {
  e.stopPropagation();
  const isOpen = attachPopup.classList.contains('open');
  closeAllPopups();
  if (!isOpen) {
    attachPopup.classList.add('open');
    $('overlay').classList.add('open');
  }
}

function closeAllPopups() {
  attachPopup.classList.remove('open');
  $('overlay').classList.remove('open');
}

attachToggle.addEventListener('click', openAttach);
$('overlay').addEventListener('click', () => {
  closeAllPopups();
  closeSidebar();
});

function triggerAttach(type) {
  closeAllPopups();
  const map = {
    camera: 'fileCamera',
    image: 'fileImage',
    pdf: 'filePDF',
    file: 'fileGeneric'
  };
  $(map[type]).click();
}

['fileCamera', 'fileImage', 'fileGallery'].forEach(id => {
  $(id).addEventListener('change', function() {
    if (this.files[0]) {
      const file = this.files[0];
      const reader = new FileReader();
      reader.onload = e => handleImageAttachment(e.target.result, file.name);
      reader.readAsDataURL(file);
    }
  });
});

['filePDF', 'fileGeneric'].forEach(id => {
  $(id).addEventListener('change', function() {
    if (this.files[0]) addMessage(`[Faili: ${this.files[0].name}]`, 'user');
  });
});

function handleImageAttachment(dataUrl, name) {
  const ca = $('chat-area');
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `<div class="bubble" style="padding:6px"><img src="${dataUrl}" style="max-width:200px;border-radius:10px;display:block"/><div class="ts">${fmtTime()}<span class="ts-check read"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span></div></div>`;
  ca.appendChild(row);
  scrollBottom();
  showTyping();
  setTimeout(() => {
    hideTyping();
    addMessage('Nimepokea picha yako. Jibu halisi litaonekana baada ya kuunganisha API.', 'bot');
    saveCurrentSession();
  }, 1500);
}

/* ──────────────────────────────────────────────────────────────
   CHAT MESSAGES
   ────────────────────────────────────────────────────────────── */
function addMessage(text, role, time) {
  const ca = $('chat-area');
  const row = document.createElement('div');
  row.className = `msg-row ${role}`;
  const ts = time || fmtTime();
  if (role === 'bot') {
    const icon = document.createElement('div');
    icon.className = 'bot-icon';
    icon.innerHTML = `<svg viewBox="0 0 50 50" fill="none"><circle cx="25" cy="25" r="20" stroke="#a855f7" stroke-width="2"/><path d="M15 25 Q20 15 25 25 Q30 35 35 25" stroke="#c084fc" stroke-width="2.5" fill="none"/></svg>`;
    row.appendChild(icon);
  }
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = text.replace(/\n/g, '<br>') +
    `<div class="ts">${ts}${role === 'user' ? `<span class="ts-check read"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span>` : ''}</div>`;
  row.appendChild(bubble);
  ca.appendChild(row);
  scrollBottom();
  return row;
}

function showTyping() {
  const ca = $('chat-area');
  const row = document.createElement('div');
  row.className = 'typing-row';
  row.id = 'typingIndicator';
  row.innerHTML = `<div class="bot-icon"><svg viewBox="0 0 50 50" fill="none"><circle cx="25" cy="25" r="20" stroke="#a855f7" stroke-width="2"/><path d="M15 25 Q20 15 25 25 Q30 35 35 25" stroke="#c084fc" stroke-width="2.5" fill="none"/></svg></div><div class="typing-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  ca.appendChild(row);
  scrollBottom();
}

function hideTyping() {
  const t = $('typingIndicator');
  if (t) t.remove();
}

/* ── SEND MESSAGE ── */
const msgInput = $('msgInput');
msgInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  msgInput.value = '';
  msgInput.style.height = 'auto';
  showTyping();
  setTimeout(() => {
    hideTyping();
    addMessage('Nimepokea ujumbe wako. Jibu halisi litakuja baada ya kuunganisha API.', 'bot');
    saveCurrentSession();
  }, 1500);
}

$('sendBtn').addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

/* ──────────────────────────────────────────────────────────────
   NOTES MANAGEMENT
   ────────────────────────────────────────────────────────────── */
let notes = [];
let editingNoteId = null;

function renderNotes() {
  const list = $('notesList');
  const empty = $('notesEmpty');
  list.querySelectorAll('.note-card').forEach(n => n.remove());
  if (!notes.length) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  notes.slice().reverse().forEach(n => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `<div class="note-card-title">${n.title || 'Bila kichwa'}</div><div class="note-card-body">${n.body}</div><div class="note-card-date">${n.date}</div><button class="note-del" onclick="deleteNote('${n.id}', event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>`;
    card.addEventListener('click', () => openNoteEditor(n.id));
    list.appendChild(card);
  });
}

function openNoteEditor(id) {
  editingNoteId = id || null;
  const note = id ? notes.find(n => n.id === id) : null;
  $('noteModalTitle').textContent = id ? 'Hariri Maelezo' : 'Maelezo Mapya';
  $('noteTitleInp').value = note ? note.title : '';
  $('noteBodyInp').value = note ? note.body : '';
  $('noteModal').classList.remove('hidden');
}

function closeNoteEditor() {
  $('noteModal').classList.add('hidden');
}

$('notesAddBtn').addEventListener('click', () => openNoteEditor(null));
$('noteModalClose').addEventListener('click', closeNoteEditor);

$('noteSaveBtn').addEventListener('click', () => {
  const title = $('noteTitleInp').value.trim();
  const body = $('noteBodyInp').value.trim();
  if (!body) return;
  if (editingNoteId) {
    const n = notes.find(x => x.id === editingNoteId);
    if (n) {
      n.title = title;
      n.body = body;
    }
  } else {
    notes.push({
      id: 'note_' + Date.now(),
      title,
      body,
      date: new Date().toLocaleDateString('sw', { day: 'numeric', month: 'short', year: 'numeric' })
    });
  }
  closeNoteEditor();
  renderNotes();
});

function deleteNote(id, e) {
  e.stopPropagation();
  notes = notes.filter(n => n.id !== id);
  renderNotes();
}

/* ──────────────────────────────────────────────────────────────
   SCAN TO SOLVE - CAMERA & GALLERY
   ────────────────────────────────────────────────────────────── */
let cameraStream = null;

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    cameraStream = stream;
    const vid = $('camera-preview');
    vid.srcObject = stream;
    vid.style.display = 'block';
    $('scanPlaceholder').style.display = 'none';
    $('scanInitBtns').style.display = 'none';
    $('snapBtn').style.display = 'flex';
  } catch (err) {
    $('fileCamera').click();
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  $('camera-preview').style.display = 'none';
}

function snapPhoto() {
  const vid = $('camera-preview');
  const canvas = $('canvas-snap');
  canvas.width = vid.videoWidth;
  canvas.height = vid.videoHeight;
  canvas.getContext('2d').drawImage(vid, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  stopCamera();
  showCaptured(dataUrl);
}

function showCaptured(dataUrl) {
  $('scan-captured').src = dataUrl;
  $('scan-captured').style.display = 'block';
  $('scanPlaceholder').style.display = 'none';
  $('scanInitBtns').style.display = 'none';
  $('snapBtn').style.display = 'none';
  $('scanPromptRow').classList.add('visible');
  $('scanPromptInp').focus();
}

function retakeScan() {
  $('scan-captured').style.display = 'none';
  $('scan-captured').src = '';
  $('scanPromptRow').classList.remove('visible');
  $('scanPlaceholder').style.display = 'flex';
  $('scanInitBtns').style.display = 'flex';
  $('scanPromptInp').value = '';
}

function sendScanToChat() {
  const imgSrc = $('scan-captured').src;
  const prompt = $('scanPromptInp').value.trim() || 'Solve/explain this question';
  switchTab('chat');
  const ca = $('chat-area');
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `<div class="bubble" style="padding:8px 10px"><img src="${imgSrc}" style="max-width:200px;border-radius:10px;display:block;margin-bottom:4px"/><span style="font-size:.85rem">${prompt}</span><div class="ts">${fmtTime()}<span class="ts-check read"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span></div></div>`;
  ca.appendChild(row);
  scrollBottom();
  showTyping();
  setTimeout(() => {
    hideTyping();
    addMessage('Nimepokea picha na swali lako. Jibu halisi litaonekana baada ya kuunganisha Vision API.', 'bot');
    saveCurrentSession();
  }, 1800);
  retakeScan();
}

$('fileGallery').addEventListener('change', function() {
  if (this.files[0]) {
    const reader = new FileReader();
    reader.onload = e => showCaptured(e.target.result);
    reader.readAsDataURL(this.files[0]);
  }
});

/* ──────────────────────────────────────────────────────────────
   SCIENTIFIC CALCULATOR
   ────────────────────────────────────────────────────────────── */
let calcExprStr = '';
let calcJustEvaled = false;

function setCalcMode(mode) {
  if (mode === 'sci') {
    $('sciGrid').style.display = 'grid';
    $('basicGrid').style.display = 'none';
    $('modeSci').classList.add('active');
    $('modeBasic').classList.remove('active');
  } else {
    $('sciGrid').style.display = 'none';
    $('basicGrid').style.display = 'grid';
    $('modeBasic').classList.add('active');
    $('modeSci').classList.remove('active');
  }
}

function updateDisplay() {
  const res = $('calcResult');
  res.textContent = calcExprStr || '0';
  res.className = 'calc-result' + (calcExprStr.length > 12 ? ' small' : '');
  $('calcExpr').textContent = '';
}

function calcNum(n) {
  if (calcJustEvaled) {
    calcExprStr = '';
    calcJustEvaled = false;
  }
  calcExprStr += n;
  updateDisplay();
}

function calcOp(op) {
  calcJustEvaled = false;
  calcExprStr += op;
  updateDisplay();
}

function calcFn(fn) {
  calcJustEvaled = false;
  if (fn === 'pi') calcExprStr += '\u03c0';
  else if (fn === 'e') calcExprStr += 'e';
  else if (fn === 'x²') calcExprStr += '^2';
  else if (fn === '1/') calcExprStr = '1/(' + calcExprStr + ')';
  else calcExprStr += fn;
  updateDisplay();
}

function calcClear() {
  calcExprStr = '';
  calcJustEvaled = false;
  $('calcResult').textContent = '0';
  $('calcExpr').textContent = '';
}

function calcDel() {
  calcExprStr = calcExprStr.slice(0, -1);
  updateDisplay();
}

function calcToggleSign() {
  if (calcExprStr && !isNaN(calcExprStr)) {
    calcExprStr = String(-parseFloat(calcExprStr));
    updateDisplay();
  }
}

function calcEquals() {
  if (!calcExprStr) return;
  try {
    $('calcExpr').textContent = calcExprStr + ' =';
    let expr = calcExprStr
      .replace(/\u03c0/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E')
      .replace(/sin\(/g, 'Math.sin(')
      .replace(/cos\(/g, 'Math.cos(')
      .replace(/tan\(/g, 'Math.tan(')
      .replace(/asin\(/g, 'Math.asin(')
      .replace(/acos\(/g, 'Math.acos(')
      .replace(/atan\(/g, 'Math.atan(')
      .replace(/log\(/g, 'Math.log10(')
      .replace(/ln\(/g, 'Math.log(')
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/abs\(/g, 'Math.abs(')
      .replace(/\^/g, '**');
    expr = expr.replace(/(\d+)!/g, (m, n) => factorial(parseInt(n)));
    const result = Function('"use strict";return (' + expr + ')')();
    const formatted = Number.isInteger(result) ? result : parseFloat(result.toPrecision(10));
    calcExprStr = String(formatted);
    const res = $('calcResult');
    res.textContent = calcExprStr;
    res.className = 'calc-result' + (calcExprStr.length > 12 ? ' small' : '');
    calcJustEvaled = true;
  } catch (err) {
    $('calcResult').textContent = 'Error';
    $('calcResult').className = 'calc-result';
    calcExprStr = '';
    calcJustEvaled = false;
  }
}

function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/* ──────────────────────────────────────────────────────────────
   TAB SWITCHER
   ────────────────────────────────────────────────────────────── */
const tabMap = {
  chat: { panel: 'chat-panel', nav: 'nav-chat' },
  notes: { panel: 'notes-panel', nav: 'nav-notes' },
  scan: { panel: 'scan-panel', nav: 'nav-scan' },
  calc: { panel: 'calc-panel', nav: 'nav-calc' }
};

function switchTab(tab) {
  if (tab !== 'scan') stopCamera();
  Object.entries(tabMap).forEach(([key, val]) => {
    $(val.panel).classList.toggle('active', key === tab);
    $(val.nav).classList.toggle('active', key === tab);
  });
}

/* ──────────────────────────────────────────────────────────────
   INITIALIZATION
   ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderHistList();
  renderNotes();
  scrollBottom();
});
