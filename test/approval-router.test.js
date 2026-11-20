'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { createPlatform } = require('./glide-mock');
const data = require('../data/sample-catalog.json');

function setup(opts = {}, props = {}) {
  const p = createPlatform(data, { now: '2026-11-20T12:00:00Z', properties: props });
  p.load(path.join(__dirname, '../src/CatalogApprovalRouter.js'));
  return { p, router: new p.context.CatalogApprovalRouter(Object.assign({ autoApproveBelow: 50 }, opts)) };
}
const ritm = (o) => Object.assign({ requested_for: 'u_emp', u_category: 'hardware', u_estimated_cost: '1200' }, o);

test('low-cost request is auto-approved', () => {
  const r = setup().router.getApprovers(ritm({ u_estimated_cost: '20' }));
  assert.equal(r.autoApproved, true);
  assert.equal(r.approvers.length, 0);
});

test('standard hardware request needs only the manager', () => {
  const r = setup().router.getApprovers(ritm());
  assert.equal(r.approvers.join(), 'u_mgr');
});

test('over 5k adds finance group, with active delegation applied', () => {
  const r = setup().router.getApprovers(ritm({ u_estimated_cost: '7500' }));
  assert.equal(r.approvers.join(), 'u_mgr,u_fin1,u_backup');
});

test('software adds security group but de-duplicates the manager', () => {
  const r = setup().router.getApprovers(ritm({ u_category: 'software' }));
  assert.equal(r.approvers.join(), 'u_mgr');
});

test('requester is never their own approver', () => {
  const r = setup().router.getApprovers(ritm({ requested_for: 'u_mgr', u_category: 'software' }));
  assert.equal(r.approvers.join(), 'u_dir');
  assert.ok(r.reasons.some((x) => /self-approval skipped/.test(x)));
});

test('fallback approver used when nobody resolves', () => {
  const r = setup({}, { 'x_portfolio.catalog.fallback_approver': 'u_dir' }).router.getApprovers(ritm({ requested_for: 'u_noboss' }));
  assert.equal(r.approvers.join(), 'u_dir');
});

test('inactive rules are ignored', () => {
  const r = setup().router.getApprovers(ritm());
  assert.ok(!r.reasons.some((x) => /Inactive rule/.test(x)));
});

test('works with a GlideRecord-like object', () => {
  const { p, router } = setup();
  p.db.sc_req_item = [ritm({ sys_id: 'ritm1' })];
  const gr = new p.context.GlideRecord('sc_req_item');
  gr.get('ritm1');
  assert.equal(router.getApprovers(gr).approvers.join(), 'u_mgr');
});
