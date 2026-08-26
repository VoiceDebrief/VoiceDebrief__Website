import { transcribe, detect, publishApi, unsupportedPlatformMessage, STEPS } from './transcribe-tool.js'

publishApi(window)

let currentMode = 'podcast'
let transcriptShown = false

const $ = (id) => document.getElementById(id)

function switchTab(mode) {
    if (mode === currentMode) return
    currentMode = mode
    $('tab-podcast').classList.toggle('tab-active', mode === 'podcast')
    $('tab-youtube').classList.toggle('tab-active', mode === 'youtube')
    $('url-input').placeholder = mode === 'podcast'
        ? 'https://feeds.npr.org/500005/podcast.xml' : 'https://youtube.com/watch?v=…'
    $('url-input').value = ''
    $('podcast-hint').classList.toggle('hidden', mode !== 'podcast')
    resetAll()
}

function resetAll() {
    transcriptShown = false
    ;['progress-card', 'info-card', 'summary-card', 'keypoints-card', 'transcript-card', 'topics-card']
        .forEach(id => $(id).classList.add('hidden'))
    $('error-box').classList.add('hidden')
    $('submit-btn').disabled = false
    renderSteps(-1)
}

function renderSteps(activeIdx) {
    const labels = STEPS[currentMode]
    let html = ''
    labels.forEach((label, i) => {
        const cls = activeIdx >= labels.length || i < activeIdx ? 'done' : i === activeIdx ? 'active' : ''
        const dot = cls === 'done' ? '&#10003;' : String(i + 1)
        html += `<div class="step ${cls}"><div class="dot">${dot}</div><span>${label}</span></div>`
        if (i < labels.length - 1) html += '<div class="step-line"></div>'
    })
    $('steps-row').innerHTML = html
}
const setStep = (n) => renderSteps(n - 1)
const markAllDone = () => renderSteps(STEPS[currentMode].length)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function fadeIn(el) { el.classList.remove('hidden', 'fade-in'); void el.offsetWidth; el.classList.add('fade-in') }

function showError(msg) {
    const box = $('error-box')
    box.textContent = msg
    box.classList.remove('hidden')
    $('submit-btn').disabled = false
}

function showSkeletons() {
    $('summary-loading').classList.add('hidden')
    const sb = $('summary-block')
    sb.querySelector('p').innerHTML = '<span class="skeleton w80"></span><span class="skeleton w60"></span>'
    fadeIn(sb)
    $('kp-list').innerHTML = [80, 70, 85, 65, 75]
        .map(w => `<li class="skeleton-li"><div class="sk-dot"></div><div class="sk-line" style="width:${w}%"></div></li>`)
        .join('')
    $('kp-list').classList.remove('hidden')
}

function showTranscriptCard(data) {
    const modeLabel = data.source === 'podcast' ? 'Podcast' : 'Channel'
    const titleLabel = data.source === 'podcast' ? 'Episode' : 'Title'

    const thumb = $('info-thumb')
    if (data.thumbnail) { thumb.src = data.thumbnail; thumb.classList.remove('hidden') }
    else thumb.classList.add('hidden')

    const metaParts = [
        data.sourceLabel ? `<span class="source-badge">${esc(data.sourceLabel)}</span>` : '',
        data.channel ? `<span class="meta-item"><strong>${modeLabel}:</strong> ${esc(data.channel)}</span>` : '',
        data.title ? `<span class="meta-item"><strong>${titleLabel}:</strong> ${esc(data.title)}</span>` : '',
        data.wordCount ? `<span class="meta-item"><strong>Words:</strong> ${Number(data.wordCount).toLocaleString()}</span>` : '',
        data.url ? `<span class="meta-item"><strong>Link:</strong> <a href="${esc(data.url)}" target="_blank" rel="noopener">Open</a></span>` : '',
    ].filter(Boolean)
    if (metaParts.length) { $('meta-row').innerHTML = metaParts.join(''); $('meta-row').classList.remove('hidden') }
    if (metaParts.length || data.thumbnail) fadeIn($('info-card'))

    $('transcript-box').textContent = data.transcript || ''
    const copyBtn = $('copy-btn')
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(data.transcript || '').then(() => {
            copyBtn.textContent = 'Copied!'
            setTimeout(() => { copyBtn.textContent = 'Copy' }, 2000)
        })
    }
    $('save-btn').onclick = () => window.__tool.saveLast({ filename: data.title })

    fadeIn($('transcript-card'))
    fadeIn($('summary-card'))
    fadeIn($('keypoints-card'))
    showSkeletons()
}

