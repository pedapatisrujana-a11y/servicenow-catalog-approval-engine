'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateHardwareRequest, onSubmit } = require('../src/client/catalogFormValidation');

const today = new Date('2026-11-20T00:00:00Z');
const good = { justification: 'Laptop battery fails within one hour of use', estimated_cost: '1450', needed_by: '2026-12-01', request_type: 'new', asset_tag: '' };

test('valid request passes', () => assert.equal(validateHardwareRequest(good, today).length, 0));

test('short justification and bad cost are rejected', () => {
  const e = validateHardwareRequest(Object.assign({}, good, { justification: 'need it', estimated_cost: '-1' }), today);
  assert.deepEqual(e.map((x) => x.field), ['justification', 'estimated_cost']);
});

test('needed-by must allow 3 days lead time', () => {
  const e = validateHardwareRequest(Object.assign({}, good, { needed_by: '2026-11-21' }), today);
  assert.equal(e[0].field, 'needed_by');
});

test('replacement requires a well-formed asset tag', () => {
  assert.equal(validateHardwareRequest(Object.assign({}, good, { request_type: 'replacement' }), today)[0].field, 'asset_tag');
  assert.match(validateHardwareRequest(Object.assign({}, good, { request_type: 'replacement', asset_tag: 'X12' }), today)[0].message, /6 digits/);
});

test('onSubmit blocks submission and shows field messages', () => {
  const msgs = [];
  global.g_form = { clearMessages() {}, getValue: (f) => ({ justification: '', estimated_cost: '0' }[f] || ''), showFieldMsg: (f, m) => msgs.push(f) };
  assert.equal(onSubmit(), false);
  assert.deepEqual(msgs, ['justification', 'estimated_cost']);
  delete global.g_form;
});
