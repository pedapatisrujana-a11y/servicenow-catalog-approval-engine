'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { createPlatform } = require('./glide-mock');

const p = createPlatform();
p.load(path.join(__dirname, '../src/SLAEscalationPolicy.js'));
const policy = new p.context.SLAEscalationPolicy();
const sla = (o) => Object.assign({ stage: 'in_progress', priority: '3', business_percentage: 0, assigned_to: 'u1', last_level: 0 }, o);

test('P1 escalates earlier than P3', () => {
  assert.equal(policy.evaluate(sla({ priority: '1', business_percentage: 60 })).level, 1);
  assert.equal(policy.evaluate(sla({ priority: '3', business_percentage: 60 })).level, 0);
});

test('P1 at 92% reaches top level', () => {
  const r = policy.evaluate(sla({ priority: '1', business_percentage: 92 }));
  assert.equal(r.level, 3);
  assert.match(r.action, /major_incident_manager/);
});

test('unassigned task skips straight to group manager', () => {
  assert.equal(policy.evaluate(sla({ priority: '2', business_percentage: 55, assigned_to: '' })).level, 2);
});

test('no repeat notification at the same level', () => {
  const r = policy.evaluate(sla({ priority: '2', business_percentage: 80, last_level: 2 }));
  assert.equal(r.notify, false);
});

test('paused / completed SLAs never escalate', () => {
  ['paused', 'completed', 'cancelled'].forEach((stage) => assert.equal(policy.evaluate(sla({ stage, business_percentage: 150 })).level, 0));
});
