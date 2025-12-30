export function validateLatLon (lat, lon) {
  const latNum = typeof lat === 'number' ? lat : Number(lat)
  const lonNum = typeof lon === 'number' ? lon : Number(lon)
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    throw new Error('Latitude/longitude must be numbers')
  }
  if (latNum < -90 || latNum > 90) throw new Error('Latitude out of range')
  if (lonNum < -180 || lonNum > 180) throw new Error('Longitude out of range')
  return { lat: latNum, lon: lonNum }
}
