import crypto from 'hypercore-crypto'

async function resolveFs () {
  let fsMod = null
  let pathMod = null
  try {
    fsMod = await import('bare-fs')
  } catch {
    fsMod = await import('fs')
  }
  try {
    pathMod = await import('bare-path')
  } catch {
    pathMod = await import('path')
  }
  return {
    fs: fsMod.default || fsMod,
    path: pathMod.default || pathMod
  }
}

async function defaultStorage () {
  const { fs, path } = await resolveFs()
  const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '.'
  const dir = path.join(cwd, 'data')
  const file = path.join(dir, 'store.json')
  return { fs, path, dir, file }
}

async function defaultRead (storage) {
  try {
    const raw = await storage.fs.promises.readFile(storage.file, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    if (err?.code === 'ENOENT') return null
    throw err
  }
}

async function defaultWrite (storage, data) {
  await storage.fs.promises.mkdir(storage.dir, { recursive: true })
  await storage.fs.promises.writeFile(storage.file, JSON.stringify(data), 'utf8')
}

function defaultStore () {
  return {
    version: 1,
    contacts: {},
    relationships: {},
    locations: {}
  }
}

function normalizeStore (data) {
  if (!data || typeof data !== 'object') return defaultStore()
  if (typeof data.version !== 'number') data.version = 1
  if (!data.contacts || typeof data.contacts !== 'object') data.contacts = {}
  if (!data.relationships || typeof data.relationships !== 'object') data.relationships = {}
  if (!data.locations || typeof data.locations !== 'object') data.locations = {}
  return data
}

async function load (opts = {}) {
  const storage = opts.storage || await defaultStorage()
  const read = opts.read || ((s) => defaultRead(s))
  const data = await read(storage)
  return { storage, store: normalizeStore(data) }
}

async function save (store, opts = {}) {
  const storage = opts.storage || await defaultStorage()
  const write = opts.write || ((s, d) => defaultWrite(s, d))
  await write(storage, store)
}

function makeId () {
  return crypto.randomBytes(16).toString('hex')
}

export async function loadStore (opts = {}) {
  const { store } = await load(opts)
  return store
}

export async function createContact (contact = {}, opts = {}) {
  const { storage, store } = await load(opts)
  const id = contact.id || makeId()
  const created = contact.created || Date.now()
  const status = contact.status || 'pending'
  store.contacts[id] = {
    id,
    status,
    created,
    name: contact.name || '',
    direction: contact.direction || '',
    token: contact.token || '',
    shareLocation: Boolean(contact.shareLocation)
  }
  await save(store, { ...opts, storage })
  return store.contacts[id]
}

export async function setContactStatus (id, status, opts = {}) {
  const { storage, store } = await load(opts)
  if (!store.contacts[id]) throw new Error('Contact not found')
  store.contacts[id].status = status
  await save(store, { ...opts, storage })
  return store.contacts[id]
}

export async function createRelationship (rel = {}, opts = {}) {
  const { storage, store } = await load(opts)
  const id = rel.id || makeId()
  const contactId = rel.contactId
  if (!contactId) throw new Error('contactId required')
  if (!store.contacts[contactId]) throw new Error('Contact not found')
  store.relationships[id] = {
    id,
    contactId,
    created: rel.created || Date.now(),
    token: rel.token || '',
    peerPublicKey: rel.peerPublicKey || '',
    key: rel.key || ''
  }
  await save(store, { ...opts, storage })
  return store.relationships[id]
}

export async function upsertRelationship (rel = {}, opts = {}) {
  const { storage, store } = await load(opts)
  const contactId = rel.contactId
  if (!contactId) throw new Error('contactId required')
  if (!store.contacts[contactId]) throw new Error('Contact not found')
  const existing = Object.values(store.relationships).find(r => r.contactId === contactId)
  const id = rel.id || existing?.id || makeId()
  store.relationships[id] = {
    id,
    contactId,
    created: existing?.created || rel.created || Date.now(),
    token: rel.token || existing?.token || '',
    peerPublicKey: rel.peerPublicKey || existing?.peerPublicKey || '',
    key: rel.key || existing?.key || ''
  }
  await save(store, { ...opts, storage })
  return store.relationships[id]
}

export async function findContactByToken (token, opts = {}) {
  const { store } = await load(opts)
  const t = String(token || '').trim()
  if (!t) return null
  return Object.values(store.contacts).find(c => c.token === t) || null
}

export async function setShareLocation (contactId, enabled, opts = {}) {
  const { storage, store } = await load(opts)
  if (!store.contacts[contactId]) throw new Error('Contact not found')
  store.contacts[contactId].shareLocation = Boolean(enabled)
  await save(store, { ...opts, storage })
  return store.contacts[contactId]
}

export async function findRelationshipByContactId (contactId, opts = {}) {
  const { store } = await load(opts)
  return Object.values(store.relationships).find(r => r.contactId === contactId) || null
}

export async function findRelationshipByPeerKey (peerPublicKey, opts = {}) {
  const { store } = await load(opts)
  const pk = String(peerPublicKey || '').trim()
  if (!pk) return null
  return Object.values(store.relationships).find(r => r.peerPublicKey === pk) || null
}

export async function listContactSummaries (opts = {}) {
  const { store } = await load(opts)
  return Object.values(store.contacts).map((c) => {
    return {
      ...c,
      location: store.locations[c.id] || null
    }
  })
}

export async function setLastKnownLocation (contactId, location = {}, opts = {}) {
  const { storage, store } = await load(opts)
  if (!store.contacts[contactId]) throw new Error('Contact not found')
  const next = {
    lat: location.lat,
    lon: location.lon,
    updatedAt: location.updatedAt || Date.now()
  }
  store.locations[contactId] = next
  await save(store, { ...opts, storage })
  return next
}

export async function getLastKnownLocation (contactId, opts = {}) {
  const { store } = await load(opts)
  return store.locations[contactId] || null
}
