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

  // Identity (via parent pipe)
  const pipe = getPipe()
  if (!pipe) {
    details.push(line('Identity ready', false, 'No parent pipe available'))
    setText('pubkey', '—')
    setText('created', '—')
  } else {
    details.push(line('Identity channel', true, 'pear-pipe'))

    const decoder = new TextDecoder()
    pipe.on('data', (data) => {
      let msg = null
      try {
        msg = JSON.parse(decoder.decode(data))
      } catch (err) {
        return
      }
      if (msg?.type !== 'identity') return

      const pubHex = msg.publicKey || ''
      details.push(line('Identity ready', !!pubHex, pubHex ? `pub=${pubHex.slice(0, 32)}…` : 'missing key'))

      setText('pubkey', pubHex || '—')
      setText('created', msg.created ? new Date(msg.created).toISOString() : '—')
      setStatus(details.join('\n'), ok && !!pubHex)
    })

    pipe.write('request-identity')
  }
  setStatus(details.join('\n'), ok)
}

main()
