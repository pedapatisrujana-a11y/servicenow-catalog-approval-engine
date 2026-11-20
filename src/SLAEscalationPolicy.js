/**
 * Script Include: SLAEscalationPolicy
 *
 * Decides what escalation action to take for an in-flight task SLA based on the
 * percentage of time elapsed, the task priority, and whether the task is assigned.
 * Designed to be called from a scheduled job or an SLA workflow/flow timer.
 * Pure decision logic (no writes) so it can be tested and reused.
 *
 * Portfolio project: written independently with synthetic data. Not client code.
 */
var SLAEscalationPolicy = Class.create();
SLAEscalationPolicy.prototype = {

    initialize: function (thresholds) {
        // percent elapsed -> level. Lower thresholds for P1/P2.
        this.thresholds = thresholds || {
            '1': [{ pct: 50, level: 1 }, { pct: 75, level: 2 }, { pct: 90, level: 3 }],
            '2': [{ pct: 50, level: 1 }, { pct: 75, level: 2 }, { pct: 100, level: 3 }],
            'default': [{ pct: 75, level: 1 }, { pct: 100, level: 2 }]
        };
        this.actions = {
            0: 'none',
            1: 'notify_assignee',
            2: 'notify_group_manager',
            3: 'notify_service_owner_and_major_incident_manager'
        };
    },

    /**
     * @param {Object} sla { business_percentage:number, priority:string, assigned_to?:string, stage:string, last_level?:number }
     * @returns {{level:number, action:string, notify:boolean, reason:string}}
     */
    evaluate: function (sla) {
        if (!sla || sla.stage === 'completed' || sla.stage === 'cancelled' || sla.stage === 'paused') {
            return { level: 0, action: 'none', notify: false, reason: 'SLA not in progress' };
        }
        var pct = Number(sla.business_percentage) || 0;
        var steps = this.thresholds[String(sla.priority)] || this.thresholds['default'];
        var level = 0;
        for (var i = 0; i < steps.length; i++) if (pct >= steps[i].pct) level = steps[i].level;

        // An unassigned task at level 1 goes straight to the group manager.
        if (level === 1 && !sla.assigned_to) level = 2;

        var last = Number(sla.last_level) || 0;
        var notify = level > last; // only notify when escalating, never repeat
        return {
            level: level,
            action: this.actions[level] || 'none',
            notify: notify,
            reason: 'P' + sla.priority + ' at ' + pct + '% elapsed' + (!sla.assigned_to ? ', unassigned' : '')
        };
    },

    type: 'SLAEscalationPolicy'
};
