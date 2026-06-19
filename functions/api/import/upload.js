import { json, error, unauthorized, methodNotAllowed } from '../../_lib/responses.js'
import { getImportSessionCookie, verifySession } from '../../_lib/importSession.js'
import { detectDelimiter, parseCSV } from '../../_lib/csv.js'
import { computeDepartement } from '../../_lib/merge.js'

const DOSSIERS_EXPECTED_COLS = 8
const FACTURATION_EXPECTED_COLS = 5
const BATCH_CHUNK_SIZE = 500

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function readCsvFile(file) {
  const text = await file.text()
  const firstLine = text.split(/\r\n|\n|\r/)[0] || ''
  const delimiter = detectDelimiter(firstLine)
  return parseCSV(text, delimiter)
}

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'POST') return methodNotAllowed()

  if (!env.IMPORT_SECRET) {
    return error('IMPORT_SECRET non configuré côté serveur.', 500)
  }
  const token = getImportSessionCookie(request)
  if (!(await verifySession(env.IMPORT_SECRET, token))) {
    return unauthorized('Session import expirée ou invalide. Reconnectez-vous.')
  }

  let formData
  try {
    formData = await request.formData()
  } catch {
    return error('Corps de requête multipart invalide.', 400)
  }

  const dossiersFile = formData.get('dossiers')
  const facturationFile = formData.get('facturation')
  if (!dossiersFile || !facturationFile) {
    return error('Les deux fichiers (dossiers, facturation) sont requis.', 400)
  }

  const dossiersParsed = await readCsvFile(dossiersFile)
  const facturationParsed = await readCsvFile(facturationFile)

  if (dossiersParsed.headers.length < DOSSIERS_EXPECTED_COLS) {
    return error(
      `Fichier Dossiers : format inattendu (${dossiersParsed.headers.length} colonnes au lieu de ${DOSSIERS_EXPECTED_COLS}).`,
      400
    )
  }
  if (facturationParsed.headers.length < FACTURATION_EXPECTED_COLS) {
    return error(
      `Fichier Facturation : format inattendu (${facturationParsed.headers.length} colonnes au lieu de ${FACTURATION_EXPECTED_COLS}).`,
      400
    )
  }

  const importedAt = new Date().toISOString()

  const dossiersRows = dossiersParsed.rows.map(r => {
    const siren = (r[0] || '').trim()
    const cpostal = (r[2] || '').trim()
    return [
      siren,
      (r[1] || '').trim(),
      cpostal,
      computeDepartement(cpostal),
      (r[3] || '').trim(),
      (r[4] || '').trim(),
      (r[5] || '').trim(),
      (r[6] || '').trim(),
      (r[7] || '').trim(),
      importedAt,
    ]
  })

  const facturationRows = facturationParsed.rows.map(r => [
    (r[0] || '').trim(),
    (r[1] || '').trim(),
    (r[2] || '').trim(),
    (r[3] || '').trim(),
    (r[4] || '').trim(),
    importedAt,
  ])

  const db = env.DB

  try {
    await db.batch([db.prepare('DELETE FROM dossiers'), db.prepare('DELETE FROM facturation')])

    const dossiersStmt = db.prepare(
      'INSERT INTO dossiers (siren, nom, cpostal, departement, ville, un_gesdosno, dossier, federation, agc, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (const batch of chunk(dossiersRows, BATCH_CHUNK_SIZE)) {
      await db.batch(batch.map(row => dossiersStmt.bind(...row)))
    }

    const facturationStmt = db.prepare(
      'INSERT INTO facturation (siren, annuaire, plateforme, adresse_facturation, adresse_active, imported_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const batch of chunk(facturationRows, BATCH_CHUNK_SIZE)) {
      await db.batch(batch.map(row => facturationStmt.bind(...row)))
    }

    await db.prepare(
      `INSERT INTO import_meta (id, imported_at, dossiers_count, facturation_count, dossiers_filename, facturation_filename)
       VALUES (1, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         imported_at = excluded.imported_at,
         dossiers_count = excluded.dossiers_count,
         facturation_count = excluded.facturation_count,
         dossiers_filename = excluded.dossiers_filename,
         facturation_filename = excluded.facturation_filename`
    ).bind(
      importedAt,
      dossiersRows.length,
      facturationRows.length,
      dossiersFile.name,
      facturationFile.name
    ).run()
  } catch (err) {
    return error(
      `Erreur pendant l'import : ${err.message}. Les tables peuvent être partiellement vidées — relancez un import complet.`,
      500
    )
  }

  return json({
    ok: true,
    dossiers_count: dossiersRows.length,
    facturation_count: facturationRows.length,
    imported_at: importedAt,
  })
}
