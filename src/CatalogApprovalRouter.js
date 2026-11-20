/**
 * Script Include: CatalogApprovalRouter
 *
 * Data-driven approval routing for Service Catalog requests (RITMs). Instead of
 * hard-coding approvers in each catalog item's flow, rules live in a table
 * (u_approval_rule) that process owners can maintain:
 *
 *   u_category | u_min_cost | u_approver_type (manager|group|user) | u_approver | u_order
 *
 * Supports: cost thresholds, manager approval, group approval, named approvers,
 * active delegations (sys_user_delegate), de-duplication, and self-approval prevention.
 * Called from a Flow Designer "Run Script" step or a workflow approval activity:
 *
 *   var approvers = new CatalogApprovalRouter().getApprovers(current);
 *
 * Portfolio project: written independently with synthetic data. Not client code.
 */
var CatalogApprovalRouter = Class.create();
CatalogApprovalRouter.prototype = {

    initialize: function (opts) {
        opts = opts || {};
        this.ruleTable = opts.ruleTable || 'u_approval_rule';
        this.autoApproveBelow = typeof opts.autoApproveBelow === 'number'
            ? opts.autoApproveBelow
            : parseFloat(gs.getProperty('x_portfolio.catalog.auto_approve_below', '0'));
    },

    /**
     * @param {GlideRecord|Object} ritm  needs: requested_for, u_category, u_estimated_cost
     * @returns {{autoApproved:boolean, approvers:string[], reasons:string[]}}
     */
    getApprovers: function (ritm) {
        var requestedFor = this._val(ritm, 'requested_for');
        var category = this._val(ritm, 'u_category');
        var cost = parseFloat(this._val(ritm, 'u_estimated_cost')) || 0;
        var reasons = [];

        if (cost < this.autoApproveBelow) {
            return { autoApproved: true, approvers: [], reasons: ['Cost ' + cost + ' below auto-approval threshold ' + this.autoApproveBelow] };
        }

        var approvers = [];
        var rules = this._matchingRules(category, cost);
        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            var ids = [];
            if (r.type === 'manager') ids = [this._managerOf(requestedFor)];
            else if (r.type === 'group') ids = this._groupMembers(r.approver);
            else if (r.type === 'user') ids = [r.approver];

            for (var j = 0; j < ids.length; j++) {
                var id = ids[j];
                if (!id) { reasons.push('Rule ' + r.name + ': no approver found'); continue; }
                if (id === requestedFor) { reasons.push('Rule ' + r.name + ': self-approval skipped'); continue; }
                id = this._delegateFor(id) || id;
                if (approvers.indexOf(id) === -1) approvers.push(id);
            }
            reasons.push('Rule ' + r.name + ' applied (' + r.type + ')');
        }

        if (!approvers.length) {
            var fallback = gs.getProperty('x_portfolio.catalog.fallback_approver', '');
            if (fallback) { approvers.push(fallback); reasons.push('No approver resolved; fallback approver used'); }
        }
        return { autoApproved: false, approvers: approvers, reasons: reasons };
    },

    _matchingRules: function (category, cost) {
        var out = [];
        var gr = new GlideRecord(this.ruleTable);
        gr.addQuery('u_active', 'true');
        gr.orderBy('u_order');
        gr.query();
        while (gr.next()) {
            var cat = gr.getValue('u_category');
            var min = parseFloat(gr.getValue('u_min_cost')) || 0;
            if ((cat === '*' || cat === category) && cost >= min) {
                out.push({ name: gr.getValue('u_name'), type: gr.getValue('u_approver_type'), approver: gr.getValue('u_approver') });
            }
        }
        return out;
    },

    _managerOf: function (userId) {
        var u = new GlideRecord('sys_user');
        return u.get(userId) ? u.getValue('manager') : null;
    },

    _groupMembers: function (groupId) {
        var ids = [];
        var m = new GlideRecord('sys_user_grmember');
        m.addQuery('group', groupId);
        m.query();
        while (m.next()) ids.push(m.getValue('user'));
        return ids;
    },

    /** Returns the active approval delegate for a user, if any. */
    _delegateFor: function (userId) {
        var now = gs.nowDateTime();
        var d = new GlideRecord('sys_user_delegate');
        d.addQuery('user', userId);
        d.addQuery('approvals', 'true');
        d.query();
        while (d.next()) {
            var starts = d.getValue('starts') || '';
            var ends = d.getValue('ends') || '9999';
            if (starts <= now && now <= ends) return d.getValue('delegate');
        }
        return null;
    },

    _val: function (rec, field) {
        if (rec && typeof rec.getValue === 'function') return rec.getValue(field);
        return rec ? rec[field] : null;
    },

    type: 'CatalogApprovalRouter'
};
