// newApi.js
// Browser-safe API. NO fs, NO file loading. All data must be passed in via inputs.summary and inputs.graftData.

// Global year constants
export const BASELINE_YEARS = ['2022-2023', '2023-2024', '2024-2025'];
export const PERFORMANCE_YEAR = '2024-2025';

function asNum(v, fallback = NaN) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function percentileRank(arr = [], value) {
  if (!arr || arr.length === 0) return 0;
  const sorted = arr.filter(v => Number.isFinite(v)).sort((a,b)=>a-b);
  if (sorted.length === 0) return 0;
  const countLess = sorted.filter(v => v < value).length;
  return Math.round((countLess / sorted.length) * 100);
}

function meanBaselineForCenter(row) {
  const keys = BASELINE_YEARS.map(year => `${year} - Transplants`);
  const vals = keys.map(k => asNum(row[k], NaN)).filter(v => !Number.isNaN(v));
  if (!vals.length) return NaN;
  return vals.reduce((a,b)=>a+b,0) / vals.length;
}

function computeNationalGrowthRate(summary) {
  if (!summary || !summary.length) return 0;

  let baselineTotal = 0;
  let perfTotal = 0;

  summary.forEach(r => {
    // Exclude pediatric centers using the "Pediatric Center" column
    const isPediatric = r['Pediatric Center'] === 1 || r['Pediatric Center'] === 1.0 || r['Pediatric Center'] === '1.0';
    
    if (isPediatric) return; // Skip pediatric centers
    
    const avg = meanBaselineForCenter(r);
    if (!Number.isNaN(avg)) {
      baselineTotal += avg;
    }
    const perf = asNum(r[`${PERFORMANCE_YEAR} - Transplants`], NaN);
    if (Number.isFinite(perf)) perfTotal += perf;
  });

  if (!baselineTotal) return 0;

  return (perfTotal / baselineTotal) - 1;
}

