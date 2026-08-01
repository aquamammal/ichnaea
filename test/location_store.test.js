import test from 'brittle'
import { createContact, setLastKnownLocation, getLastKnownLocation } from '../store.js'

function makeMemoryIO () {
  let persisted = null
  return {
    storage: {},
    read: async () => persisted,
    write: async (_storage, data) => { persisted = data }
  }
}

test('last-known location overwrites previous value', async (t) => {
  const io = makeMemoryIO()
  await createContact({ id: 'c1', status: 'approved' }, io)
  await setLastKnownLocation('c1', { lat: 1, lon: 2, updatedAt: 10 }, io)
  await setLastKnownLocation('c1', { lat: 3, lon: 4, updatedAt: 20 }, io)
  const loc = await getLastKnownLocation('c1', io)
  t.alike(loc, { lat: 3, lon: 4, updatedAt: 20 }, 'last-known overwrites')
})
