import React from 'react';

function InputForm({ inputs, onInputChange, onCalculate, onReset, warningMessage }) {
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="row" style={{ alignItems: 'flex-end', gap: '1rem' }}>
        <div style={{width: '140px'}}>
          <label htmlFor="centerId">Center ID</label>
          <input 
            id="centerId" 
            type="text" 
            placeholder="e.g., CASF" 
            value={inputs.centerId}
            onChange={(e) => onInputChange('centerId', e.target.value)}
          />
        </div>
        {warningMessage ? (
          <p style={{ 
            margin: 0, 
            fontSize: '1rem', 
            fontWeight: '600',
            color: '#dc2626',
            flex: 1
          }}>
            ⚠️ {warningMessage}
          </p>
        ) : null}
      </div>

      <div className="row">
        <div className="col">
          <label htmlFor="numTransplants">Expected Medicare FFS Transplants (annual)</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input 
              id="numTransplants" 
              type="range" 
              min="1" 
              max="1000" 
              step="1" 
              value={inputs.numTransplants}
              onChange={(e) => onInputChange('numTransplants', e.target.value)}
              style={{ flex: 1 }}
            />
            <input 
              type="number" 
              min="1" 
              max="1000" 
              step="1" 
              value={inputs.numTransplants}
              onChange={(e) => onInputChange('numTransplants', e.target.value)}
              style={{ width: '100px' }}
            />
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col">
          <label htmlFor="offerAcceptRate">Offer Acceptance Rate</label>
          <input 
            id="offerAcceptRate" 
            type="number" 
            min="0" 
            max="100" 
            step="any" 
            value={inputs.offerAcceptRate}
            onChange={(e) => onInputChange('offerAcceptRate', e.target.value)}
          />
        </div>
        <div className="col">
          <label htmlFor="graftSurvival">Graft Survival Rate (1yr %)</label>
          <input 
            id="graftSurvival" 
            type="number" 
            min="0" 
            max="100" 
            step="any" 
            value={inputs.graftSurvival}
            onChange={(e) => onInputChange('graftSurvival', e.target.value)}
          />
        </div>
      </div>

      <div className="divider"></div>

      {/* <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button className="btn primary" onClick={onCalculate}>
          Run Model
        </button>
        <button className="btn" onClick={onReset}>
          Reset
        </button>
      </div> */}
    </form>
  );
}

export default InputForm;
