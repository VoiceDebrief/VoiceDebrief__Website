/* The scripted OpenRouter used by the QA-to-docs journeys (issue 038) — the
   same deterministic playbook as tests/integration/chat-loop.test.mjs: every
   run gets byte-identical LLM output, which is what makes screenshot diffs
   meaningful. Keyless: the "key" the journeys save is a mock. */

export const MOCK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">' +
    '<rect width="400" height="200" fill="#0b1f3a"/>' +
    '<text x="20" y="60" fill="#8ff0b6" font-size="22" font-family="monospace">VOICE NOTE — KEY POINTS</text>' +
    '<rect x="20" y="90" width="360" height="4" fill="#25d366"/>' +
    '<text x="20" y="130" fill="#fff" font-size="14" font-family="monospace">• a voice memo recorded for tests</text>' +
    '<text x="20" y="160" fill="#fff" font-size="14" font-family="monospace">• deterministic by design</text></svg>'

export async function installMockOpenRouter(page) {
    const jsonReply = (content, id) => JSON.stringify({ id,
        choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 40, completion_tokens: 20, cost: 0.0005 } })
    let n = 0
    await page.route('https://openrouter.ai/**', async route => {
        const req = route.request()
        const cors = { 'access-control-allow-origin': '*',
            'access-control-allow-headers': 'authorization,content-type,http-referer,x-title',
            'access-control-allow-methods': 'GET,POST,OPTIONS' }
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
        const u = new URL(req.url())
        if (!u.pathname.includes('/chat/completions'))
            return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: '{"data":{}}' })
        const body = JSON.parse(req.postData() || '{}')
        const id = 'gen-mock-' + (++n)
        const all = JSON.stringify(body.messages || [])
        const lastMsg = (() => { const m = (body.messages || []).slice(-1)[0]
            return typeof m?.content === 'string' ? m.content : JSON.stringify(m?.content || '') })()
        if (body.stream) {
            const sse = `data: ${JSON.stringify({ id, choices: [{ delta: { content: MOCK_SVG } }] })}\n\n` +
                        `data: ${JSON.stringify({ id, choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 30, completion_tokens: 60, cost: 0.0007 } })}\n\n` +
                        `data: [DONE]\n\n`
            return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'text/event-stream' }, body: sse })
        }
        let content
        if (all.includes('Transcribe the following audio')) content = 'This is me recording a voice memo that we can use in our tests.'
        // The translate step (issue 055) and the summary built FROM a translation.
        // Both are ordinary chat calls, so they are matched on their prompt text —
        // and the fixtures are genuinely Portuguese, so a test asserting the
        // summary is localised is asserting something real.
        /* The classify step (issue 061). The fixture transcript is English, so
           the honest answer is English with high confidence — which means an
           en-GB reader's run legitimately SKIPS translation and a pt-PT reader's
           does not. The mock must not shortcut that: the decision under test is
           made from this JSON, so returning a fixed answer would test nothing. */
        else if (/returning metadata about it/i.test(all)) {
            content = JSON.stringify({
                language: { code: 'en', name: 'English', confidence: 0.97 },
                topics: ['test recording', 'workflow checks'],
                register: 'casual', sentiment: 'neutral', urgency: 'low',
                signals: [],
                summaryLine: 'A short test recording made to exercise the workflow',
            })
        }
        else if (/You are translating the transcript/i.test(all)) {
            // Honour the requested language, the way the real prompt asks: text
            // already in the target comes back unchanged. A mock that always
            // answered in Portuguese made the English journey produce a
            // Portuguese summary — a fixture bug that looked like a product bug.
            content = /into Portuguese/i.test(all)
                ? 'Estou a gravar um memorando de voz que podemos usar nos nossos testes.'
                : 'This is me recording a voice memo that we can use in our tests.'
        }
        else if (all.includes('Write a summary document') && /memorando de voz/i.test(all))
            content = '## Pontos principais\n- um memorando de voz para testes'
        else if (all.includes('Write a summary document')) content = '## Key points\n- a voice memo for tests'
        else if (all.includes('answering questions about the following audio')) content = '## Key points\n- a voice memo for tests'
        else if (lastMsg.includes('TOOL RESULT')) content = 'Done — the drawn SVG infographic is now on the page.'
        else if (/generate the infographic/i.test(lastMsg)) content = 'On it.\n```tool\n{"action":"redraw_infographic","params":{"model":"google/gemini-3.5-flash"}}\n```'
        else if (/translate the summary/i.test(lastMsg)) content = '```tool\n{"action":"update_summary","params":{"text":"## Puntos clave\\n- una nota de voz para pruebas"}}\n```'
        else content = 'The voice memo says it was recorded to be used in tests.'
        return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: jsonReply(content, id) })
    })
}
