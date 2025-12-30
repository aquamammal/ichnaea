import crypto from 'hypercore-crypto'
import { createContact, setContactStatus, loadStore, listContactSummaries } from './store.js'

export function generateToken () {
  return crypto.randomBytes(16).toString('hex')
}

export async function createOutgoingRequest (opts = {}) {
  const token = generateToken()
  const contact = await createContact({
    status: 'pending',
    direction: 'outgoing',
    token
  }, opts)
  return { token, contact }
}

export async function acceptIncomingToken (token, opts = {}) {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new Error('Token required')
  }
  const contact = await createContact({
    status: 'pending',
    direction: 'incoming',
    token: token.trim()
  }, opts)
  return contact
}

export async function approveContact (id, opts = {}) {
  return setContactStatus(id, 'approved', opts)
}

export async function denyContact (id, opts = {}) {
  return setContactStatus(id, 'denied', opts)
}

export async function listContacts (opts = {}) {
  return listContactSummaries(opts)
}
