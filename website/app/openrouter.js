/* openrouter.js — read-only OpenRouter inspection for the debug pane (issue 027).

   Three lookups, all straight from the browser with the user's own key:
     - GET /api/v1/generation?id=…   the billed record for one generation id
     - GET /api/v1/key               what OpenRouter says about the pasted key
     - GET /api/v1/models            the public model catalogue (cached; no auth)

   Nothing is stored; these exist so an advanced user can see exactly what the
   provider saw and charged. */

const OR = 'https://openrouter.ai/api/v1'

async function orFetch(path, key) {
    const r = await fetch(OR + path, { headers: key ? { Authorization: `Bearer ${key}` } : {} })
    if (!r.ok) {
        const body = await r.text().catch(() => '')
        throw Object.assign(new Error(`OpenRouter ${path.split('?')[0]} → HTTP ${r.status}${body ? ': ' + body.slice(0, 200) : ''}`),
            { code: r.status === 401 ? 'key-invalid' : 'openrouter-http-' + r.status, status: r.status })
    }
    return r.json()
}

/** The generation record can lag the stream by a moment — retry briefly. */
export async function fetchGeneration({ id, apiKey, retries = 3, delayMs = 1200 }) {
    if (!id) throw Object.assign(new Error('fetchGeneration requires { id }'), { code: 'bad-params' })
    if (!apiKey) throw Object.assign(new Error('an OpenRouter key is needed to read generation records'), { code: 'no-key' })
    let lastErr
    for (let i = 0; i <= retries; i++) {
        try {
            const j = await orFetch(`/generation?id=${encodeURIComponent(id)}`, apiKey)
            return j.data || j
        } catch (e) {
            lastErr = e
            if (e.status && e.status !== 404) throw e   // only "not there yet" is worth retrying
            if (i < retries) await new Promise(r => setTimeout(r, delayMs))
        }
    }
    throw lastErr
}

export async function fetchKeyStatus({ apiKey }) {
    if (!apiKey) throw Object.assign(new Error('no key saved'), { code: 'no-key' })
    const j = await orFetch('/key', apiKey)
    return j.data || j
}

let modelCatalogue = null
export async function fetchModelDetails({ ids = [] }) {
    modelCatalogue ??= (await orFetch('/models')).data || []
    if (!ids.length) return modelCatalogue
    return ids.map(id => modelCatalogue.find(m => m.id === id) || { id, missing: true })
}
