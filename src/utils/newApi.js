// newApi.js
// Browser-safe API. NO fs, NO file loading. All data must be passed in via inputs.summary and inputs.graftData.

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
  const keys = [
    "Baseline Y1 - Transplants",
    "Baseline Y2 - Transplants",
    "Baseline Y3 - Transplants"
  ];
  const vals = keys.map(k => asNum(row[k], NaN)).filter(v => !Number.isNaN(v));
  if (!vals.length) return NaN;
  return vals.reduce((a,b)=>a+b,0) / vals.length;
}

function computeNationalGrowthRate(summary) {
  if (!summary || !summary.length) return 0;

  let baselineTotal = 0;
  let perfTotal = 0;
  let count = 0;

  summary.forEach(r => {
    const avg = meanBaselineForCenter(r);
    if (!Number.isNaN(avg)) {
      baselineTotal += avg;
      count++;
    }
    const perf = asNum(r["Performance Y1 - Transplants"], NaN);
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
  const key = "Performance Y1 - Organ Offer Acceptance Rate";
  const rates = summary.map(r => asNum(r[key], NaN)).filter(v => Number.isFinite(v));

  const centerRow = summary.find(r => String(r.CTR_CD).trim() === String(centerCode).trim());
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
  const key = "Performance Y1 - Graft Survival Rate";
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

  // --------- REAL DISTRIBUTIONS ----------
  const acceptanceVals = summary
    .map(r => asNum(r["Performance Y1 - Organ Offer Acceptance Rate"], NaN))
    .filter(v => Number.isFinite(v));

  // Filter out non-finite values, zeros, and empty strings for graft survival
  const graftVals = graftData
    .map(r => asNum(r["Performance Y1 - Graft Survival Rate"], NaN))
    .filter(v => Number.isFinite(v) && v > 0)
    .map(v => (v > 1 ? v : v * 100));

  const acceptanceDist = buildDistributionFromValues(acceptanceVals) || { bins: [], freqs: [], values: [] };
  const graftDist = buildDistributionFromValues(graftVals) || { bins: [], freqs: [], values: [] };

  // --------- NATIONAL GROWTH + TARGET ----------
  const ngr = computeNationalGrowthRate(summary);
  console.log(ngr)

  const row = summary.find(r => String(r.CTR_CD).trim() === String(centerCode).trim());
  const baselineAvg = row ? meanBaselineForCenter(row) : NaN;

  const transplantTarget =
    Number.isFinite(baselineAvg) ? baselineAvg * (1 + ngr) : n * 1.15;

  // --------- SCORES ----------
  const achievement = calculateAchievement(n, transplantTarget);
  const efficiency = calculateEfficiency(summary, centerCode, offerAcceptRate);
  const quality = calculateQuality(graftData.length ? graftData : summary, graftSurvival);

  const totalScore = achievement + efficiency + quality;

  // --------- PAYMENTS ----------
  let perUpside = 15000 * (totalScore - 60) / 40;
  let perDownside = 2000 * (40 - totalScore) / 40;

  if (41 <= totalScore && totalScore <= 59) {
    perUpside = 0;
    perDownside = 0;
  }

  // Ensure upside is never negative
  perUpside = Math.max(0, perUpside);
  perDownside = Math.min(0, perDownside);

  const payments = [];
  for (let i = 0; i < Math.min(1000, n); i++) {
    const u = perUpside * (0.85 + Math.random() * 0.3);
    const d = perDownside * (0.75 + Math.random() * 0.4);
    payments.push({
      id: `TX-${i+1}`,
      upside: Math.round(Math.max(0, u)),
      downside: Math.round(Math.max(0, d))
    });
  }

  // --------- TRANSPLANT VOLUME DATA ----------
  const baselineY1 = row ? asNum(row["Baseline Y1 - Transplants"], NaN) : NaN;
  const baselineY2 = row ? asNum(row["Baseline Y2 - Transplants"], NaN) : NaN;
  const baselineY3 = row ? asNum(row["Baseline Y3 - Transplants"], NaN) : NaN;
  const performanceY1 = row ? asNum(row["Performance Y1 - Transplants"], NaN) : NaN;

  const volumeLabels = ['Baseline Y1', 'Baseline Y2', 'Baseline Y3', 'Performance Y1'];
  const volumeData = [baselineY1, baselineY2, baselineY3, performanceY1].map(v => 
    Number.isFinite(v) ? v : null
  );

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
      target: transplantTarget
    },
    scores: {
      transplantTarget,
      currentTransplants: n,
      distanceFromTarget: transplantTarget - n,
      acceptancePercentile: percentileRank(acceptanceVals, offerAcceptRate),
      graftSurvivalPercentile: percentileRank(graftVals, graftSurvival),
      benchmarkAcceptanceRate: acceptanceVals.reduce((a,b)=>a+b,0)/acceptanceVals.length || 52,
      achievementScore: achievement,
      efficiencyScore: efficiency,
      qualityScore: quality,
      totalScore
    },
    nRecords: payments.length
  };
}
