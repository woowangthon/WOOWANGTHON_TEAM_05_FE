import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults } from '../lib/demo.mjs';
import { buildGemmaPlan, validateChanges } from '../lib/gemma.server.mjs';
process.env.GEMINI_API_KEY = 'test-key';

test('model output cannot change personal data or inject unsupported fields', () => {
  for (const changes of [{city:'Paris'}, {monthly_budget:'2800'}, {max_commute:1.5}, {monthly_budget:-1}, {insurance:Infinity}, {sort_by:'unknown'}]) {
    assert.throws(() => validateChanges({changes}, defaults));
  }
  assert.throws(() => validateChanges({changes:{}, extra:true}, defaults));
  assert.deepEqual(validateChanges({changes:{max_commute:60, insurance:null}}, defaults), {max_commute:60});
});

test('server Gemini calls redact personal fields, apply revision and validate sources', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    const input = JSON.parse(init.body);
    const payload = JSON.parse(input.contents[0].parts[0].text);
    assert.equal(payload.profile?.nationality, undefined);
    assert.equal(payload.profile?.company, undefined);
    const output = payload.message ? {changes:{max_commute:60}} : {focus:'budget',source_ids:['tax']};
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]});
  });
  const plan = await buildGemmaPlan({profile:defaults,message:'통근 60분'});
  assert.equal(plan.mode, 'gemma');
  assert.equal(plan.profile.max_commute, 60);
});

test('quota and untrusted sources never masquerade as Gemma success', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', {status:429}));
  await assert.rejects(buildGemmaPlan({profile:defaults,message:'통근 60분'}));
  const fallback = await buildGemmaPlan({profile:defaults});
  assert.equal(fallback.mode, 'rules');
  assert.match(fallback.warnings.at(-1), /한도/);
});
