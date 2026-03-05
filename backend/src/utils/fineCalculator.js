/**
 * Fine calculation — STRICT vs LENIENT mode
 *
 * STRICT  (default/public): missing sessions treated as absent for percentages and thresholds.
 * LENIENT               : missing sessions ignored; only marked sessions used in percentages.
 *
 * IMPORTANT (Your Rule - Option A):
 * - Missing affects ONLY percentage/threshold.
 * - Fine is charged ONLY on ABSENT days (present days never get fine).
 *
 * Morning rules (priority order):
 *   absentPct >= 75%    → absentDays * 20        [ABSENT_20]
 *   presentPct < 50%    → absentDays * 10        [ABSENT_10]
 *   else                → absentDays * 3         [ABSENT_3]
 *
 * Evening rules (priority order):
 *   absentPct > 50%     → absentDays * 20        [ABSENT_20]
 *   absentPct > 25%     → absentDays * 10        [ABSENT_10]
 *   else                → absentDays * 3         [ABSENT_3]
 *
 * Boundary correctness:
 * - Morning: presentPct < 50 triggers 10 (50 is safe)
 * - Morning: absentPct >= 75 triggers 20
 * - Evening: absentPct > 25 triggers 10 (25 safe)
 * - Evening: absentPct > 50 triggers 20 (50 safe)
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

  // ----- Percentage denominator & effective absent for threshold checks -----
  let denomForPct = 0;
  let effectiveAbsentForPct = 0;
  let effectivePresentForPct = 0;

  if (strict) {
    // Percentages are based on all effective days in range; missing counts as absent for threshold checks.
    denomForPct = effectiveDays;
    effectiveAbsentForPct = absentDays + (missingDays || 0);
    effectivePresentForPct = presentDays;
  } else {
    // Percentages are based only on marked sessions (present+absent); missing ignored.
    denomForPct = (presentDays || 0) + (absentDays || 0);
    effectiveAbsentForPct = absentDays;
    effectivePresentForPct = presentDays;
  }

  const presentPct = denomForPct === 0 ? 0 : (effectivePresentForPct / denomForPct) * 100;
  const absentPct = denomForPct === 0 ? 0 : (effectiveAbsentForPct / denomForPct) * 100;

  // ----- Fine calculation (ONLY on absent days) -----
  let rule;
  let fine;
  let level;

  if (type === 'morning') {
    if (absentPct >= 75) {
      rule = 'ABSENT_20';
      fine = (absentDays || 0) * 20;
      level = 'danger';
    } else if (presentPct < 50) {
      rule = 'ABSENT_10';
      fine = (absentDays || 0) * 10;
      level = 'warning';
    } else {
      rule = 'ABSENT_3';
      fine = (absentDays || 0) * 3;
      level = 'safe';
    }
  } else {
    // evening
    if (absentPct > 50) {
      rule = 'ABSENT_20';
      fine = (absentDays || 0) * 20;
      level = 'danger';
    } else if (absentPct > 25) {
      rule = 'ABSENT_10';
      fine = (absentDays || 0) * 10;
      level = 'warning';
    } else {
      rule = 'ABSENT_3';
      fine = (absentDays || 0) * 5;
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