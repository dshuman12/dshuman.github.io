import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import InputForm from './components/InputForm';
import ResultsPanel from './components/ResultsPanel';
import VisualizationPanel from './components/VisualizationPanel';
import Footer from './components/Footer';
import { compileCenterResults } from './utils/newApi';
import { loadTransplantCenters, getCenterNameById, loadSummaryData, getSummaryData, getCenterPerformanceY1, isIOTACenter, centerExists } from './utils/formatters';

function App() {
  const [inputs, setInputs] = useState({
    centerName: '',
    centerId: '',
    organType: 'Kidney',
    numTransplants: 0,
    offerAcceptRate: 0,
    graftSurvival: 0,
    apiUrl: '',
    mode: 'mock'
  });

  const [response, setResponse] = useState(null);
  const [status, setStatus] = useState('idle');
  const [showDetails, setShowDetails] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const autoRunTimer = useRef(null);

  // Load transplant centers and summary data on mount
  useEffect(() => {
    loadTransplantCenters();
    loadSummaryData();
  }, []);

  const handleInputChange = (field, value) => {
    setInputs(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-fill center name and performance Y1 data when center ID changes
      if (field === 'centerId') {
        if (value) {
          const centerName = getCenterNameById(value);
          if (centerName) {
            updated.centerName = centerName;
          } else {
            updated.centerName = '';
          }
          
          // Only check and show warnings if the center ID is exactly 4 characters
          if (value.length === 4) {
            const exists = centerExists(value);
            const isIOTA = isIOTACenter(value);
            
            if (!exists) {
              setWarningMessage("We don't have any baseline data for this center");
            } else if (!isIOTA) {
              setWarningMessage("This center is not participating in IOTA");
            } else {
              setWarningMessage('');
            }
          } else {
            setWarningMessage('');
          }
        } else {
          updated.centerName = '';
          setWarningMessage('');
        }
        
        // Load Performance Y1 data for this center
        const perfData = getCenterPerformanceY1(value);
        if (perfData) {
          if (perfData.numTransplants !== null) {
            updated.numTransplants = perfData.numTransplants;
          }
          if (perfData.offerAcceptRate !== null) {
            updated.offerAcceptRate = perfData.offerAcceptRate;
          }
          if (perfData.graftSurvival !== null) {
            updated.graftSurvival = Math.round(perfData.graftSurvival * 10) / 10;
          }
        }
      }
      
      return updated;
    });
  };

  const handleLoadExample = () => {
    setWarningMessage('');
    setInputs({
      centerName: 'University of California San Francisco Medical Center',
      centerId: 'CASF',
      organType: 'Kidney',
      numTransplants: 361,
      offerAcceptRate: 1.53,
      graftSurvival: 95.40,
      apiUrl: '',
      mode: 'mock'
    });
  };

  const handleReset = () => {
    setWarningMessage('');
    setInputs({
      centerName: '',
      centerId: 'CASF',
      organType: 'Kidney',
      numTransplants: 361,
      offerAcceptRate: 1.53,
      graftSurvival: 95.40,
      apiUrl: '',
      mode: 'mock'
    });
  };

  const handleCalculate = useCallback(async () => {
    setStatus('running');
    try {
      let result = null;
      if (inputs.mode === 'mock') {
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 500));
        
        // Get the summary data and add it to inputs
        const summaryData = getSummaryData();
        const enrichedInputs = {
          ...inputs,
          summary: summaryData,
          graftData: summaryData, // Using same data for graft calculations
          centerCode: inputs.centerId
        };
        
        console.log('Enriched inputs:', enrichedInputs);
        result = compileCenterResults(enrichedInputs);
        console.log('Result:', result);
      } else {
        // Call live API
        const url = inputs.apiUrl;
        if (!url) throw new Error('API URL required when running in live mode.');
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs }),
          mode: 'cors'
        });
        if (!res.ok) throw new Error(`API request failed (${res.status})`);
        result = await res.json();
      }
      setResponse(result);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }, [inputs]);

  // Auto-run model when required fields are filled
  useEffect(() => {
    const hasRequiredFields = 
      inputs.numTransplants && 
      inputs.offerAcceptRate && 
      inputs.graftSurvival &&
      inputs.numTransplants !== '' &&
      inputs.offerAcceptRate !== '' &&
      inputs.graftSurvival !== '';
    
    if (hasRequiredFields) {
      // Clear any existing timer
      if (autoRunTimer.current) {
        clearTimeout(autoRunTimer.current);
      }
      
      // Use a small delay to debounce rapid changes (especially for slider)
      autoRunTimer.current = setTimeout(() => {
        handleCalculate();
      }, 300);
      
      return () => {
        if (autoRunTimer.current) {
          clearTimeout(autoRunTimer.current);
        }
      };
    }
  }, [inputs.numTransplants, inputs.offerAcceptRate, inputs.graftSurvival, handleCalculate]);

  const handleCopyJson = () => {
    if (!response) return alert('No response to copy.');
    navigator.clipboard.writeText(JSON.stringify(response, null, 2)).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => alert('Copy failed.'));
  };

  const handleDownloadCsv = () => {
    if (!response) return alert('No results to download.');
    const payments = response.payments || [];
    let csv = 'Transplant ID,Upside,Downside\n';
    payments.forEach(p => {
      csv += `${p.id || ''},${p.upside || 0},${p.downside || 0}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iota_payments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <Header 
        onLoadExample={handleLoadExample}
        inputs={inputs}
      />
      
      <section className="card" aria-label="Inputs and summary">
        <InputForm 
          inputs={inputs}
          onInputChange={handleInputChange}
          onCalculate={handleCalculate}
          onReset={handleReset}
          warningMessage={warningMessage}
          response={response}
        />
        
        <ResultsPanel 
          response={response}
          status={status}
          showDetails={showDetails}
          onToggleDetails={() => setShowDetails(!showDetails)}
          onCopyJson={handleCopyJson}
          onDownloadCsv={handleDownloadCsv}
          inputs={inputs}
        />
      </section>

      <VisualizationPanel 
        response={response}
        inputs={inputs}
      />

      <Footer />
    </div>
  );
}

export default App;
