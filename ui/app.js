/** @typedef {import('pear-interface')} */ /* global Pear */
import getPipe from 'pear-pipe'
import * as THREE from 'three'
import Globe from 'three-globe'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

function line (label, ok, detail = '') {
  const mark = ok ? 'OK ' : 'NO '
  return `${mark}${label}${detail ? ` — ${detail}` : ''}`
}

function setStatus (text, ok) {
  const el = document.getElementById('status')
  el.textContent = text
  el.className = ok ? 'ok' : 'bad'
}

function setText (id, value) {
  const el = document.getElementById(id)
  if (el) el.textContent = value
}

function setHtml (id, html) {
  const el = document.getElementById(id)
  if (el) el.innerHTML = html
}

function esc (s) {
  return String(s).replace(/[&<>"']/g, (m) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[m]
  })
}

async function main () {
  const details = []

  // DOM check
  const domOk = typeof document !== 'undefined' && typeof window !== 'undefined'
  details.push(line('DOM available', domOk))

  // Pear check
  const pearOk = typeof Pear !== 'undefined' && Pear && typeof Pear === 'object'
  details.push(line('Pear global available', pearOk))

  if (pearOk) {
    const keys = Object.keys(Pear || {})
    details.push(line('Pear keys (sample)', true, keys.slice(0, 24).join(', ')))
  }

  const ok = domOk && pearOk

  // Identity + consent + networking (via parent pipe)
  const pipe = getPipe()
  if (!pipe) {
    details.push(line('Identity ready', false, 'No parent pipe available'))
    setText('pubkey', '—')
    setText('created', '—')
    setStatus(details.join('\n'), ok)
    return
  }

  details.push(line('Identity channel', true, 'pear-pipe'))
  const decoder = new TextDecoder()
  const pending = new Map()
  let identityReceived = false

  function send (type, payload = {}) {
    const id = Math.random().toString(36).slice(2)
    pipe.write(JSON.stringify({ id, type, ...payload }))
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (!pending.has(id)) return
        pending.delete(id)
        reject(new Error('Request timed out'))
      }, 5000)
    })
  }

  function updateSwarmStatus (state) {
    if (!state || !state.topic) {
      setText('swarm-status', 'Disconnected.')
      return
    }
    const last = state.lastConnectedAt
      ? `last=${new Date(state.lastConnectedAt).toISOString()}`
      : 'last=—'
    const secure = state.secure ? `secure=YES (${state.relationshipId.slice(0, 12)}…)` : 'secure=NO'
    const parts = [
      `topic=${state.topic.slice(0, 16)}…`,
      `connecting=${state.connecting || 0}`,
      `connections=${state.connections || 0}`,
      `peers=${state.peers || 0}`,
      last,
      secure
    ]
    setText('swarm-status', parts.join(' | '))
  }

  // Globe setup
  const globeState = {
    globe: null,
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    contacts: [],
    points: [],
    markers: null
  }

  async function loadAssetUrl (path) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(path, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`Failed to load ${path}`)
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  }

  async function initGlobe () {
    const container = document.getElementById('globe')
    if (!container) return
    try {
    setText('globe-status', 'Globe loading…')

    const width = container.clientWidth || 800
    const height = container.clientHeight || 320

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
    camera.position.z = 250

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    setText('globe-status', 'Globe loading textures…')
    const earthTex = await loadAssetUrl('./assets/earth-blue-marble.jpg')
    setText('globe-status', 'Globe loading textures… (1/2)')
    const topoTex = await loadAssetUrl('./assets/earth-topology.png')
    setText('globe-status', 'Globe loading textures… (2/2)')

    const globe = new Globe()
      .globeImageUrl(earthTex)
      .bumpImageUrl(topoTex)
      .showAtmosphere(true)
      .atmosphereColor('#1f3b5b')
      .atmosphereAltitude(0.12)

    const globeBase = globe.globeMaterial()
    globeBase.wireframe = false

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(1, 1, 1)

    scene.add(ambient)
    scene.add(dir)
    scene.add(globe)
    const markers = new THREE.Group()
    scene.add(markers)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 120
    controls.maxDistance = 500
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.6

    globeState.globe = globe
    globeState.renderer = renderer
    globeState.scene = scene
    globeState.camera = camera
    globeState.controls = controls
    globeState.markers = markers

    setText('globe-status', 'Globe loading…')
    // three-globe doesn't provide onPointClick in this version; click handling is manual.

    const cities = [
      { name: 'New York', lat: 40.7128, lon: -74.0060, pop: 18800000 },
      { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, pop: 12800000 },
      { name: 'London', lat: 51.5074, lon: -0.1278, pop: 9300000 },
      { name: 'Paris', lat: 48.8566, lon: 2.3522, pop: 11000000 },
      { name: 'Tokyo', lat: 35.6895, lon: 139.6917, pop: 37000000 },
      { name: 'Seoul', lat: 37.5665, lon: 126.9780, pop: 9800000 },
      { name: 'Beijing', lat: 39.9042, lon: 116.4074, pop: 21500000 },
      { name: 'Shanghai', lat: 31.2304, lon: 121.4737, pop: 26300000 },
      { name: 'Hong Kong', lat: 22.3193, lon: 114.1694, pop: 7500000 },
      { name: 'Singapore', lat: 1.3521, lon: 103.8198, pop: 5600000 },
      { name: 'Sydney', lat: -33.8688, lon: 151.2093, pop: 5300000 },
      { name: 'Mumbai', lat: 19.0760, lon: 72.8777, pop: 20000000 },
      { name: 'Delhi', lat: 28.6139, lon: 77.2090, pop: 30000000 },
      { name: 'Dubai', lat: 25.2048, lon: 55.2708, pop: 3300000 },
      { name: 'São Paulo', lat: -23.5505, lon: -46.6333, pop: 22000000 },
      { name: 'Mexico City', lat: 19.4326, lon: -99.1332, pop: 21500000 },
      { name: 'Toronto', lat: 43.6532, lon: -79.3832, pop: 6200000 },
      { name: 'Cairo', lat: 30.0444, lon: 31.2357, pop: 20000000 },
      { name: 'Lagos', lat: 6.5244, lon: 3.3792, pop: 15000000 },
      { name: 'Johannesburg', lat: -26.2041, lon: 28.0473, pop: 5500000 }
    ]

    globe.labelsData(cities)
      .labelLat(d => d.lat)
      .labelLng(d => d.lon)
      .labelText(d => d.name)
      .labelSize(d => Math.max(0.4, Math.min(1.4, d.pop / 1e7)))
      .labelColor(() => 'rgba(255,255,255,0.7)')
      .labelDotRadius(d => Math.max(0.2, Math.min(1.2, d.pop / 2e7)))
      .labelResolution(2)

    const resize = () => {
      const w = container.clientWidth || 800
      const h = container.clientHeight || 320
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    resize()
    setTimeout(resize, 100)
    window.addEventListener('resize', resize)

    let firstFrame = true
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const globeWrap = document.getElementById('globe-wrap')
    const globeTooltip = document.getElementById('globe-tooltip')
    let tooltipTimer = null
    let pointerDown = null
    let isDragging = false

    controls.addEventListener('start', () => { isDragging = true })
    controls.addEventListener('end', () => { isDragging = false })

    const showTooltip = (text, clientX, clientY) => {
      if (!globeTooltip || !globeWrap) return
      globeTooltip.textContent = text
      const rect = globeWrap.getBoundingClientRect()
      const left = Math.max(8, Math.min(clientX - rect.left + 8, rect.width - 8))
      const top = Math.max(8, Math.min(clientY - rect.top - 8, rect.height - 8))
      globeTooltip.style.left = `${left}px`
      globeTooltip.style.top = `${top}px`
      globeTooltip.classList.add('visible')
      if (tooltipTimer) clearTimeout(tooltipTimer)
      tooltipTimer = setTimeout(() => {
        globeTooltip.classList.remove('visible')
      }, 2200)
    }

    const pickPoint = (event) => {
      if (!globeState.points.length) return null
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)

      const globeObj = globe
      const intersects = raycaster.intersectObject(globeObj, true)
      if (!intersects.length) return null
      const hit = intersects[0].point
      const r = hit.length()
      const lat = 90 - (Math.acos(hit.y / r) * 180 / Math.PI)
      const lon = (Math.atan2(hit.z, hit.x) * 180 / Math.PI) - 180

      let best = null
      let bestDist = Infinity
      for (const p of globeState.points) {
        const dLat = p.lat - lat
        const dLon = p.lon - lon
        const d = Math.sqrt(dLat * dLat + dLon * dLon)
        if (d < bestDist) {
          bestDist = d
          best = p
        }
      }
      if (best && bestDist < 20) {
        return { point: best, lat, lon }
      }
      return null
    }

    renderer.domElement.addEventListener('pointerdown', (event) => {
      pointerDown = { x: event.clientX, y: event.clientY }
    })
    renderer.domElement.addEventListener('pointerup', (event) => {
      if (!pointerDown) return
      const dx = event.clientX - pointerDown.x
      const dy = event.clientY - pointerDown.y
      const moved = Math.hypot(dx, dy) > 6
      pointerDown = null
      if (isDragging || moved) return
      const hit = pickPoint(event)
      if (!hit) return
      const label = hit.point.label || `${hit.point.lat.toFixed(4)}, ${hit.point.lon.toFixed(4)}`
      setText('globe-status', `Pin: ${label}`)
      showTooltip(`Lat ${hit.point.lat.toFixed(4)}, Lon ${hit.point.lon.toFixed(4)}`, event.clientX, event.clientY)
    })

    function animate () {
      controls.update()
      renderer.render(scene, camera)
      if (firstFrame) {
        firstFrame = false
        setText('globe-status', 'Globe ready. Drag to spin / scroll to zoom.')
        updatePins(globeState.contacts || [])
      }
      requestAnimationFrame(animate)
    }
    animate()
    } catch (err) {
      setText('globe-status', `Globe init failed: ${String(err?.message || err)}`)
      console.error('globe init failed', err)
    }
  }

  let lastFocusId = ''
  function focusGlobe (lat, lon) {
    if (!globeState.globe || !globeState.controls) return
    const g = globeState.globe
    const latR = (lat * Math.PI) / 180
    const lonR = (lon * Math.PI) / 180
    g.rotation.y = -lonR
    g.rotation.x = latR * -1
    globeState.controls.update()
  }

  function updatePins (contacts) {
    if (!globeState.globe) return
    const points = contacts
      .filter(c => c.location)
      .map(c => ({
        lat: c.location.lat,
        lon: c.location.lon,
        size: 0.6,
        color: '#FF5D5D',
        label: `${c.location.lat.toFixed(4)}, ${c.location.lon.toFixed(4)}`
      }))
    // Debug pin only if there are no real locations
    if (!points.length) {
      points.push({ lat: 45, lon: 45, size: 0.6, color: '#00E5FF', label: '45.0000, 45.0000' })
    }
    globeState.points = points
    const g = globeState.globe
    g.pointsData(points)
    if (typeof g.pointLat === 'function') g.pointLat(d => d.lat)
    if (typeof g.pointLng === 'function') g.pointLng(d => d.lon)
    if (typeof g.pointColor === 'function') g.pointColor(() => 'rgba(0,0,0,0)')
    if (typeof g.pointRadius === 'function') g.pointRadius(() => 0)
    if (typeof g.pointAltitude === 'function') g.pointAltitude(() => 0)
    if (typeof g.pointLabel === 'function') g.pointLabel(d => d.label)
    if (typeof g.pointsMerge === 'function') g.pointsMerge(false)

    if (points.length && typeof g.pointOfView === 'function') {
      const first = points[0]
      if (lastFocusId !== first.label) {
        lastFocusId = first.label
        g.pointOfView({ lat: first.lat, lng: first.lon, altitude: 1.8 }, 1000)
        focusGlobe(first.lat, first.lon)
      }
    } else if (points.length) {
      const first = points[0]
      if (lastFocusId !== first.label) {
        lastFocusId = first.label
        focusGlobe(first.lat, first.lon)
      }
    }

    if (typeof g.ringsData === 'function') {
      g.ringsData(points)
      if (typeof g.ringLat === 'function') g.ringLat(d => d.lat)
      if (typeof g.ringLng === 'function') g.ringLng(d => d.lon)
      if (typeof g.ringColor === 'function') g.ringColor(() => 'rgba(255,209,102,0.7)')
      if (typeof g.ringMaxRadius === 'function') g.ringMaxRadius(() => 3)
      if (typeof g.ringPropagationSpeed === 'function') g.ringPropagationSpeed(() => 2)
      if (typeof g.ringRepeatPeriod === 'function') g.ringRepeatPeriod(() => 800)
    }

    // Fallback: draw explicit 3D markers in scene so pins always show.
    if (globeState.markers) {
      globeState.markers.clear()
      const radius = typeof g.getGlobeRadius === 'function' ? g.getGlobeRadius() : 100
      const pinHeight = radius * 0.06
      const headRadius = radius * 0.018
      const tipRadius = radius * 0.006
      for (const p of points) {
        const latR = (p.lat * Math.PI) / 180
        const lonR = (p.lon * Math.PI) / 180
        const r = radius * 1.02
        const x = r * Math.cos(latR) * Math.cos(lonR)
        const y = r * Math.sin(latR)
        const z = r * Math.cos(latR) * Math.sin(lonR)
        const pin = new THREE.Group()
        const pinColor = new THREE.Color(p.color || '#ff4a4a')
        const pinMaterial = new THREE.MeshStandardMaterial({
          color: pinColor,
          roughness: 0.35,
          metalness: 0.15
        })
        const body = new THREE.Mesh(
          new THREE.ConeGeometry(tipRadius, pinHeight, 20),
          pinMaterial
        )
        body.rotation.x = Math.PI
        body.position.y = pinHeight / 2
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(headRadius, 20, 20),
          pinMaterial
        )
        head.position.y = pinHeight + headRadius * 0.25
        const inner = new THREE.Mesh(
          new THREE.SphereGeometry(headRadius * 0.35, 16, 16),
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.6,
            metalness: 0
          })
        )
        inner.position.y = head.position.y
        inner.position.z = headRadius * 0.55
        pin.add(body, head, inner)
        const normal = new THREE.Vector3(x, y, z).normalize()
        pin.position.set(x, y, z)
        pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
        globeState.markers.add(pin)
      }
    }
  }

  pipe.on('data', (data) => {
    let msg = null
    const text = decoder.decode(data).replace(/\0/g, '').trim()
    try {
      msg = JSON.parse(text)
    } catch {
      return
    }

    if (msg?.type === 'identity') {
      const pubHex = msg.publicKey || ''
      const err = msg.error || ''
      details.push(line('Identity ready', !!pubHex, pubHex ? `pub=${pubHex.slice(0, 32)}…` : (err || 'missing key')))
      setText('pubkey', pubHex || '—')
      setText('created', msg.created ? new Date(msg.created).toISOString() : '—')
      setStatus(details.join('\n'), ok && !!pubHex)
      identityReceived = true
      return
    }

    if (msg?.type === 'swarm:update') {
      updateSwarmStatus(msg.state)
      return
    }

    if (msg?.type === 'location:update') {
      refreshContacts()
      return
    }

    if (msg?.type === 'location:manual') {
      const loc = msg.location
      if (loc) {
        setText('manual-status', `${loc.lat}, ${loc.lon}`)
      }
      return
    }

    if (msg?.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.type === 'error') reject(new Error(msg.message || 'error'))
      else resolve(msg)
    }
  })

  pipe.write(JSON.stringify({ type: 'request-identity' }))
  setStatus(details.join('\n'), ok)

  async function refreshContacts () {
    const res = await send('contact:list')
    const contacts = res.contacts || []
    if (!contacts.length) {
      setText('contacts', 'No contacts yet.')
      updatePins([])
      return
    }
    const rows = contacts.map((c) => {
      const token = c.token ? c.token.slice(0, 12) + '…' : '—'
      const status = c.status || '—'
      const direction = c.direction || '—'
      const share = c.shareLocation ? 'sharing' : 'not-sharing'
      const loc = c.location
        ? `${c.location.lat.toFixed(4)}, ${c.location.lon.toFixed(4)} @ ${new Date(c.location.updatedAt).toISOString()}`
        : '—'
      const approve = status === 'pending' ? `<button data-act="approve" data-id="${c.id}">Approve</button>` : ''
      const deny = status === 'pending' ? `<button data-act="deny" data-id="${c.id}">Deny</button>` : ''
      const toggle = status === 'approved'
        ? `<button data-act="share" data-id="${c.id}" data-share="${c.shareLocation ? '1' : '0'}">${c.shareLocation ? 'Stop' : 'Share'}</button>`
        : ''
      const del = `<button data-act="delete" data-id="${c.id}">Remove</button>`
      return `<div class="kv">` +
        `<code>${esc(c.id)}</code> ` +
        `<span>${esc(direction)}</span> ` +
        `<span>${esc(status)}</span> ` +
        `<span>${esc(token)}</span> ` +
        `<span>${esc(share)}</span> ` +
        `<span>${esc(loc)}</span> ` +
        `${approve} ${deny} ${toggle} ${del}` +
      `</div>`
    })
    setHtml('contacts', rows.join(''))
    updatePins(contacts)
  }

  const btnCreate = document.getElementById('btn-create-token')
  const btnClear = document.getElementById('btn-clear-contacts')
  const btnAccept = document.getElementById('btn-accept-token')
  const inputToken = document.getElementById('incoming-token')
  const btnJoin = document.getElementById('btn-join-swarm')
  const btnLeave = document.getElementById('btn-leave-swarm')
  const inputLat = document.getElementById('manual-lat')
  const inputLon = document.getElementById('manual-lon')
  const btnSetLoc = document.getElementById('btn-set-location')

  if (btnCreate) {
    btnCreate.addEventListener('click', async () => {
      const res = await send('consent:create-token')
      setText('outgoing-token', res.token || '—')
      await refreshContacts()
    })
  }
  if (btnAccept) {
    btnAccept.addEventListener('click', async () => {
      const token = inputToken?.value || ''
      if (!token.trim()) return
      await send('consent:accept-token', { token: token.trim() })
      if (inputToken) inputToken.value = ''
      await refreshContacts()
    })
  }
  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      const res = await send('contact:list')
      const contacts = res.contacts || []
      for (const c of contacts) {
        await send('contact:delete', { contactId: c.id })
      }
      await refreshContacts()
    })
  }
  if (btnSetLoc) {
    btnSetLoc.addEventListener('click', async () => {
      const lat = inputLat?.value || ''
      const lon = inputLon?.value || ''
      await send('location:set-manual', { lat, lon })
    })
  }

  if (btnJoin) {
    btnJoin.addEventListener('click', async () => {
      const token = inputToken?.value || ''
      if (!token.trim()) return
      const res = await send('swarm:join', { token: token.trim() })
      updateSwarmStatus(res.state)
    })
  }
  if (btnLeave) {
    btnLeave.addEventListener('click', async () => {
      const res = await send('swarm:leave')
      updateSwarmStatus(res.state)
    })
  }

  document.addEventListener('click', async (e) => {
    const target = e.target
    if (!(target instanceof HTMLElement)) return
    const act = target.dataset.act
    const id = target.dataset.id
    if (!act || !id) return
    if (act === 'approve') await send('consent:approve', { contactId: id })
    if (act === 'deny') await send('consent:deny', { contactId: id })
    if (act === 'share') {
      const current = target.dataset.share === '1'
      await send('location:toggle', { contactId: id, enabled: !current })
    }
    if (act === 'delete') {
      await send('contact:delete', { contactId: id })
    }
    await refreshContacts()
  })

  await refreshContacts()
  initGlobe()

  // Retry identity request once if it hasn't arrived yet.
  setTimeout(() => {
    if (!identityReceived) pipe.write(JSON.stringify({ type: 'request-identity' }))
  }, 1500)
}

main()
