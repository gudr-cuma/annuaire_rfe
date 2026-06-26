export async function checkRateLimit(kv, ip, maxAttempts, windowSeconds) {
  const raw = await kv.get(`ratelimit:login:${ip}`)
  return !raw || Number(raw) < maxAttempts
}

export async function incrementRateLimit(kv, ip, windowSeconds) {
  const key = `ratelimit:login:${ip}`
  const raw = await kv.get(key)
  const next = (raw ? Number(raw) : 0) + 1
  await kv.put(key, String(next), { expirationTtl: windowSeconds })
}

export async function clearRateLimit(kv, ip) {
  await kv.delete(`ratelimit:login:${ip}`)
}
