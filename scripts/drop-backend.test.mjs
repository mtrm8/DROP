import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../components/drop/backend.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const prize = { id: 'cash-50', amount: 50 };
const prizeResponse = { success: true, prize_id: 'cash-50', amount: 50 };

function backend(respond) {
  const requests = [];
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name) {
      assert.equal(name, './boxItems');
      return { BOX_ITEMS: [prize], pickWeighted: () => prize, moneyEmojiFor: () => '💰', moneyIconFor: () => 'coins' };
    },
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co/', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key' } },
    AbortSignal,
    console: { warn() {} },
    fetch: async (url, options) => {
      const request = { url: new URL(url), ...options };
      requests.push(request);
      return respond(request);
    },
  });
  return { ...exports, requests };
}

const ok = body => ({ ok: true, json: async () => body });

test('repeated verification only reads active drop_codes, ignoring old usage flags', async () => {
  const api = backend(request => {
    assert.equal(request.method ?? 'GET', 'GET');
    assert.equal(request.url.pathname, '/rest/v1/drop_codes');
    assert.deepEqual([...request.url.searchParams], [['select', 'code'], ['is_active', 'eq.true']]);
    assert.equal(request.body, undefined);
    return ok([{ code: ' DROP-LAB-88 ', used: true }]);
  });
  for (let i = 0; i < 3; i++) {
    assert.equal((await api.verifyCode('  drop-lab-88  ')).status, 'valid');
  }
  assert.equal(api.requests.length, 3);
});

test('unknown and bundled codes do not bypass the active list', async () => {
  const api = backend(() => ok([]));
  assert.equal((await api.verifyCode('DROP-LAB-88')).status, 'invalid');
  assert.equal((await api.redeemCode('VIP-2026-DROP')).status, 'invalid');
  assert.ok(api.requests.every(request => !request.url.pathname.includes('/rpc/')));
});

test('verification errors remain errors and do not trigger redemption', async () => {
  const api = backend(() => ({ ok: false, status: 401 }));
  assert.equal((await api.verifyCode('DROP-LAB-88')).status, 'error');
  assert.equal((await api.redeemCode('DROP-LAB-88')).status, 'error');
  assert.ok(api.requests.every(request => !request.url.pathname.includes('/rpc/')));
});

test('repeated redemption and completion preserve normalized codes without consume payloads', async () => {
  const api = backend(request => {
    assert.equal(request.method, 'POST');
    const body = JSON.parse(request.body);
    assert.equal(body.p_code, 'DROP-LAB-88');
    if (request.url.pathname.endsWith('/redeem_code')) {
      assert.deepEqual(body, { p_code: 'DROP-LAB-88' });
    } else {
      assert.equal(request.url.pathname, '/rest/v1/rpc/complete_drop');
      assert.deepEqual(body, { p_code: 'DROP-LAB-88', p_prize_id: 'cash-50' });
    }
    return ok(prizeResponse);
  });
  for (let i = 0; i < 3; i++) {
    assert.equal((await api.redeemCode(' drop-lab-88 ', true)).status, 'ok');
    assert.equal((await api.completeDrop(' drop-lab-88 ', 'cash-50')).status, 'ok');
  }
  assert.equal(api.requests.length, 6);
});

test('explicitly deactivated codes cannot fall back to a provisional redemption', async () => {
  const api = backend(() => ok({ success: false, error: 'not_found' }));
  assert.equal((await api.redeemCode('DROP-LAB-88', true)).status, 'invalid');
  assert.equal(api.requests.length, 1);
});
