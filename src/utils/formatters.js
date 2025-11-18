export const currency = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
};

export const percent = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toFixed(1) + '%';
};

// Parse CSV helper function
function parseCSV(text) {
  const lines = text.split('\n');
  if (!lines.length) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    const row = {};
    
    headers.forEach((header, index) => {
      let value = values[index]?.trim() || '';
      
      // Convert numeric strings to numbers
      if (value && !isNaN(value)) {
        value = Number(value);
      }
      
      row[header] = value;
    });
    
    data.push(row);
  }
  
  return data;
}

// Helper function to parse CSV line respecting quoted fields
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

// Load and parse transplant centers CSV
let centersData = null;

export async function loadTransplantCenters() {
  if (centersData) return centersData;
  
  try {
    const response = await fetch('/transplant-centers.csv');
    const text = await response.text();
    
    // Parse CSV
    const lines = text.split('\n');
    const headers = parseCSVLine(lines[0]);
    const nameIndex = headers.findIndex(h => h.trim() === 'Name');
    const ctrCdIndex = headers.findIndex(h => h.trim() === 'CTR_CD');
    
    centersData = {};
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      const ctrCd = values[ctrCdIndex]?.trim();
      const name = values[nameIndex]?.trim();
      
      if (ctrCd && name) {
        centersData[ctrCd.toUpperCase()] = name;
      }
    }
    
    console.log('Loaded centers data:', Object.keys(centersData).length, 'centers');
    return centersData;
  } catch (error) {
    console.error('Error loading transplant centers:', error);
    return {};
  }
}

export function getCenterNameById(centerId) {
  if (!centersData || !centerId) return null;
  return centersData[centerId.toUpperCase()] || null;
}

// Load and parse merged summary data
let summaryData = null;

export async function loadSummaryData() {
  if (summaryData) return summaryData;
  
  try {
    const response = await fetch('/merged_df_temp.csv');
    const text = await response.text();
    summaryData = parseCSV(text);
    return summaryData;
  } catch (error) {
    console.error('Error loading summary data:', error);
    return [];
  }
}

export function getSummaryData() {
  return summaryData || [];
}

export function getCenterPerformanceY1(centerId) {
  if (!summaryData || !centerId) return null;
  
  const centerCode = centerId.toUpperCase();
  const centerRow = summaryData.find(row => row.CTR_CD === centerCode);
  
  if (!centerRow) return null;
  
  return {
    numTransplants: centerRow['Performance Y1 - Transplants'] || null,
    offerAcceptRate: centerRow['Performance Y1 - Organ Offer Acceptance Rate'] || null,
    graftSurvival: centerRow['Performance Y1 - Graft Survival Rate'] || null,
    isIOTA: centerRow['IOTA'] === 1
  };
}

export function isIOTACenter(centerId) {
  if (!summaryData || !centerId) return false;
  
  const centerCode = centerId.toUpperCase();
  const centerRow = summaryData.find(row => row.CTR_CD === centerCode);
  
  return centerRow && centerRow['IOTA'] === 1;
}

export function centerExists(centerId) {
  if (!summaryData || !centerId) return false;
  
  const centerCode = centerId.toUpperCase();
  const centerRow = summaryData.find(row => row.CTR_CD === centerCode);
  
  return !!centerRow;
}
