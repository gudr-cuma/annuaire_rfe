/**
 * responses.js — Helpers de réponses HTTP avec headers de sécurité uniformes
 */

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options':        'DENY',
  'Referrer-Policy':        'strict-origin-when-cross-origin',
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

export function error(message, status = 400, extraHeaders = {}) {
  return json({ error: message }, status, extraHeaders);
}

export const unauthorized  = (msg = 'Non authentifié') => error(msg, 401);
export const forbidden     = (msg = 'Accès refusé') => error(msg, 403);
export const notFound      = (msg = 'Ressource introuvable') => error(msg, 404);
export const methodNotAllowed = () => error('Méthode non autorisée', 405);
