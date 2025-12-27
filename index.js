/** @typedef {import('pear-interface')} */
import Runtime from 'pear-electron'
import Bridge from 'pear-bridge'
import { loadOrCreateIdentity, toPublicIdentity } from './identity.js'

// Load identity locally
let identity = null
let publicIdentity = { publicKey: '', created: 0 }
try {
  identity = await loadOrCreateIdentity()
  publicIdentity = toPublicIdentity(identity)
} catch (err) {
  console.error('Identity load failed:', err)
}

// Updates: Pear.updates is deprecated and can crash on some builds.

// Bridge + runtime
const bridge = new Bridge({ mount: '/ui', waypoint: 'index.html' })
await bridge.ready()

const runtime = new Runtime()
const pipe = await runtime.start({ bridge })

pipe.on('close', () => Pear.exit())

pipe.on('data', (data) => {
  const msg = Buffer.from(data).toString()

  if (msg === 'request-identity') {
    pipe.write(JSON.stringify({
      type: 'identity',
      publicKey: publicIdentity.publicKey,
      created: publicIdentity.created
    }))
  }
})

pipe.write('hello from app')
