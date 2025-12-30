import test from 'brittle'
import {
  createOutgoingRequest,
  acceptIncomingToken,
  approveContact,
  denyContact,
  listContacts
} from '../consent.js'
import { loadStore } from '../store.js'

function makeMemoryIO () {
  let persisted = null
  return {
    storage: {},
    read: async () => persisted,
    write: async (_storage, data) => { persisted = data }
  }
}

test('outgoing request generates token and pending contact', async (t) => {
  const io = makeMemoryIO()
  const res = await createOutgoingRequest(io)
  t.ok(res.token, 'token generated')
  t.is(res.contact.status, 'pending', 'status pending')
  t.is(res.contact.direction, 'outgoing', 'direction outgoing')
  t.is(res.contact.token, res.token, 'token stored on contact')
})

test('incoming token creates pending contact', async (t) => {
  const io = makeMemoryIO()
  const contact = await acceptIncomingToken('abc123', io)
  t.is(contact.status, 'pending', 'status pending')
  t.is(contact.direction, 'incoming', 'direction incoming')
  t.is(contact.token, 'abc123', 'token stored')
})

test('approve/deny persist locally', async (t) => {
  const io = makeMemoryIO()
  const c1 = await acceptIncomingToken('tok1', io)
  const c2 = await acceptIncomingToken('tok2', io)

  await approveContact(c1.id, io)
  await denyContact(c2.id, io)

  const store = await loadStore(io)
  t.is(store.contacts[c1.id].status, 'approved', 'approved persisted')
  t.is(store.contacts[c2.id].status, 'denied', 'denied persisted')
})

test('listContacts returns contacts', async (t) => {
  const io = makeMemoryIO()
  await acceptIncomingToken('tok3', io)
  const list = await listContacts(io)
  t.is(list.length, 1, 'one contact listed')
})
