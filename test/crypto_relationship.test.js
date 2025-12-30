import test from 'brittle'
import { deriveRelationshipId, deriveRelationshipKey } from '../relationship.js'

test('relationship id/key deterministic across input order', (t) => {
  const a = Buffer.from('a'.repeat(64), 'hex')
  const b = Buffer.from('b'.repeat(64), 'hex')
  const token = 'pairing-token'

  const id1 = deriveRelationshipId(a, b, token)
  const id2 = deriveRelationshipId(b, a, token)
  t.is(id1, id2, 'relationship id stable regardless of key order')

  const k1 = deriveRelationshipKey(a, b, token)
  const k2 = deriveRelationshipKey(b, a, token)
  t.is(k1, k2, 'relationship key stable regardless of key order')
})

test('relationship derivation changes with token', (t) => {
  const a = Buffer.from('a'.repeat(64), 'hex')
  const b = Buffer.from('b'.repeat(64), 'hex')
  const id1 = deriveRelationshipId(a, b, 't1')
  const id2 = deriveRelationshipId(a, b, 't2')
  t.not(id1, id2, 'relationship id changes with token')
})
