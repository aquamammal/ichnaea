/** @typedef {import('pear-interface')} */ /* global Pear */
import getPipe from 'pear-pipe'

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

  // Identity + consent (via parent pipe)
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

    if (msg?.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.type === 'error') reject(new Error(msg.message || 'error'))
      else resolve(msg)
    }
  })

  let identityReceived = false
  pipe.write(JSON.stringify({ type: 'request-identity' }))
  setStatus(details.join('\n'), ok)

  async function refreshContacts () {
    const res = await send('consent:list')
    const contacts = res.contacts || []
    if (!contacts.length) {
      setText('contacts', 'No contacts yet.')
      return
    }
    const rows = contacts.map((c) => {
      const token = c.token ? c.token.slice(0, 12) + '…' : '—'
      const status = c.status || '—'
      const direction = c.direction || '—'
      const approve = status === 'pending' ? `<button data-act="approve" data-id="${c.id}">Approve</button>` : ''
      const deny = status === 'pending' ? `<button data-act="deny" data-id="${c.id}">Deny</button>` : ''
      return `<div class="kv">` +
        `<code>${esc(c.id)}</code> ` +
        `<span>${esc(direction)}</span> ` +
        `<span>${esc(status)}</span> ` +
        `<span>${esc(token)}</span> ` +
        `${approve} ${deny}` +
      `</div>`
    })
    setHtml('contacts', rows.join(''))
  }

  const btnCreate = document.getElementById('btn-create-token')
  const btnAccept = document.getElementById('btn-accept-token')
  const inputToken = document.getElementById('incoming-token')

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

  document.addEventListener('click', async (e) => {
    const target = e.target
    if (!(target instanceof HTMLElement)) return
    const act = target.dataset.act
    const id = target.dataset.id
    if (!act || !id) return
    if (act === 'approve') await send('consent:approve', { contactId: id })
    if (act === 'deny') await send('consent:deny', { contactId: id })
    await refreshContacts()
  })

  await refreshContacts()

  // Retry identity request once if it hasn't arrived yet.
  setTimeout(() => {
    if (!identityReceived) pipe.write('request-identity')
  }, 1500)
}

main()
