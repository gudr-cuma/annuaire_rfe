/**
 * importSession.js — Session d'import mono-secret, sans état serveur.
 *
 * Pas de table `sessions` en D1 : le cookie est auto-porteur, signé en HMAC-SHA256
 * avec IMPORT_SECRET comme clé. Vérifier un cookie ne nécessite donc aucun accès base.
 */

const SESSION_COOKIE = 'rfe_import_session';

export function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k.trim() === name) return v.join('=').trim();
  }
  return null;
}

export function getImportSessionCookie(request) {
  return parseCookie(request.headers.get('Cookie') || '', SESSION_COOKIE);
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Compare deux chaînes en temps constant (évite une fuite de timing sur la comparaison du secret). */
export function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a || '');
  const bBytes = enc.encode(b || '');
  const len = Math.max(aBytes.length, bBytes.length, 1);
  let diff = aBytes.length === bBytes.length ? 0 : 1;
  for (let i = 0; i < len; i++) diff |= (aBytes[i] || 0) ^ (bBytes[i] || 0);
  return diff === 0;
}

/** Crée un token de session signé, valide jusqu'à `expiresAtMs`. */
export async function signSession(secret, expiresAtMs) {
  const sig = await hmacHex(secret, String(expiresAtMs));
  return `${expiresAtMs}.${sig}`;
}

/** Vérifie un token de session : signature valide et non expirée. */
export async function verifySession(secret, token) {
  if (!token) return false;
  const [expiresAtRaw, sig] = token.split('.');
  const expiresAtMs = Number(expiresAtRaw);
  if (!expiresAtMs || !sig) return false;
  if (Date.now() > expiresAtMs) return false;
  const expectedSig = await hmacHex(secret, String(expiresAtMs));
  return timingSafeEqual(sig, expectedSig);
}

export function buildImportSessionCookie(token, durationHours) {
  const maxAge = Math.round(durationHours * 3600);
  return [
    `${SESSION_COOKIE}=${token}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}

export function clearImportSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ');
}
