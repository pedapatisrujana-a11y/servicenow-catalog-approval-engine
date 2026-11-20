'use strict';
const path = require('path');
const { createPlatform } = require('../test/glide-mock');
const data = require('../data/sample-catalog.json');
const p = createPlatform(data, { now: '2026-11-20T12:00:00Z' });
p.load(path.join(__dirname, '../src/CatalogApprovalRouter.js'));
p.load(path.join(__dirname, '../src/SLAEscalationPolicy.js'));
const router = new p.context.CatalogApprovalRouter({ autoApproveBelow: 50 });
console.log('Approval routing');
[['hardware', 20], ['hardware', 1200], ['hardware', 7500], ['software', 300]].forEach(([c, cost]) => {
  const r = router.getApprovers({ requested_for: 'u_emp', u_category: c, u_estimated_cost: String(cost) });
  console.log(`  ${c.padEnd(9)} $${String(cost).padEnd(6)} -> ${r.autoApproved ? 'auto-approved' : r.approvers.join(', ')}`);
});
const pol = new p.context.SLAEscalationPolicy();
console.log('\nSLA escalation');
[['1', 60, 'u1'], ['1', 92, 'u1'], ['2', 55, ''], ['3', 80, 'u1']].forEach(([pr, pct, a]) => {
  const r = pol.evaluate({ stage: 'in_progress', priority: pr, business_percentage: pct, assigned_to: a });
  console.log(`  P${pr} ${String(pct).padStart(3)}% ${a ? 'assigned  ' : 'unassigned'} -> level ${r.level}: ${r.action}`);
});
