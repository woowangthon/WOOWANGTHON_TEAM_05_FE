import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, defaults, interpretDemo, validateProfile } from '../lib/demo.mjs';
test('weekly rent conversion, known subtotals and unknown costs stay explicit', () => {
  const p = buildPlan(defaults); const ash = p.options.find(x => x.id === 'ashfield-share');
  assert.equal(ash.rent, 1083.33); assert.equal(ash.monthly, 2073.33); assert.equal(ash.initial, 1800);
  assert.deepEqual(ash.monthly_missing, ['의료·보험료']); assert.ok(ash.initial_missing.includes('항공권'));
  const red = p.options.find(x => x.id === 'redfern-share'); assert.ok(red.initial_missing.includes('보증금')); assert.equal(red.bond, null);
});
test('filter budgets and commutes, empty state, and sort after revision', () => {
  assert.equal(buildPlan({ ...defaults, monthly_budget: 100 }).options.length, 0);
  assert.equal(buildPlan({ ...defaults, initial_budget: 100 }).options.length, 0);
  const edit = interpretDemo('더 저렴하게, 통근 60분', defaults);
  assert.equal(edit.profile.max_commute, 60); assert.equal(buildPlan(edit.profile).options[0].id, 'ashfield-share');
  assert.ok(buildPlan({ ...defaults, max_commute: 20 }).options.every(x => x.commute <= 20));
});
test('reject invalid inputs and unsupported demo instructions', () => {
  for (const patch of [{ monthly_budget: NaN }, { insurance: -1 }, { workplace: 'Melbourne' }, { monthly_budget: '3000' }, { arrival_date: '2027-02-30' }]) assert.throws(() => validateProfile({ ...defaults, ...patch }));
  assert.throws(() => interpretDemo('아무렇게나 해', defaults));
});
test('purpose and visa status change checklist; supplied insurance completes monthly subtotal', () => {
  assert.ok(!buildPlan({ ...defaults, purpose: 'employment' }).guides.some(g => g.id === 'visa'));
  assert.ok(buildPlan({ ...defaults, visa_status: 'held' }).guides.find(g => g.id === 'visa').title.includes('재확인'));
  assert.deepEqual(buildPlan({ ...defaults, insurance: 100 }).options[0].monthly_missing, []);
});