function showAnalysis(parsed) {
    const sb = $('summary-block')
    sb.querySelector('p').textContent = parsed.summary || '(No summary generated)'
    sb.classList.remove('fade-in'); void sb.offsetWidth; sb.classList.add('fade-in')
    $('summary-loading').classList.add('hidden')
    sb.classList.remove('hidden')

    const kl = $('kp-list')
    $('kp-loading').classList.add('hidden')
    kl.innerHTML = parsed.keyPoints.length
        ? parsed.keyPoints.map((pt, i) => `<li><span class="kp-num">${i + 1}</span><span class="kp-text">${esc(pt)}</span></li>`).join('')
        : '<li style="color:var(--vd-m);padding:8px 0">No key points generated.</li>'
    kl.classList.remove('fade-in'); void kl.offsetWidth; kl.classList.add('fade-in')
    kl.classList.remove('hidden')

    if (parsed.topics.length) {
        $('topics-list').innerHTML = parsed.topics.map(t => `<span class="topic-tag">${esc(t)}</span>`).join('')
        fadeIn($('topics-card'))
    }
}

function showAnalysisFallback() {
    $('summary-block').querySelector('p').textContent = 'Analysis unavailable — the transcript above is ready.'
    $('summary-block').classList.remove('hidden')
    $('summary-loading').classList.add('hidden')
    $('kp-list').innerHTML = '<li style="color:var(--vd-m);padding:8px 0">Analysis unavailable.</li>'
}

$('tab-podcast').addEventListener('click', () => switchTab('podcast'))
$('tab-youtube').addEventListener('click', () => switchTab('youtube'))

$('form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const url = $('url-input').value.trim()
    if (!url) return

    const d = detect(url)
    if (d.reason === 'unsupported-platform') {
        fadeIn($('progress-card'))
        showError(unsupportedPlatformMessage(d.platform))
        return
    }
    if (d.reason === 'bad-youtube-url') {
        fadeIn($('progress-card'))
        showError("That doesn't look like a valid YouTube URL.")
        return
    }

    transcriptShown = false
    ;['info-card', 'summary-card', 'keypoints-card', 'transcript-card', 'topics-card']
        .forEach(id => $(id).classList.add('hidden'))
    $('error-box').classList.add('hidden')
    $('summary-loading').classList.remove('hidden')
    $('summary-block').classList.add('hidden')
    $('summary-block').querySelector('p').textContent = ''
    $('kp-list').innerHTML = ''
    $('kp-list').classList.add('hidden')
    $('kp-loading').classList.add('hidden')
    $('meta-row').classList.add('hidden')
    $('info-thumb').classList.add('hidden')
    $('submit-btn').disabled = true
    fadeIn($('progress-card'))
    setStep(1)

    try {
        const result = await transcribe({
            url,
            onStep: setStep,
            onTranscript: (data) => { if (!transcriptShown) { showTranscriptCard(data); transcriptShown = true } },
        })
        if (result.analysis) { showAnalysis(result.parsed); markAllDone() }
        else showAnalysisFallback()
    } catch (err) {
        showError(err.message || 'Something went wrong.')
    } finally {
        $('submit-btn').disabled = false
    }
})

renderSteps(-1)

fetch('/version.txt', { cache: 'no-store' }).then(r => r.ok ? r.text() : 'dev')
    .then(v => { $('site-version').textContent = v.trim() }).catch(() => {})
