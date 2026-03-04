/**
 * Fine calculation — STRICT vs LENIENT mode
 *
 * STRICT  (default/public): missing sessions treated as absent for percentages and thresholds.
 * LENIENT               : missing sessions ignored; only marked sessions used in percentages.
 *
 * Morning rules  (priority order):
 *   absentPct >= 75%    → effectiveDays * 20        [ALL_DAYS_20]
 *   presentPct < 50%    → effectiveDays * 10        [ALL_DAYS_10]
 *   else                → absentDays * 3            [ABSENT_ONLY_3]
 *
 * Evening rules  (priority order):
 *   absentPct > 50%     → effectiveDays * 20        [ALL_DAYS_20]
 *   absentPct > 25%     → effectiveDays * 10        [ALL_DAYS_10]
 *   else                → absentDays * 3            [ABSENT_ONLY_3]
 */

const FINE_MODE = process.env.FINE_MODE || 'STRICT';

function calcSession(effectiveDays, presentDays, absentDays, missingDays, type, mode) {
    const strict = (mode || FINE_MODE) === 'STRICT';

    if (!effectiveDays || effectiveDays <= 0) {
        return {
            rule: 'NONE',
            fine: 0,
            level: 'safe',
            presentPct: 0,
            absentPct: 0,
        };
    }

    let denomForPct;
    let effectiveAbsentForPct;
    let effectivePresentForPct;

    if (strict) {
        denomForPct = effectiveDays;
        effectiveAbsentForPct = absentDays + missingDays;
        effectivePresentForPct = presentDays;
    } else {
        denomForPct = presentDays + absentDays;
        if (denomForPct === 0) {
            denomForPct = 0;
        }
        effectiveAbsentForPct = absentDays;
        effectivePresentForPct = presentDays;
    }

    const presentPct = denomForPct === 0 ? 0 : (effectivePresentForPct / denomForPct) * 100;
    const absentPct = denomForPct === 0 ? 0 : (effectiveAbsentForPct / denomForPct) * 100;

    let rule;
    let fine;
    let level;

    if (type === 'morning') {
        if (absentPct >= 75) {
            rule = 'ALL_DAYS_20';
            fine = effectiveDays * 20;
            level = 'danger';
        } else if (presentPct < 50) {
            rule = 'ALL_DAYS_10';
            fine = effectiveDays * 10;
            level = 'warning';
        } else {
            rule = 'ABSENT_ONLY_3';
            fine = absentDays * 3;
            level = 'safe';
        }
    } else {
        if (absentPct > 50) {
            rule = 'ALL_DAYS_20';
            fine = effectiveDays * 20;
            level = 'danger';
        } else if (absentPct > 25) {
            rule = 'ALL_DAYS_10';
            fine = effectiveDays * 10;
            level = 'warning';
        } else {
            rule = 'ABSENT_ONLY_3';
            fine = absentDays * 3;
            level = 'safe';
        }
    }

    return {
        rule,
        fine,
        level,
        presentPct,
        absentPct,
    };
}

/**
 * Unified entry point called by dashboardController.
 * @param {number} effectiveDays   non-blocked session count in range
 * @param {number} presentCount    present count
 * @param {number} absentCount     absent count
 * @param {number} missingCount    missing (unmarked) count
 * @param {'morning'|'evening'} type
 * @param {'STRICT'|'LENIENT'} [mode]
 */
const calculateFine = (effectiveDays, presentCount, absentCount, missingCount, type, mode) => {
    const result = calcSession(effectiveDays, presentCount, absentCount, missingCount, type, mode);
    return {
        ...result,
        absentPct: parseFloat(result.absentPct.toFixed(1)),
        presentPct: parseFloat(result.presentPct.toFixed(1)),
    };
};

module.exports = { calculateFine, FINE_MODE };
