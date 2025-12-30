import test from 'brittle'
import {
  encodeMessage,
  decodeMessage,
  makeHello,
  makeConsentState,
  makeHeartbeat,
  Protocol
} from '../protocol.js'

test('protocol roundtrip: hello/consent/heartbeat', (t) => {
  const hello = makeHello('ichnaea')
  const consent = makeConsentState('c1', 'approved')
  const hb = makeHeartbeat(123)

  t.alike(decodeMessage(encodeMessage(hello)), hello, 'hello roundtrips')
  t.alike(decodeMessage(encodeMessage(consent)), consent, 'consent roundtrips')
  t.alike(decodeMessage(encodeMessage(hb)), hb, 'heartbeat roundtrips')
})

test('protocol rejects invalid messages', (t) => {
  t.exception(() => decodeMessage('{'), /Invalid JSON/, 'invalid json rejected')

  t.exception(() => encodeMessage({ type: 'hello', version: Protocol.VERSION }), /hello\.app required/, 'missing hello.app')
  t.exception(() => encodeMessage({ type: 'consent-state', version: Protocol.VERSION, contactId: 'c1' }), /consent\.status required/, 'missing consent.status')
  t.exception(() => encodeMessage({ type: 'heartbeat', version: Protocol.VERSION }), /heartbeat\.ts required/, 'missing heartbeat.ts')
  t.exception(() => encodeMessage({ type: 'unknown', version: Protocol.VERSION }), /Unknown message type/, 'unknown type rejected')
  t.exception(() => encodeMessage({ type: 'hello', version: 999, app: 'x' }), /Protocol version mismatch/, 'version mismatch rejected')
})
