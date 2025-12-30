import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import { deriveRelationshipId, deriveRelationshipKey } from './relationship.js'

export function topicFromToken (token) {
  const buf = Buffer.from(String(token || ''), 'utf8')
  return crypto.data(buf)
}

export function createSwarmManager (opts = {}) {
  const identityPublicKey = opts.identityPublicKey || ''
  const onSecure = typeof opts.onSecure === 'function' ? opts.onSecure : () => {}
  const swarm = new Hyperswarm()
  let discovery = null
  let currentTopic = null
  let currentToken = ''
  const state = {
    topic: '',
    connecting: 0,
    connections: 0,
    peers: 0,
    lastConnectedAt: 0,
    secure: false,
    relationshipId: ''
  }

  const listeners = new Set()
  function emit () {
    for (const fn of listeners) fn({ ...state })
  }

  function onUpdate (fn) {
    listeners.add(fn)
    fn({ ...state })
    return () => listeners.delete(fn)
  }

  swarm.on('update', () => {
    state.connecting = swarm.connecting || 0
    state.connections = swarm.connections ? swarm.connections.size : 0
    state.peers = swarm.peers ? swarm.peers.size : 0
    emit()
  })

  swarm.on('connection', (conn) => {
    state.lastConnectedAt = Date.now()
    emit()
    const token = currentToken
    const hello = JSON.stringify({
      type: 'ichnaea-handshake',
      publicKey: identityPublicKey,
      token
    })
    conn.write(hello)
    conn.on('close', () => {
      state.connecting = swarm.connecting || 0
      state.connections = swarm.connections ? swarm.connections.size : 0
      state.peers = swarm.peers ? swarm.peers.size : 0
      emit()
    })

    conn.once('data', (data) => {
      let msg = null
      try {
        msg = JSON.parse(data.toString())
      } catch {
        return
      }
      if (msg?.type !== 'ichnaea-handshake') return
      if (!msg.publicKey || msg.token !== currentToken) return

      const relId = deriveRelationshipId(identityPublicKey, msg.publicKey, currentToken)
      const relKey = deriveRelationshipKey(identityPublicKey, msg.publicKey, currentToken)
      state.secure = true
      state.relationshipId = relId
      emit()
      onSecure({ relationshipId: relId, key: relKey, peerPublicKey: msg.publicKey, token: currentToken })
    })
  })

  async function join (token) {
    const topic = topicFromToken(token)
    if (currentTopic && Buffer.isBuffer(currentTopic) && currentTopic.equals(topic)) {
      return { ...state }
    }
    await leave()
    currentTopic = topic
    currentToken = String(token || '')
    state.topic = topic.toString('hex')
    state.lastConnectedAt = 0
    state.secure = false
    state.relationshipId = ''
    discovery = swarm.join(topic, { server: true, client: true })
    state.connecting = swarm.connecting || 0
    state.connections = swarm.connections ? swarm.connections.size : 0
    state.peers = swarm.peers ? swarm.peers.size : 0
    emit()
    discovery.flushed().then(() => {
      state.connecting = swarm.connecting || 0
      state.connections = swarm.connections ? swarm.connections.size : 0
      state.peers = swarm.peers ? swarm.peers.size : 0
      emit()
    }, () => {})
    return { ...state }
  }

  async function leave () {
    if (!discovery) return
    await discovery.destroy()
    discovery = null
    currentTopic = null
    currentToken = ''
    state.topic = ''
    state.connecting = 0
    state.connections = 0
    state.peers = 0
    state.lastConnectedAt = 0
    state.secure = false
    state.relationshipId = ''
    emit()
  }

  async function close () {
    await leave()
    await swarm.destroy()
  }

  return { join, leave, close, onUpdate, state: () => ({ ...state }) }
}
