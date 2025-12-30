import crypto from 'hypercore-crypto'

function toBuf (key) {
  if (Buffer.isBuffer(key)) return key
  if (typeof key === 'string') return Buffer.from(key, 'hex')
  throw new Error('Invalid key')
}

function sortKeys (a, b) {
  return Buffer.compare(a, b) <= 0 ? [a, b] : [b, a]
}

export function deriveRelationshipId (localPublicKey, remotePublicKey, token) {
  const a = toBuf(localPublicKey)
  const b = toBuf(remotePublicKey)
  const [lo, hi] = sortKeys(a, b)
  const seed = Buffer.concat([Buffer.from('ichnaea-rel-id'), lo, hi, Buffer.from(String(token || ''), 'utf8')])
  return crypto.data(seed).toString('hex')
}

export function deriveRelationshipKey (localPublicKey, remotePublicKey, token) {
  const a = toBuf(localPublicKey)
  const b = toBuf(remotePublicKey)
  const [lo, hi] = sortKeys(a, b)
  const seed = Buffer.concat([Buffer.from('ichnaea-rel-key'), lo, hi, Buffer.from(String(token || ''), 'utf8')])
  return crypto.data(seed).toString('hex')
}
