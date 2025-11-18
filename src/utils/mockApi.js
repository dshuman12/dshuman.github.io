// Mock API: simulate a realistic response
export function simulateApiPayload(inputs) {
  const n = Number(inputs.numTransplants) || 50;
  const baseUpsidePer = 2500 + (Math.random() * 3000);
  const baseDownsidePer = 1200 + (Math.random() * 2000);

  // Slight center adjustments based on quality metrics
  const acceptanceEffect = (inputs.offerAcceptRate - 50) * 10;
  const graftEffect = (inputs.graftSurvival - 90) * 8;

  const perUpside = Math.max(200, baseUpsidePer + acceptanceEffect + graftEffect);
  const perDownside = Math.max(100, baseDownsidePer - (graftEffect * 0.6) + (50 - inputs.offerAcceptRate) * 6);

  // Build distributions (normal-ish) for national distribution
  function buildDistribution(mean, sd, bins = 20) {
    const values = [];
    // simulate 500 centers sampled
    for (let i = 0; i < 500; i++) {
      const r = mean + sd * gaussianRandom();
      values.push(Math.max(0, Math.min(100, r)));
    }
    // histogram bins
    const min = Math.max(0, Math.floor(Math.min(...values)));
    const max = Math.ceil(Math.max(...values));
    const binCount = bins;
    const binSize = (max - min) / binCount || 1;
    const binsLabels = [];
    const freqs = new Array(binCount).fill(0);
    values.forEach(v => {
      const idx = Math.min(binCount - 1, Math.floor((v - min) / binSize));
      freqs[idx]++;
    });
    for (let i = 0; i < binCount; i++) {
      const start = (min + i * binSize);
      const end = (min + (i + 1) * binSize);
      binsLabels.push(`${start.toFixed(0)}-${end.toFixed(0)}`);
    }
    // percentiles
    const sorted = values.slice().sort((a, b) => a - b);
    const p = (perc) => sorted[Math.min(sorted.length - 1, Math.floor(perc / 100 * sorted.length))];
    return {
      bins: binsLabels,
      freqs: freqs.map(f => Math.round((f / values.length) * 100)),
      values,
      percentiles: { p10: p(10), p25: p(25), p50: p(50), p75: p(75), p90: p(90) }
    };
  }

  // gaussian helper
  function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  const acceptanceDist = buildDistribution(50, 12);
  const graftDist = buildDistribution(90, 6);

  // Calculate percentile ranks
  function calculatePercentile(value, distribution) {
    const sorted = distribution.values.slice().sort((a, b) => a - b);
    const rank = sorted.filter(v => v < value).length;
    return Math.round((rank / sorted.length) * 100);
  }

  const acceptancePercentile = calculatePercentile(inputs.offerAcceptRate, acceptanceDist);
  const graftSurvivalPercentile = calculatePercentile(inputs.graftSurvival, graftDist);

  // Transplant target (could be based on organ type, for now using a formula)
  const transplantTarget = Math.round(n * 1.15); // Target is 15% above current
  
  // Benchmark acceptance rate (national average or policy threshold)
  const benchmarkAcceptanceRate = 52.0;

  // Generate transplant volume time series (baseline year 1 through performance year 1)
  // 12 months of baseline + 12 months of performance = 24 months total
  const transplantTimeSeries = [];
  const monthLabels = [];
  const baselineStart = n * 0.85; // Start slightly below current
  const performanceEnd = n * 1.05; // End slightly above current
  const monthlyGrowth = (performanceEnd - baselineStart) / 23; // Growth per month
  
  for (let month = 1; month <= 24; month++) {
    const yearLabel = month <= 12 ? 'Baseline Y1' : 'Performance Y1';
    const monthInYear = month <= 12 ? month : month - 12;
    monthLabels.push(`${yearLabel} M${monthInYear}`);
    
    // Add some realistic variation
    const baseValue = baselineStart + (monthlyGrowth * (month - 1));
    const variation = (Math.random() - 0.5) * (n * 0.08); // ±8% variation
    transplantTimeSeries.push(Math.max(1, Math.round(baseValue + variation)));
  }

  // Build per-transplant payments array for detail table
  const payments = [];
  for (let i = 0; i < Math.min(1000, n); i++) {
    const u = perUpside * (0.85 + Math.random() * 0.3);
    const d = perDownside * (0.75 + Math.random() * 0.4);
    payments.push({ id: `TX-${i + 1}`, upside: Math.round(u), downside: Math.round(d) });
  }

  return {
    meta: {
      inputs,
      timestamp: new Date().toISOString(),
      model: "iota-v1-sim",
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
    scores: {
      transplantTarget: transplantTarget,
      currentTransplants: n,
      distanceFromTarget: transplantTarget - n,
      acceptancePercentile: acceptancePercentile,
      graftSurvivalPercentile: graftSurvivalPercentile,
      benchmarkAcceptanceRate: benchmarkAcceptanceRate
    },
    transplantVolume: {
      monthLabels: monthLabels,
      volumes: transplantTimeSeries,
      target: transplantTarget
    },
    payments,
    nRecords: payments.length
  };
}
