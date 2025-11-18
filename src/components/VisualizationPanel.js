import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { percent } from '../utils/formatters';

Chart.register(...registerables, annotationPlugin);

function VisualizationPanel({ response, inputs }) {
  const accChartRef = useRef(null);
  const graftChartRef = useRef(null);
  const volumeChartRef = useRef(null);
  const accChartInstance = useRef(null);
  const graftChartInstance = useRef(null);
  const volumeChartInstance = useRef(null);

  useEffect(() => {
    if (accChartRef.current) {
      const ctx = accChartRef.current.getContext('2d');
      accChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            { label: 'National distribution', data: [], backgroundColor: '#3b82f6', borderRadius: 6, barThickness: 14 }
          ]
        },
        options: {
          animation: { duration: 700 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`
              }
            },
            annotation: {
              annotations: {}
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)' } },
            y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(255,255,255,0.6)' } }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    if (graftChartRef.current) {
      const ctx = graftChartRef.current.getContext('2d');
      graftChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            { label: 'National distribution', data: [], backgroundColor: '#60a5fa', borderRadius: 6, barThickness: 14 }
          ]
        },
        options: {
          animation: { duration: 700 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`
              }
            },
            annotation: {
              annotations: {}
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)' } },
            y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(255,255,255,0.6)' } }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    if (volumeChartRef.current) {
      const ctx = volumeChartRef.current.getContext('2d');
      volumeChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Monthly Transplants',
              data: [],
              borderColor: '#2dd4bf',
              backgroundColor: 'rgba(45, 212, 191, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 5
            },
            {
              label: 'Target',
              data: [],
              borderColor: '#f59e0b',
              borderWidth: 2,
              borderDash: [8, 4],
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          animation: { duration: 700 },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { color: 'rgba(255,255,255,0.8)', boxWidth: 30, padding: 12 }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: 'rgba(255,255,255,0.6)',
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.03)' },
              ticks: { color: 'rgba(255,255,255,0.6)' }
            }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    return () => {
      if (accChartInstance.current) accChartInstance.current.destroy();
      if (graftChartInstance.current) graftChartInstance.current.destroy();
      if (volumeChartInstance.current) volumeChartInstance.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (response && accChartInstance.current && graftChartInstance.current && volumeChartInstance.current) {
      const acc = response.distribution?.acceptance;
      const graft = response.distribution?.graftSurvival;
      const volumeData = response.transplantVolume;

      if (acc && acc.bins) {
        const centerValue = Number(inputs.offerAcceptRate);
        const centerIndex = findBinIndex(acc.bins, centerValue);
        updateChart(accChartInstance.current, acc.bins, acc.freqs, centerIndex, centerValue);
      }

      if (graft && graft.bins) {
        const centerValue = Number(inputs.graftSurvival);
        const centerIndex = findBinIndex(graft.bins, centerValue);
        updateChart(graftChartInstance.current, graft.bins, graft.freqs, centerIndex, centerValue);
      }

      if (volumeData && volumeData.monthLabels && volumeData.volumes) {
        updateVolumeChart(volumeChartInstance.current, volumeData.monthLabels, volumeData.volumes, volumeData.target);
      }
    }
  }, [response, inputs]);

  const updateChart = (chart, bins, freqArray, centerIndex = null, centerValue = null) => {
    chart.data.labels = bins;
    chart.data.datasets[0].data = freqArray;
    
    // Remove previous annotation if it exists
    if (chart.options.plugins.annotation) {
      chart.options.plugins.annotation.annotations = {};
    }
    
    // Add vertical line annotation if center position is known
    if (centerIndex !== null && centerIndex >= 0 && centerIndex < bins.length) {
      chart.options.plugins.annotation.annotations.centerLine = {
        type: 'line',
        xMin: centerIndex,
        xMax: centerIndex,
        borderColor: '#10b981',
        borderWidth: 3,
        label: {
          display: true,
          content: `Center: ${centerValue !== null ? centerValue.toFixed(1) : bins[centerIndex]}`,
          position: 'start',
          backgroundColor: '#10b981',
          color: '#ffffff',
          font: {
            size: 11,
            weight: 'bold'
          },
          padding: 4,
          yAdjust: -10
        }
      };
    }
    
    chart.update();
  };

  const findBinIndex = (bins, centerValue) => {
    // Find the closest bin to the center value
    let closestIndex = 0;
    let closestDiff = Infinity;
    
    for (let i = 0; i < bins.length; i++) {
      const binValue = Number(bins[i]);
      if (!isNaN(binValue)) {
        const diff = Math.abs(binValue - centerValue);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = i;
        }
      }
    }
    
    return closestIndex;
  };

  const updateVolumeChart = (chart, labels, volumes, target) => {
    chart.data.labels = labels;
    chart.data.datasets[0].data = volumes;
    // Create horizontal line for target
    chart.data.datasets[1].data = new Array(labels.length).fill(target);
    chart.update();
  };

  return (
    <aside className="visual">
      <div className="card hero" style={{alignItems: 'center', padding: '12px 14px'}}>
        <div>
          <strong>Transplant Volume Trend</strong>
          <div className="small-muted">Baseline Year 1 through Performance Year 1</div>
        </div>
        <div style={{marginLeft: 'auto', width: '220px', textAlign: 'right'}}>
          <div className="small-muted">Center (input)</div>
          <div style={{fontWeight: '700', fontSize: '18px'}}>{inputs.numTransplants || 0}</div>
        </div>
      </div>

      <div className="chart-card card">
        <canvas ref={volumeChartRef}></canvas>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '8px'}}>
          <div className="small-muted">Transplant Volume from 2022 - 2025 SRTR Data</div>
        </div>
      </div>

      <div className="card hero" style={{alignItems: 'center', padding: '12px 14px'}}>
        <div>
          <strong>Offer Acceptance Rate Ratio</strong>
        </div>
        <div style={{marginLeft: 'auto', width: '220px', textAlign: 'right'}}>
          <div className="small-muted">Center (input)</div>
          <div style={{fontWeight: '700', fontSize: '18px'}}>{inputs.offerAcceptRate}</div>
        </div>
      </div>

      <div className="chart-card card">
        <canvas ref={accChartRef}></canvas>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '8px'}}>
          <div className="small-muted">Based on July 2024 - July 2025 SRTR Data</div>
          <div className="small-muted">Percentile: {response?.scores?.acceptancePercentile ? percent(response.scores.acceptancePercentile) : '--'}</div>
        </div>
      </div>

      <div className="card hero" style={{alignItems: 'center', padding: '12px 14px'}}>
        <div>
          <strong>Graft Survival Rate (1yr)</strong>
        </div>

        <div style={{marginLeft: 'auto', width: '220px', textAlign: 'right'}}>
          <div className="small-muted">Center (input)</div>
          <div style={{fontWeight: '700', fontSize: '18px'}}>{percent(inputs.graftSurvival)}</div>
        </div>
      </div>

      <div className="chart-card card">
        <canvas ref={graftChartRef}></canvas>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '8px'}}>
          <div className="small-muted">Based on July 2024 - July 2025 SRTR Data</div>
          <div className="small-muted">Percentile: {response?.scores?.graftSurvivalPercentile ? percent(response.scores.graftSurvivalPercentile) : '--'}</div>
        </div>
      </div>
    </aside>
  );
}

export default VisualizationPanel;
