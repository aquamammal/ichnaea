import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'

export function topicFromToken (token) {
  const buf = Buffer.from(String(token || ''), 'utf8')
  return crypto.data(buf)
}

export function createSwarmManager () {
  const swarm = new Hyperswarm()
  let discovery = null
  let currentTopic = null
  const state = {
    topic: '',
    connecting: 0,
    connections: 0,
    peers: 0
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
    conn.on('close', () => {
      state.connecting = swarm.connecting || 0
      state.connections = swarm.connections ? swarm.connections.size : 0
      state.peers = swarm.peers ? swarm.peers.size : 0
      emit()
    })
  })

  async function join (token) {
    const topic = topicFromToken(token)
    if (currentTopic && Buffer.isBuffer(currentTopic) && currentTopic.equals(topic)) {
      return { ...state }
    }
    await leave()
    currentTopic = topic
    state.topic = topic.toString('hex')
    discovery = swarm.join(topic, { server: true, client: true })
    await discovery.flushed()
    state.connecting = swarm.connecting || 0
    state.connections = swarm.connections ? swarm.connections.size : 0
    state.peers = swarm.peers ? swarm.peers.size : 0
    emit()
    return { ...state }
  }

  async function leave () {
    if (!discovery) return
    await discovery.destroy()
    discovery = null
    currentTopic = null
    state.topic = ''
    state.connecting = 0
    state.connections = 0
    state.peers = 0
    emit()
  }

  async function close () {
    await leave()
    await swarm.destroy()
  }

  return { join, leave, close, onUpdate, state: () => ({ ...state }) }
}
