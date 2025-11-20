import React, { useState, useEffect } from 'react';
import { loadTransplantCenters, getAllCenters, getCenterIdByName, getCenterNameById } from '../utils/formatters';

function InputForm({ inputs, onInputChange, onCalculate, onReset, warningMessage, response }) {
  const [centers, setCenters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const loadCenters = async () => {
      // Wait for centers data to load
      await loadTransplantCenters();
      const allCenters = getAllCenters();
      console.log('Loaded centers in InputForm:', allCenters.length);
      setCenters(allCenters);
    };
    loadCenters();
  }, []);

  // Sync search term with center name when centerId changes externally
  useEffect(() => {
    if (inputs.centerId && inputs.centerName) {
      setSearchTerm(inputs.centerName);
    } else if (inputs.centerId) {
      const name = getCenterNameById(inputs.centerId);
      if (name) {
        setSearchTerm(name);
      }
    } else {
      setSearchTerm('');
    }
  }, [inputs.centerId, inputs.centerName]);

  const handleCenterSearch = (value) => {
    setSearchTerm(value);
    setShowDropdown(true);
    
    // Only auto-update centerId if we have a valid 4-letter code
    if (value.length === 4 && /^[A-Z]{4}$/i.test(value)) {
      const upperValue = value.toUpperCase();
      // Check if this center ID exists
      const name = getCenterNameById(upperValue);
      if (name) {
        onInputChange('centerId', upperValue);
      }
    } else if (!value) {
      // Clear center ID when search is cleared
      onInputChange('centerId', '');
    }
    // For partial searches, don't update centerId until they select from dropdown
  };

  const handleCenterSelect = (center) => {
    setSearchTerm(center.name);
    setShowDropdown(false);
    onInputChange('centerId', center.id);
  };

  const filteredCenters = searchTerm 
    ? centers.filter(center => 
        center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.id.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : centers.slice(0, 50); // Show first 50 centers when no search term

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '500px', textAlign: 'left', position: 'relative' }}>
          <label htmlFor="centerSearch" style={{ display: 'block', marginBottom: '0.5rem' }}>Transplant Center</label>
          <input 
            id="centerSearch" 
            type="text" 
            placeholder="Search by name or enter ID (e.g., CASF)" 
            value={searchTerm}
            onChange={(e) => handleCenterSearch(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            style={{ 
              width: '100%',
              fontSize: '1rem',
              padding: '0.75rem',
              textAlign: 'left',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: '8px',
              background: '#ffffff'
            }}
          />
          
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '300px',
              overflowY: 'auto',
              background: '#ffffff',
              border: '1px solid rgba(96,165,250,0.3)',
              borderRadius: '8px',
              marginTop: '4px',
              zIndex: 1000,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(8px)'
            }}>
              {filteredCenters.length > 0 ? (
                <>
                  {searchTerm && (
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      color: 'rgba(0,0,0,0.5)',
                      borderBottom: '1px solid rgba(0,0,0,0.08)'
                    }}>
                      {filteredCenters.length} result{filteredCenters.length !== 1 ? 's' : ''} found
                    </div>
                  )}
                  {filteredCenters.map(center => (
                    <div
                      key={center.id}
                      onClick={() => handleCenterSelect(center)}
                      style={{
                        padding: '0.75rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(0,0,0,0.08)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(96,165,250,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'rgba(0,0,0,0.9)' }}>
                        {center.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(59,130,246,0.8)', marginTop: '2px' }}>
                        ID: {center.id}
                      </div>
                    </div>
                  ))}
                </>
              ) : searchTerm ? (
                <div style={{
                  padding: '1rem',
                  textAlign: 'center',
                  color: 'rgba(0,0,0,0.5)',
                  fontSize: '0.9rem'
                }}>
                  No centers found matching "{searchTerm}"
                </div>
              ) : (
                <div style={{
                  padding: '1rem',
                  textAlign: 'center',
                  color: 'rgba(0,0,0,0.5)',
                  fontSize: '0.9rem'
                }}>
                  Loading centers...
                </div>
              )}
            </div>
          )}
          
          {inputs.centerId && (
            <div style={{ marginTop: '8px', fontSize: '0.9rem', color: 'rgba(0,0,0,0.6)' }}>
              Center ID: <span style={{ fontWeight: '700', letterSpacing: '0.1em', color: '#3b82f6' }}>{inputs.centerId}</span>
            </div>
          )}
        </div>
        {warningMessage ? (
          <p style={{ 
            margin: 0, 
            fontSize: '1rem', 
            fontWeight: '600',
            color: '#dc2626',
            textAlign: 'center'
          }}>
            ⚠️ {warningMessage}
          </p>
        ) : null}
      </div>

      <div className="row">
        <div className="col">
          <label htmlFor="numTransplants">Expected Medicare FFS Transplants (annual)</label>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input 
                  id="numTransplants" 
                  type="range" 
                  min="1" 
                  max={(() => {
                    const centerTransplants = response?.scores?.centerTransplants;
                    if (centerTransplants && centerTransplants > 0) {
                      return Math.max(Math.round(centerTransplants * 3), 100);
                    }
                    return 1000; // Default fallback
                  })()}
                  step="1" 
                  value={inputs.numTransplants}
                  onChange={(e) => onInputChange('numTransplants', e.target.value)}
                  style={{ width: '100%' }}
                />
                {response?.scores?.centerTransplants && (
                  <div 
                    style={{ 
                      position: 'absolute',
                      left: `${(() => {
                        const centerTransplants = response.scores.centerTransplants;
                        const max = centerTransplants > 0 ? Math.max(Math.round(centerTransplants * 3), 100) : 1000;
                        const min = 1;
                        return ((centerTransplants - min) / (max - min)) * 100;
                      })()}%`,
                      top: '-10px',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      fontSize: '0.75rem',
                      color: '#f59e0b',
                      fontWeight: '600',
                      pointerEvents: 'none'
                    }}
                  >
                    Current: {Math.round(response.scores.centerTransplants)}
                  </div>
                )}
                {response?.scores?.centerTransplants && (
                  <div 
                    style={{ 
                      position: 'absolute',
                      left: `${(() => {
                        const centerTransplants = response.scores.centerTransplants;
                        const max = centerTransplants > 0 ? Math.max(Math.round(centerTransplants * 3), 100) : 1000;
                        const min = 1;
                        return ((centerTransplants - min) / (max - min)) * 100;
                      })() + .73}%`,
                      top: '20',
                      bottom: '0',
                      width: '2px',
                      height: '12px',
                      backgroundColor: '#f59e0b',
                      pointerEvents: 'none',
                      opacity: 0.7
                    }}
                  />
                )}
              </div>
              <input 
                type="number" 
                min="1" 
                max={(() => {
                  const centerTransplants = response?.scores?.centerTransplants;
                  if (centerTransplants && centerTransplants > 0) {
                    return Math.max(Math.round(centerTransplants * 3), 100);
                  }
                  return 1000; // Default fallback
                })()}
                step="1" 
                value={inputs.numTransplants}
                onChange={(e) => onInputChange('numTransplants', e.target.value)}
                style={{ width: '100px' }}
              />
            </div>
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
