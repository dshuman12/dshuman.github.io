import React, { useEffect, useRef } from 'react';
import { currency } from '../utils/formatters';

function ResultsPanel({ response, status, showDetails, onToggleDetails, onCopyJson, onDownloadCsv, inputs }) {
  const upsideRef = useRef(null);
  const downsideRef = useRef(null);

  useEffect(() => {
    if (response && status === 'success') {
      const up = response.perTransplant?.upside ?? 0;
      const down = response.perTransplant?.downside ?? 0;
      
      if (upsideRef.current) {
        animateNumber(upsideRef.current, 0, up);
      }
      if (downsideRef.current) {
        animateNumber(downsideRef.current, 0, down);
      }
    }
  }, [response, status]);

  const animateNumber = (el, start, end, duration = 800) => {
    const startTime = performance.now();
    const diff = end - start;
    
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const val = start + diff * ease;
      el.textContent = currency(val);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Calculate scores
  const calculateScores = () => {
    if (!response?.scores) return { achievement: 0, quality: 0, efficiency: 0 };
    
    const scores = response.scores;
    
    // Achievement Score (out of 60) - based on distance from transplant target
    // The closer to target, the higher the score
    const distanceFromTarget = Math.abs(scores.distanceFromTarget);
    const maxDistance = scores.transplantTarget * 0.5; // Max distance considered is 50% of target
    const achievementRatio = Math.max(0, 1 - (distanceFromTarget / maxDistance));
    const achievementScore = Math.round(achievementRatio * 60);
    
    // Quality Score (out of 20) - based on graft survival percentile rank
    const qualityScore = Math.round((scores.graftSurvivalPercentile / 100) * 20);
    
    // Efficiency Score (out of 20) - max of achievement and improvement
    const efficiencyAchievementScore = Math.round((scores.acceptancePercentile / 100) * 20);
    const isAboveBenchmark = inputs.offerAcceptRate >= scores.benchmarkAcceptanceRate;
    const efficiencyImprovementScore = isAboveBenchmark ? 20 : 0;
    const efficiencyScore = Math.max(efficiencyAchievementScore, efficiencyImprovementScore);
    
    return { 
      achievement: achievementScore,
      quality: qualityScore,
      efficiency: efficiencyScore,
      efficiencyBreakdown: {
        achievement: efficiencyAchievementScore,
        improvement: efficiencyImprovementScore,
        isAboveBenchmark
      }
    };
  };

  const scores = calculateScores();
  const totalScore = response?.scores?.achievementScore + response?.scores?.qualityScore + response?.scores?.efficiencyScore;

  return (
    <>
      <div className="results" style={{marginTop: '18px'}}>

        {/* Score Display Section */}
        <div className="stat">
          <div className="label">Achievement Score</div>
          <div className="value" style={{fontSize: '32px'}}>{response?.scores?.achievementScore}/60</div>
          <div className="small-muted">
            {response?.scores && (
              <>
                Target: {Math.round(response.scores.transplantTarget)} transplants • 
                Current: {response.scores.currentTransplants} • 
                Distance: {Math.round(Math.abs(response.scores.distanceFromTarget))} 
                {response.scores.distanceFromTarget > 0 ? ' below' : ' above'}
              </>
            )}
          </div>
        </div>

        <div className="stat">
          <div className="label">Upside Payment per Transplant (1yr)</div>
          <div className="value animated-number"  style={{fontSize: '32px'}} ref={upsideRef}>$0</div>
          <div className="small-muted">
            {response?.totals?.upside_total ? `Total (estimated): ${currency(response.totals.upside_total)}` : ''}
          </div>
        </div>

        <div className="stat">
          <div className="label">Quality Score</div>
          <div className="value" style={{fontSize: '32px'}}>{response?.scores?.qualityScore}/20</div>
          <div className="small-muted">
            {response?.scores && (
              <>
                Graft Survival: {inputs.graftSurvival}% (
                {response.scores.graftSurvivalPercentile}th percentile)
              </>
            )}
          </div>
        </div>

        <div className="stat">
          <div className="label">Downside Payment per Transplant (2yr)</div>
          <div className="value animated-number"  style={{fontSize: '32px'}} ref={downsideRef}>$0</div>
          <div className="small-muted">
            {response?.totals?.downside_total ? `Total (estimated): ${currency(response.totals.downside_total)}` : ''}
          </div>
        </div>

        <div className="stat">
          <div className="label">Efficiency Score</div>
          <div className="value" style={{fontSize: '32px'}}>{response?.scores?.efficiencyScore}/20</div>
          <div className="small-muted">
            {response?.scores && (
              <>
                Acceptance Rate: {inputs.offerAcceptRate} •
                Achievement: {scores.efficiencyBreakdown.achievement}/20 
                ({response.scores.acceptancePercentile}th percentile) •
                Improvement: {scores.efficiencyBreakdown.improvement}/20 
                ({scores.efficiencyBreakdown.isAboveBenchmark ? 'above' : 'below'} benchmark {Math.round(response.scores.benchmarkAcceptanceRate * 100)}%)
              </>
            )}
          </div>
        </div>

        <div className="stat" style={{gridColumn: '1/-1', background: 'linear-gradient(135deg, rgba(96,165,250,0.1), rgba(45,212,191,0.1))', borderRadius: '8px', padding: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <div className="label">Total IOTA Score</div>
              <div style={{fontSize: '42px', fontWeight: '800', marginTop: '4px', color: '#60a5fa'}}>{totalScore}/100</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div className="label">Total Payment</div>
              <div style={{fontSize: '32px', fontWeight: '700', marginTop: '4px', color: '#2dd4bf'}}>
                {response?.totals ? currency((response.totals.upside_total || 0) + (response.totals.downside_total || 0)) : '$0'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDetails && response?.payments && (
        <div style={{marginTop: '12px'}}>
          <div className="card" style={{padding: '12px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <strong>Detailed Per-Transplant Payments</strong>
              <div className="small-muted">Rows limited to first 200 for performance</div>
            </div>

            <div style={{marginTop: '10px', overflow: 'auto', maxHeight: '260px', borderRadius: '8px'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead style={{position: 'sticky', top: 0, background: 'rgba(255,255,255,0.01)', backdropFilter: 'blur(2px)'}}>
                  <tr>
                    <th style={{textAlign: 'left', padding: '8px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.02)'}}>#</th>
                    <th style={{textAlign: 'left', padding: '8px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.02)'}}>Transplant ID</th>
                    <th style={{textAlign: 'right', padding: '8px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.02)'}}>Upside ($)</th>
                    <th style={{textAlign: 'right', padding: '8px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.02)'}}>Downside ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {response.payments.slice(0, 200).map((p, idx) => (
                    <tr key={idx}>
                      <td style={{padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.02)'}}>{idx + 1}</td>
                      <td style={{padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.02)'}}>{p.id || ''}</td>
                      <td style={{padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.02)'}}>{currency(p.upside)}</td>
                      <td style={{padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.02)'}}>{currency(p.downside)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ResultsPanel;
