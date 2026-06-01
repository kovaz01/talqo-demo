/**
 * Talqo Custom Chat — API + WebSocket Example
 *
 * This file shows how to build a custom chat UI using:
 * 1. REST API (fetch) — for channels, message history, channel creation
 * 2. WebSocket (Socket.IO) — for real-time message delivery
 *
 * Replace API_KEY with your own from https://talqo.live/dashboard/api-keys
 */

const API_BASE = 'https://talqo-api.onrender.com'
const API_KEY = 'pk_live_LKlmr4swv3DQW6knTESTp3jXhk2GHrus' // Replace with your key

// ─── State ────────────────────────────────────────────
let socket = null
let currentChannelId = null
let channels = []

// ─── DOM Elements ─────────────────────────────────────
const statusDot = document.getElementById('statusDot')
const statusText = document.getElementById('statusText')
const channelList = document.getElementById('channelList')
const channelTitle = document.getElementById('channelTitle')
const channelDesc = document.getElementById('channelDesc')
const messagesDiv = document.getElementById('messages')
const messageInput = document.getElementById('messageInput')
const sendBtn = document.getElementById('sendBtn')
const usernameInput = document.getElementById('username')

// ─── REST API Helper ──────────────────────────────────
// All REST calls use the X-API-Key header for authentication.
// This is the same key used for WebSocket auth below.
async function api (method, path, body) {
  const headers = { 'x-api-key': API_KEY }
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  return res.json()
}

// ─── Render Helpers (XSS-safe: uses textContent, not innerHTML) ──
function formatTime (ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function renderMessage (msg) {
  const div = document.createElement('div')
  div.className = 'message'

  const isBot = msg.metadata?.isBot
  const author = isBot ? (msg.metadata.botName || 'Bot') : (msg.userId || 'Anonymous')

  const metaDiv = document.createElement('div')
  metaDiv.className = 'meta'

  const authorSpan = document.createElement('span')
  authorSpan.className = 'author'
  authorSpan.textContent = author
  metaDiv.appendChild(authorSpan)

  if (isBot) {
    const badge = document.createElement('span')
    badge.className = 'bot-badge'
    badge.textContent = 'BOT'
    metaDiv.appendChild(badge)
  }

  const timeSpan = document.createElement('span')
  timeSpan.className = 'time'
  timeSpan.textContent = formatTime(msg.createdAt)
  metaDiv.appendChild(timeSpan)

  const bodyDiv = document.createElement('div')
  bodyDiv.className = 'body'
  bodyDiv.textContent = msg.content

  div.appendChild(metaDiv)
  div.appendChild(bodyDiv)
  return div
}

// ─── Load Channels (REST API) ─────────────────────────
// GET /api/v1/channels returns all public channels for your tenant.
async function loadChannels () {
  const res = await api('GET', '/api/v1/channels?limit=20')
  if (!res.success) return

  channels = res.data
  channelList.replaceChildren()

  channels.forEach(ch => {
    const li = document.createElement('li')
    const hash = document.createElement('span')
    hash.className = 'hash'
    hash.textContent = '#'
    li.appendChild(hash)
    li.appendChild(document.createTextNode(' ' + ch.name))
    li.dataset.id = ch.id
    li.onclick = () => selectChannel(ch.id, ch.name, ch.description)
    channelList.appendChild(li)
  })

  if (channels.length > 0) {
    selectChannel(channels[0].id, channels[0].name, channels[0].description)
  }
}

// ─── Load Message History (REST API) ──────────────────
// GET /api/v1/channels/:id/messages returns recent messages.
// Use ?before=<timestamp> for cursor-based pagination.
async function loadMessages (channelId) {
  messagesDiv.replaceChildren()
  const loading = document.createElement('div')
  loading.className = 'empty'
  loading.textContent = 'Loading messages...'
  messagesDiv.appendChild(loading)

  const res = await api('GET', `/api/v1/channels/${channelId}/messages`)
  messagesDiv.replaceChildren()

  if (res.success && res.data.length > 0) {
    res.data.forEach(msg => messagesDiv.appendChild(renderMessage(msg)))
  } else {
    const empty = document.createElement('div')
    empty.className = 'empty'
    empty.textContent = 'No messages yet. Be the first!'
    messagesDiv.appendChild(empty)
  }
  messagesDiv.scrollTop = messagesDiv.scrollHeight
}

// ─── Select Channel ───────────────────────────────────
function selectChannel (id, name, desc) {
  currentChannelId = id
  channelTitle.textContent = `# ${name}`
  channelDesc.textContent = desc || 'Chat channel'
  messageInput.disabled = false
  sendBtn.disabled = false

  document.querySelectorAll('#channelList li').forEach(li => {
    li.classList.toggle('active', li.dataset.id === id)
  })

  loadMessages(id)

  // Tell the WebSocket server we want events from this channel
  if (socket && socket.connected) {
    socket.emit('join_channel', { channelId: id })
  }
}

// ─── Send Message (WebSocket) ─────────────────────────
// Messages are sent via WebSocket for instant delivery.
// The server persists them AND broadcasts to all connected clients.
function sendMessage () {
  const content = messageInput.value.trim()
  const username = usernameInput.value.trim() || 'Anonymous'
  if (!content || !currentChannelId) return

  messageInput.value = ''

  // Emit via WebSocket — the server handles persistence + broadcast
  socket.emit('send_message', {
    channelId: currentChannelId,
    userId: username.toLowerCase().replace(/\s+/g, '-'),
    content
  })

  messageInput.focus()
}

// ─── WebSocket Connection (Socket.IO) ─────────────────
// The WebSocket connection handles:
// - Real-time message delivery (server → client)
// - Sending messages (client → server)
// - Typing indicators
// - Presence (who's online)
function connectSocket () {
  socket = io(API_BASE, {
    transports: ['websocket'], // Required for Render (no sticky sessions)
    auth: { apiKey: API_KEY }  // Same key as REST API
  })

  socket.on('connect', () => {
    statusDot.classList.add('connected')
    statusText.textContent = 'Connected'
    if (currentChannelId) {
      socket.emit('join_channel', { channelId: currentChannelId })
    }
  })

  socket.on('disconnect', () => {
    statusDot.classList.remove('connected')
    statusText.textContent = 'Disconnected'
  })

  // Real-time messages — this is the core of the chat experience.
  // Every message sent by ANY user in the channel arrives here.
  socket.on('message', (msg) => {
    if (msg.channelId === currentChannelId) {
      const placeholder = messagesDiv.querySelector('.empty')
      if (placeholder) placeholder.remove()
      messagesDiv.appendChild(renderMessage(msg))
      messagesDiv.scrollTop = messagesDiv.scrollHeight
    }
  })

  socket.on('connect_error', (err) => {
    statusText.textContent = 'Connection error'
    console.error('Socket error:', err)
  })
}

// ─── Event Listeners ──────────────────────────────────
sendBtn.addEventListener('click', sendMessage)
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage()
})

// ─── Initialize ───────────────────────────────────────
loadChannels()
connectSocket()
