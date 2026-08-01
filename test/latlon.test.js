import test from 'brittle'
import { validateLatLon } from '../latlon.js'

test('lat/lon validation accepts valid ranges', (t) => {
  const v = validateLatLon(12.34, -56.78)
  t.alike(v, { lat: 12.34, lon: -56.78 }, 'valid coords accepted')
})

test('lat/lon validation rejects invalid input', (t) => {
  t.exception(() => validateLatLon('x', 0), /numbers/, 'rejects non-numeric')
  t.exception(() => validateLatLon(100, 0), /Latitude/, 'rejects bad latitude')
  t.exception(() => validateLatLon(0, 200), /Longitude/, 'rejects bad longitude')
})
