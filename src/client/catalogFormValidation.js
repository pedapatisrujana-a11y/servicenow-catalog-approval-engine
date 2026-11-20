/**
 * Catalog Client Script (onSubmit) — "Hardware request" item
 *
 * Validates a hardware request before submission. Validation rules live in a pure
 * function (validateHardwareRequest) so they can be unit-tested outside the browser;
 * the onSubmit wrapper only reads g_form values and shows messages.
 *
 * Portfolio project: written independently. Not client code.
 */

function validateHardwareRequest(v, today) {
    var errors = [];
    var cost = parseFloat(v.estimated_cost);
    if (!v.justification || v.justification.replace(/\s/g, '').length < 20) {
        errors.push({ field: 'justification', message: 'Please give a business justification of at least 20 characters.' });
    }
    if (isNaN(cost) || cost <= 0) {
        errors.push({ field: 'estimated_cost', message: 'Estimated cost must be a positive number.' });
    }
    if (v.needed_by) {
        var needed = new Date(v.needed_by + 'T00:00:00Z');
        var minDate = new Date(today.getTime() + 3 * 86400000);
        if (isNaN(needed.getTime())) errors.push({ field: 'needed_by', message: 'Needed-by date is invalid.' });
        else if (needed < minDate) errors.push({ field: 'needed_by', message: 'Allow at least 3 days for fulfilment.' });
    }
    if (v.request_type === 'replacement' && !v.asset_tag) {
        errors.push({ field: 'asset_tag', message: 'Asset tag of the device being replaced is required.' });
    }
    if (v.asset_tag && !/^P\d{6}$/.test(v.asset_tag)) {
        errors.push({ field: 'asset_tag', message: 'Asset tag format is P followed by 6 digits (e.g. P000123).' });
    }
    return errors;
}

/* global g_form */
function onSubmit() {
    g_form.clearMessages();
    var fields = ['justification', 'estimated_cost', 'needed_by', 'request_type', 'asset_tag'];
    var v = {};
    for (var i = 0; i < fields.length; i++) v[fields[i]] = g_form.getValue(fields[i]);

    var errors = validateHardwareRequest(v, new Date());
    for (var j = 0; j < errors.length; j++) g_form.showFieldMsg(errors[j].field, errors[j].message, 'error');
    return errors.length === 0;
}

if (typeof module !== 'undefined') module.exports = { validateHardwareRequest: validateHardwareRequest, onSubmit: onSubmit };
