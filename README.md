# Talqo Demo Apps

Two examples showing how to integrate [Talqo](https://talqo.live) chat into your app.

**Live demo:** https://talqo-demo.onrender.com

---

## 1. Custom Chat UI (`/custom-chat`)

Build your own chat interface using the **Talqo REST API + WebSocket (Socket.IO)**.

You control every pixel — Talqo handles real-time delivery, persistence, and scaling.

```
Your UI (any framework) ──▶ Talqo REST API (channels, messages)
                          ──▶ Talqo WebSocket (real-time events)
```

**Best for:** Apps that need full UI control, custom designs, or non-web platforms.

**Files:**
- `custom-chat/index.html` — Complete chat app with channels, real-time messaging, user names
- Uses Socket.IO directly for WebSocket connection
- Uses `fetch()` for REST API calls (create channels, load history)

**Key code:**
```javascript
// Connect via WebSocket
const socket = io('https://talqo-api.onrender.com', {
  auth: { apiKey: 'YOUR_API_KEY' },
  transports: ['websocket']
})

// Join a channel
socket.emit('join_channel', { channelId: '...' })

// Send a message
socket.emit('send_message', { channelId: '...', userId: 'user1', content: 'Hello!' })

// Receive messages in real-time
socket.on('message', (msg) => renderMessage(msg))
```

---

## 2. Widget Chat (`/widget-chat`)

Drop-in chat using the **Talqo embeddable widget** — one script tag, zero custom UI.

```html
<script src="https://talqo-api.onrender.com/widget.js"></script>
<script>
  Talqo.init({
    apiKey: 'YOUR_API_KEY',
    mode: 'support',       // or 'chat'
    position: 'bottom-right'
  })
</script>
```

**Best for:** Adding support chat to an existing website in 2 minutes.

**Files:**
- `widget-chat/index.html` — Demo page showing both chat and support widget modes
- No custom UI code needed — the widget handles everything

**Widget modes:**
| Mode | What it does |
|------|-------------|
| `chat` | Connects to a specific channel, shows message history |
| `support` | Creates a private 1:1 conversation, collects visitor name, appears in your dashboard |

---

## Getting Started

1. **Sign up** at [talqo.live](https://talqo.live) (free, instant approval)
2. **Create an API key** in the dashboard
3. **Pick your approach:**
   - Need full UI control? → Use Custom Chat (`/custom-chat`)
   - Need quick support widget? → Use Widget Chat (`/widget-chat`)

## Running Locally

```bash
# Serve the demos
npx serve .

# Or open directly in browser
open custom-chat/index.html
open widget-chat/index.html
```

## API Reference

Full docs at [talqo.live/docs](https://talqo.live/docs)