function buildDistributionFromValues(values, bins = 10) {
  if (!values.length) return null;

  const sorted = values.slice().sort((a,b)=>a-b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const binSize = (max - min) / bins || 1;

  const freqs = Array(bins).fill(0);
  const labels = [];

  values.forEach(v => {
    const idx = Math.min(bins - 1, Math.floor((v - min) / binSize));
    freqs[idx]++;
  });

  for (let i = 0; i < bins; i++) {
    const start = min + i * binSize;
    const end = min + (i+1) * binSize;
    const midpoint = (start + end) / 2;
    labels.push(Math.round(midpoint).toString());
  }

  const pctFreqs = freqs.map(f => Math.round((f / values.length) * 100));

  const p = (q) => sorted[Math.floor(sorted.length * q)] ?? null;

  return {
    bins: labels,
    freqs: pctFreqs,
    values: sorted,
    percentiles: {
      p10: p(0.10),
      p25: p(0.25),
      p50: p(0.50),
      p75: p(0.75),
      p90: p(0.90)
    }
  };
}

function calculateAchievement(n, target) {
  if (!target) return 0;
  const ratio = n / target;
  if (ratio >= 1.25) return 60;
  if (ratio >= 1.20) return 55;
  if (ratio >= 1.15) return 50;
  if (ratio >= 1.05) return 40;
  if (ratio >= 0.95) return 30;
  if (ratio >= 0.85) return 20;
  if (ratio >= 0.75) return 10;
  return 0;
}

function calculateEfficiency(summary, centerCode, proposedRate) {
  const key = `${PERFORMANCE_YEAR} - Organ Offer Acceptance Rate`;
  
  // Only include rates from non-pediatric centers for percentile rank calculation
  const rates = summary
    .filter(r => {
      const isPediatric = r['Pediatric Center'] === 1 || r['Pediatric Center'] === 1.0 || r['Pediatric Center'] === '1.0';
      return !isPediatric;
    })
    .map(r => asNum(r[key], NaN))
    .filter(v => Number.isFinite(v));

  const centerRow = summary.find(r => String(r['Center Code']).trim() === String(centerCode).trim());
  if (!centerRow) return 0;

  const centerRate = asNum(centerRow[key], NaN);
  if (!Number.isFinite(centerRate)) return 0;

  const pct = percentileRank(rates, proposedRate);

  let achievement = 0;
  if (pct >= 80) achievement = 20;
  else if (pct >= 60) achievement = 15;
  else if (pct >= 40) achievement = 10;
  else if (pct >= 20) achievement = 6;

  const benchmark = centerRate * 1.2;

  let improvement = 0;
  if (proposedRate >= benchmark) improvement = 15;
  else if (proposedRate >= centerRate) {
    improvement = 15 * (proposedRate - centerRate) / (benchmark - centerRate);
  }

  return Math.max(achievement, Math.round(improvement));
}

function calculateQuality(summary, graftSurvival) {
  const key = `${PERFORMANCE_YEAR} - Graft Survival Rate`;
  // Filter out non-finite values, zeros, and empty strings
  const vals = summary
    .map(r => asNum(r[key], NaN))
    .filter(v => Number.isFinite(v) && v > 0);

  const pctVals = vals.map(v => (v > 1 ? v : v * 100));

  const inputVal = graftSurvival > 1 ? graftSurvival : graftSurvival * 100;

  const pct = percentileRank(pctVals, inputVal);

  if (pct >= 80) return 20;
  if (pct >= 60) return 18;
  if (pct >= 40) return 16;
  if (pct >= 20) return 14;
  if (pct >= 10) return 12;
  return 10;
}

export function compileCenterResults(inputs = {}) {
  const summary = inputs.summary || [];
  const graftData = inputs.graftData || [];
  const centerCode = inputs.centerCode;
  const n = Number(inputs.numTransplants) || 0;
  
  const offerAcceptRate = Number(inputs.offerAcceptRate) || 0;
  const graftSurvival = inputs.graftSurvival > 1 
    ? inputs.graftSurvival 
    : inputs.graftSurvival * 100;

  // Check if center ID is valid (not empty and exactly 4 characters)
  const isValidCenterCode = centerCode && 
                           typeof centerCode === 'string' && 
                           centerCode.trim().length === 4;

  // Find the center row
  const row = isValidCenterCode 
    ? summary.find(r => String(r['Center Code']).trim() === String(centerCode).trim())
    : null;

  // Check if baseline data exists
  const baselineAvg = row ? meanBaselineForCenter(row) : NaN;
  const hasBaselineData = Number.isFinite(baselineAvg);

  // If no valid center or no baseline data, return zeros for everything
  if (!isValidCenterCode || !hasBaselineData) {
    return {
      meta: {
        inputs,
        timestamp: new Date().toISOString(),
        model: "iota-v1-sim"
      },
      perTransplant: {
        upside: 0,
        downside: 0
      },
      totals: {
        upside_total: 0,
        downside_total: 0
      },
      distribution: {
        acceptance: { bins: [], freqs: [], values: [], percentiles: { p10: null, p25: null, p50: null, p75: null, p90: null } },
        graftSurvival: { bins: [], freqs: [], values: [], percentiles: { p10: null, p25: null, p50: null, p75: null, p90: null } }
      },
      transplantVolume: {
        monthLabels: ['2022-2023', '2023-2024', '2024-2025', '2025-2026'],
        volumes: [null, null, null],
        projected: [0],
        target: 0
      },
      scores: {
        transplantTarget: 0,
        currentTransplants: 0,
        distanceFromTarget: 0,
        acceptancePercentile: 0,
        graftSurvivalPercentile: 0,
        benchmarkAcceptanceRate: 0,
        benchmarkGraftSurvival: 0,
        centerOfferAcceptRate: 0,
        centerGraftSurvival: 0,
        centerTransplants: 0,
        achievementScore: 0,
        efficiencyScore: 0,
        qualityScore: 0,
        totalScore: 0
      },
      nRecords: 0
    };
  }

  // --------- REAL DISTRIBUTIONS ----------
  const acceptanceVals = summary
    .map(r => asNum(r[`${PERFORMANCE_YEAR} - Organ Offer Acceptance Rate`], NaN))
    .filter(v => Number.isFinite(v));

  // Filter out non-finite values, zeros, and empty strings for graft survival
  const graftVals = graftData
    .map(r => asNum(r[`${PERFORMANCE_YEAR} - Graft Survival Rate`], NaN))
    .filter(v => Number.isFinite(v) && v > 0)
    .map(v => (v > 1 ? v : v * 100));

  const acceptanceDist = buildDistributionFromValues(acceptanceVals) || { bins: [], freqs: [], values: [] };
  const graftDist = buildDistributionFromValues(graftVals) || { bins: [], freqs: [], values: [] };

  // --------- NATIONAL GROWTH + TARGET ----------
  const ngr = computeNationalGrowthRate(summary);
  console.log(ngr)

  const transplantTarget = baselineAvg * (1 + ngr);

  // --------- SCORES ----------
  const achievement = calculateAchievement(n, transplantTarget);
  const efficiency = calculateEfficiency(summary, centerCode, offerAcceptRate);
  const quality = calculateQuality(graftData.length ? graftData : summary, graftSurvival);

  const totalScore = achievement + efficiency + quality;

  // --------- PAYMENTS ----------
  let perUpside = 15000 * (totalScore - 60) / 40;
  let perDownside = 2000 * (40 - totalScore) / 40 * (-1);

  if (41 <= totalScore && totalScore <= 59) {
    perUpside = 0;
    perDownside = 0;
  }

  // Ensure upside is never negative
  //perUpside = Math.max(0, perUpside);
  //perDownside = Math.min(0, perDownside);
  if (totalScore < 60) {
    perUpside = 0
  }
  
  if (totalScore > 40) {
    perDownside = 0
  }

  // --------- TRANSPLANT VOLUME DATA ----------
  const baselineY1 = row ? asNum(row[`${BASELINE_YEARS[0]} - Transplants`], NaN) : NaN;
  const baselineY2 = row ? asNum(row[`${BASELINE_YEARS[1]} - Transplants`], NaN) : NaN;
  const baselineY3 = row ? asNum(row[`${BASELINE_YEARS[2]} - Transplants`], NaN) : NaN;
  // Note: BASELINE_YEARS[2] is 2024-2025, which is the same as PERFORMANCE_YEAR
  const performanceY1 = baselineY3; // Same as baseline Y3 since both are 2024-2025
  
  // For 2025-2026 projection: use the numTransplants input as the projected value
  const projectedY2 = n; // Use the input number of transplants as the projection

  // Only show unique years: the three baseline years already include 2024-2025
  const volumeLabels = [...BASELINE_YEARS, '2025-2026'];
  const volumeData = [baselineY1, baselineY2, baselineY3].map(v => 
    Number.isFinite(v) ? v : null
  );
  const projectedData = [projectedY2]; // Separate array for projected values

  // Get center's actual Performance Y1 values
  const centerOfferAcceptRate = row ? asNum(row[`${PERFORMANCE_YEAR} - Organ Offer Acceptance Rate`], NaN) : NaN;
  const centerGraftSurvival = row ? asNum(row[`${PERFORMANCE_YEAR} - Graft Survival Rate`], NaN) : NaN;
  const centerGraftSurvivalPct = centerGraftSurvival > 1 ? centerGraftSurvival : centerGraftSurvival * 100;

  return {
    meta: {
      inputs,
      timestamp: new Date().toISOString(),
      model: "iota-v1-sim"
    },
    perTransplant: {
      upside: Math.round(perUpside),
      downside: Math.round(perDownside)
    },
    totals: {
      upside_total: Math.round(perUpside * n),
      downside_total: Math.round(perDownside * n)
    },
    distribution: {
      acceptance: acceptanceDist,
      graftSurvival: graftDist
    },
    transplantVolume: {
      monthLabels: volumeLabels,
      volumes: volumeData,
      projected: projectedData,
      target: transplantTarget
    },
    scores: {
      transplantTarget,
      currentTransplants: n,
      distanceFromTarget: transplantTarget - n,
      acceptancePercentile: percentileRank(acceptanceVals, offerAcceptRate),
      graftSurvivalPercentile: percentileRank(graftVals, graftSurvival),
      benchmarkAcceptanceRate: acceptanceVals.reduce((a,b)=>a+b,0)/acceptanceVals.length || 52,
      benchmarkGraftSurvival: graftVals.length ? graftVals.reduce((a,b)=>a+b,0)/graftVals.length : null,
      centerOfferAcceptRate: Number.isFinite(centerOfferAcceptRate) ? centerOfferAcceptRate : null,
      centerGraftSurvival: Number.isFinite(centerGraftSurvivalPct) ? centerGraftSurvivalPct : null,
      centerTransplants: performanceY1,
      achievementScore: achievement,
      efficiencyScore: efficiency,
      qualityScore: quality,
      totalScore
    }
  };
}
