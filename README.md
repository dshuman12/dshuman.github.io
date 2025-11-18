# IOTA Model Calculator

A React-based web application for estimating Medicare FFS transplant payments with interactive visualizations.

## Features

- Interactive form for transplant center inputs
- Real-time payment calculations
- Distribution charts for offer acceptance and graft survival rates
- Mock API mode for testing/demo
- Live API integration support
- CSV export functionality
- Detailed payment breakdowns

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Usage

1. **Load Example**: Click to populate the form with sample data
2. **Enter Data**: Fill in transplant center information and metrics
3. **Mode Selection**: Choose between Mock (demo) or Live (API) mode
4. **Calculate**: Click "Run Model" or "Calculate" to process the data
5. **View Results**: Review payments, distributions, and percentiles
6. **Export**: Download results as CSV or copy JSON response

## API Integration

When using Live mode, the application expects a POST endpoint that accepts:

```json
{
  "inputs": {
    "centerName": "string",
    "centerId": "string",
    "organType": "string",
    "numTransplants": number,
    "offerAcceptRate": number,
    "graftSurvival": number
  }
}
```

And returns a response matching the mock API structure.

## Technology Stack

- React 18
- Chart.js 4
- React-ChartJS-2
- CSS-in-JS with custom styling

## License

© IOTA 2025
