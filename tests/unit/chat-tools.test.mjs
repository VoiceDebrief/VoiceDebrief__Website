/* Unit tests — chat-tools.js (issue 034): the tool-call parser and budgets. */
import { test } from 'node:test'
import assert from 'node:assert/strict'

globalThis.location ??= { search: '' }
const backing = new Map()
globalThis.localStorage ??= {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => backing.set(k, String(v)),
    removeItem: (k) => backing.delete(k),
}

const { parseToolCall, toolBudgetLine, toolsSection, isSpendTool, listChatTools,
        TOOL_MAX_STEPS, TOOL_MAX_SPEND_CALLS } = await import('../../website/app/chat-tools.js')

test('parseToolCall reads a properly fenced tool block', () => {
    const call = parseToolCall('Sure.\n```tool\n{"action":"get_costs","params":{}}\n```')
    assert.deepEqual(call, { action: 'get_costs', params: {} })
})

test('parseToolCall tolerates json fences and no fence at all', () => {
    assert.equal(parseToolCall('```json\n{"action":"get_results","params":{}}\n```').action, 'get_results')
    assert.equal(parseToolCall('{"action":"list_infographic_models","params":{}}').action, 'list_infographic_models')
})

test('parseToolCall takes the FIRST balanced object and keeps nested params intact', () => {
    const call = parseToolCall('```tool\n{"action":"redraw_infographic","params":{"model":"google/gemini-3.5-flash"}}\n``` trailing {junk}')
    assert.equal(call.params.model, 'google/gemini-3.5-flash')
})

test('parseToolCall returns null for prose, unknown actions, and broken JSON', () => {
    assert.equal(parseToolCall('Here is your summary — no tools needed.'), null)
    assert.equal(parseToolCall('{"action":"delete_everything","params":{}}'), null)
    assert.equal(parseToolCall('{"action":"get_costs", params}'), null)
})

test('parseToolCall handles braces inside strings', () => {
    const call = parseToolCall('{"action":"set_prompt","params":{"kind":"summary","text":"use {curly} style"}}')
    assert.equal(call.params.text, 'use {curly} style')
})

test('budget line names steps, spend calls and dollars', () => {
    const line = toolBudgetLine({ steps: 3, spendCalls: 1, spendUsd: 0.02 })
    assert.match(line, new RegExp(`${TOOL_MAX_STEPS - 3} tool step`))
    assert.match(line, new RegExp(`${TOOL_MAX_SPEND_CALLS - 1} money-spending`))
    assert.match(line, /\$0\.0200/)
})

test('spend tools are exactly the ones that trigger new model spend', () => {
    assert.equal(isSpendTool('run_sample'), true)
    assert.equal(isSpendTool('redraw_infographic'), true)
    assert.equal(isSpendTool('get_costs'), false)
    assert.equal(isSpendTool('set_prompt'), false)
})

test('the prompt section documents every registered tool with its tier', () => {
    const section = toolsSection()
    for (const t of listChatTools()) {
        assert.ok(section.includes(`- ${t.action} [${t.tier}]`), `${t.action} missing from tools section`)
    }
})
