const PROTOCOL_VERSION = 1

const TYPES = {
  hello: 'hello',
  consent: 'consent-state',
  heartbeat: 'heartbeat'
}

function isString (v) {
  return typeof v === 'string' && v.length > 0
}

function isNumber (v) {
  return typeof v === 'number' && Number.isFinite(v)
}

export function validateMessage (msg) {
  if (!msg || typeof msg !== 'object') throw new Error('Message must be an object')
  if (!isString(msg.type)) throw new Error('Message type required')
  if (!isNumber(msg.version)) throw new Error('Message version required')
  if (msg.version !== PROTOCOL_VERSION) throw new Error('Protocol version mismatch')

  if (msg.type === TYPES.hello) {
    if (!isString(msg.app)) throw new Error('hello.app required')
    return true
  }

  if (msg.type === TYPES.consent) {
    if (!isString(msg.contactId)) throw new Error('consent.contactId required')
    if (!isString(msg.status)) throw new Error('consent.status required')
    if (!['pending', 'approved', 'denied'].includes(msg.status)) throw new Error('consent.status invalid')
    return true
  }

  if (msg.type === TYPES.heartbeat) {
    if (!isNumber(msg.ts)) throw new Error('heartbeat.ts required')
    return true
  }

  throw new Error('Unknown message type')
}

export function encodeMessage (msg) {
  validateMessage(msg)
  return Buffer.from(JSON.stringify(msg))
}

export function decodeMessage (buf) {
  const text = Buffer.isBuffer(buf) ? buf.toString() : String(buf || '')
  let msg = null
  try {
    msg = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON')
  }
  validateMessage(msg)
  return msg
}

export function makeHello (app) {
  return { type: TYPES.hello, version: PROTOCOL_VERSION, app }
}

export function makeConsentState (contactId, status) {
  return { type: TYPES.consent, version: PROTOCOL_VERSION, contactId, status }
}

export function makeHeartbeat (ts = Date.now()) {
  return { type: TYPES.heartbeat, version: PROTOCOL_VERSION, ts }
}

export const Protocol = { VERSION: PROTOCOL_VERSION, TYPES }
