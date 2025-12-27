/** @typedef {import('pear-interface')} */ /* global Pear */
import crypto from 'hypercore-crypto'

function bufFromHex (hex, bytesHint) {
  if (typeof hex !== 'string' || hex.length === 0) return null
  // Basic sanity: hex length should be even
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string (odd length)')
  const b = Buffer.from(hex, 'hex')
  if (typeof bytesHint === 'number' && b.length !== bytesHint) {
    // Not fatal, but helps catch accidental corruption
    throw new Error(`Invalid key length: expected ${bytesHint} bytes, got ${b.length}`)
  }
  return b
}

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
  const file = path.join(dir, 'identity.json')
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

export async function loadOrCreateIdentity (opts = {}) {
  const storage = opts.storage || await defaultStorage()
  const read = opts.read || ((s) => defaultRead(s))
  const write = opts.write || ((s, d) => defaultWrite(s, d))
  const existing = await read(storage)

  if (existing && existing.publicKey && existing.secretKey) {
    const publicKey = bufFromHex(existing.publicKey, 32)
    const secretKey = bufFromHex(existing.secretKey, 64)
    return {
      publicKey,
      secretKey,
      created: existing.created || 0
    }
  }

  const kp = crypto.keyPair() // { publicKey: Buffer(32), secretKey: Buffer(64) }
  const created = Date.now()

  const next = {
    publicKey: kp.publicKey.toString('hex'),
    secretKey: kp.secretKey.toString('hex'),
    created
  }

  await write(storage, next)

  return {
    publicKey: kp.publicKey,
    secretKey: kp.secretKey,
    created
  }
}

export function toPublicIdentity (identity) {
  if (!identity?.publicKey) return { publicKey: '', created: 0 }
  return {
    publicKey: identity.publicKey.toString('hex'),
    created: identity.created || 0
  }
}

// Optional dev helper (call from console if needed)
export async function unsafeResetIdentity (opts = {}) {
  const storage = opts.storage || await defaultStorage()
  try {
    await storage.fs.promises.unlink(storage.file)
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err
  }
  return true
}
