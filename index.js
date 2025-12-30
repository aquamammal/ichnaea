/** @typedef {import('pear-interface')} */
import Runtime from 'pear-electron'
import Bridge from 'pear-bridge'
import { loadOrCreateIdentity, toPublicIdentity } from './identity.js'
import {
  createOutgoingRequest,
  acceptIncomingToken,
  approveContact,
  denyContact,
  listContacts
} from './consent.js'

// Load identity locally
let identity = null
let publicIdentity = { publicKey: '', created: 0 }
let publicIdentityError = ''
try {
  identity = await loadOrCreateIdentity()
  publicIdentity = toPublicIdentity(identity)
} catch (err) {
  publicIdentityError = String(err?.message || err)
  console.error('Identity load failed:', err)
}

// Updates: Pear.updates is deprecated and can crash on some builds.

// Bridge + runtime
const bridge = new Bridge({ mount: '/ui', waypoint: 'index.html' })
await bridge.ready()

const runtime = new Runtime()
const pipe = await runtime.start({ bridge })

pipe.on('close', () => Pear.exit())

pipe.on('data', async (data) => {
  const raw = Buffer.from(data).toString()
  let msg = null
  try {
    msg = JSON.parse(raw)
  } catch {
    msg = raw
  }

  if (msg === 'request-identity' || msg?.type === 'request-identity') {
    pipe.write(JSON.stringify({
      type: 'identity',
      publicKey: publicIdentity.publicKey,
      created: publicIdentity.created,
      error: publicIdentityError
    }))
    return
  }

  if (!msg || typeof msg !== 'object') return

  try {
    if (msg.type === 'consent:create-token') {
      const res = await createOutgoingRequest()
      pipe.write(JSON.stringify({ type: 'consent:token', id: msg.id, ...res }))
      return
    }
    if (msg.type === 'consent:accept-token') {
      const contact = await acceptIncomingToken(msg.token || '')
      pipe.write(JSON.stringify({ type: 'consent:accepted', id: msg.id, contact }))
      return
    }
    if (msg.type === 'consent:approve') {
      const contact = await approveContact(msg.contactId || '')
      pipe.write(JSON.stringify({ type: 'consent:updated', id: msg.id, contact }))
      return
    }
    if (msg.type === 'consent:deny') {
      const contact = await denyContact(msg.contactId || '')
      pipe.write(JSON.stringify({ type: 'consent:updated', id: msg.id, contact }))
      return
    }
    if (msg.type === 'consent:list') {
      const contacts = await listContacts()
      pipe.write(JSON.stringify({ type: 'consent:list', id: msg.id, contacts }))
    }
  } catch (err) {
    pipe.write(JSON.stringify({ type: 'error', id: msg.id, message: String(err?.message || err) }))
  }
})

// Avoid unsolicited pipe messages; UI expects JSON responses.
