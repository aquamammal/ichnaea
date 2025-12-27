import test from 'brittle'
import { loadOrCreateIdentity, toPublicIdentity } from '../identity.js'

test('identity persists across restarts', async (t) => {
  let persisted = null
  const storage = {}
  const read = async () => persisted
  const write = async (_storage, data) => { persisted = data }

  const first = await loadOrCreateIdentity({ storage, read, write })
  t.ok(first.publicKey, 'has public key')
  t.ok(first.secretKey, 'has secret key')
  t.ok(first.created, 'has created timestamp')

  const second = await loadOrCreateIdentity({ storage, read, write })
  t.is(second.publicKey.toString('hex'), first.publicKey.toString('hex'), 'public key stable')
  t.is(second.secretKey.toString('hex'), first.secretKey.toString('hex'), 'secret key stable')
  t.is(second.created, first.created, 'created timestamp stable')
})

test('public identity omits secret key', (t) => {
  const identity = {
    publicKey: Buffer.from('a'.repeat(64), 'hex'),
    secretKey: Buffer.from('b'.repeat(128), 'hex'),
    created: 123
  }

  const pub = toPublicIdentity(identity)
  t.alike(Object.keys(pub).sort(), ['created', 'publicKey'], 'only public fields returned')
  t.is(pub.publicKey, identity.publicKey.toString('hex'), 'public key hex exposed')
  t.is(pub.created, 123, 'created preserved')
})
