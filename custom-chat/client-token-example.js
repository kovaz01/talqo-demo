/**
 * Talqo Client Token Example
 *
 * Shows how to use client tokens for private/support channel access.
 *
 * Flow:
 * 1. Your SERVER creates a client token using the secret key (sk_live_)
 * 2. Your SERVER passes the token to the browser
 * 3. The BROWSER uses the publishable key (pk_live_) + client token
 *
 * This file demonstrates the SERVER-SIDE token creation.
 * Run with: node client-token-example.js
 */

const API_BASE = 'https://talqo-api.onrender.com'

// ⚠️ SECRET KEY — only use server-side, never in browser code!
const SECRET_KEY = 'sk_live_YOUR_SECRET_KEY'

// Publishable key — safe for browsers
const PUBLISHABLE_KEY = 'pk_live_YOUR_PUBLISHABLE_KEY'

// ─── Step 1: Create a private channel (server-side) ──────
async function createPrivateChannel () {
  const res = await fetch(`${API_BASE}/api/v1/channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': SECRET_KEY
    },
    body: JSON.stringify({
      name: 'private-room',
      type: 'private',
      description: 'A private channel requiring client tokens'
    })
  })
  const data = await res.json()
  console.log('Created private channel:', data.data.id)
  return data.data.id
}

// ─── Step 2: Mint a client token for a user (server-side) ──
async function createClientToken (userId, channelIds) {
  const res = await fetch(`${API_BASE}/api/v1/client-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': SECRET_KEY // Must be a secret key with 'client:token' scope
    },
    body: JSON.stringify({
      userId,
      channelIds,
      expiresInSeconds: 3600 // 1 hour
    })
  })
  const data = await res.json()
  console.log('Client token created, expires in:', data.data.expiresInSeconds, 'seconds')
  return data.data.token
}

// ─── Step 3: Pass token to browser (your API endpoint) ────
// In your app, you'd have an endpoint like:
//
//   GET /api/chat-token?channelId=xxx
//
// That returns { token: "..." } to the browser.
// The browser then uses it with the React SDK:
//
//   <TalqoProvider config={{
//     apiKey: 'pk_live_...',
//     tokenProvider: async ({ channelId, userId }) => {
//       const res = await fetch(`/api/chat-token?channelId=${channelId}`)
//       const { token } = await res.json()
//       return token
//     }
//   }}>
//     <ChatWidget channelId="private-room" />
//   </TalqoProvider>
//
// Or with the widget:
//
//   Talqo.init({
//     apiKey: 'pk_live_...',
//     channelId: 'private-room',
//     tokenProvider: async ({ channelId }) => {
//       const res = await fetch(`/api/chat-token?channelId=${channelId}`)
//       const { token } = await res.json()
//       return token
//     }
//   })

// ─── Demo: Run the full flow ──────────────────────────────
async function main () {
  try {
    // 1. Create a private channel
    const channelId = await createPrivateChannel()

    // 2. Mint a client token for "alice"
    const token = await createClientToken('alice', [channelId])

    // 3. Use the token to send a message (simulating browser with token)
    const msgRes = await fetch(`${API_BASE}/api/v1/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PUBLISHABLE_KEY,
        'X-Talqo-Client-Token': token // This is what the browser sends
      },
      body: JSON.stringify({
        userId: 'alice',
        content: 'Hello from a private channel!'
      })
    })
    const msg = await msgRes.json()
    console.log('Message sent:', msg.success ? 'OK' : msg.error)

    // 4. Try without token (should fail for private channels)
    const failRes = await fetch(`${API_BASE}/api/v1/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PUBLISHABLE_KEY
        // No client token!
      },
      body: JSON.stringify({
        userId: 'attacker',
        content: 'Trying to sneak in...'
      })
    })
    const failMsg = await failRes.json()
    console.log('Without token:', failMsg.success ? 'UNEXPECTED SUCCESS' : `Blocked: ${failMsg.error.code}`)
  } catch (err) {
    console.error('Error:', err.message)
    console.log('\n⚠️  Replace SECRET_KEY and PUBLISHABLE_KEY with your actual keys from https://talqo.live/dashboard/api-keys')
  }
}

main()
