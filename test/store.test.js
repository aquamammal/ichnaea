import test from 'brittle'
import {
  loadStore,
  createContact,
  setContactStatus,
  createRelationship,
  setLastKnownLocation,
  getLastKnownLocation
} from '../store.js'

function makeMemoryIO () {
  let persisted = null
  return {
    storage: {},
    read: async () => persisted,
    write: async (_storage, data) => { persisted = data }
  }
}

test('store schema + contact/relationship CRUD', async (t) => {
  const io = makeMemoryIO()

  const store0 = await loadStore(io)
  t.is(store0.version, 1, 'store has version')

  const c1 = await createContact({ id: 'c1', status: 'pending' }, io)
  t.is(c1.id, 'c1', 'contact created')
  t.is(c1.status, 'pending', 'contact status set')

  const c1b = await setContactStatus('c1', 'approved', io)
  t.is(c1b.status, 'approved', 'contact status updated')

  const rel = await createRelationship({ id: 'r1', contactId: 'c1' }, io)
  t.is(rel.contactId, 'c1', 'relationship ties to contact')
})

test('last-known location overwrites previous value', async (t) => {
  const io = makeMemoryIO()

  await createContact({ id: 'c2', status: 'approved' }, io)
  await setLastKnownLocation('c2', { lat: 1, lon: 2, updatedAt: 10 }, io)
  await setLastKnownLocation('c2', { lat: 3, lon: 4, updatedAt: 20 }, io)

  const loc = await getLastKnownLocation('c2', io)
  t.alike(loc, { lat: 3, lon: 4, updatedAt: 20 }, 'last-known overwrites')
})
