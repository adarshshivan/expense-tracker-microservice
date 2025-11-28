// config.js
// Toggle ON for demo mode, OFF for real AWS mode
// Keep false for production. If API is unreachable, UI will auto-fallback to demo.
const USE_DEMO_MODE = false;

// Real API Gateway base (DO NOT add /expenses here). No trailing slash.
// Example: "https://abcd1234.execute-api.ap-south-1.amazonaws.com/prod"
const API_BASE_URL = "https://f50gcp2am7.execute-api.ap-south-1.amazonaws.com/prod";

// Demo expenses used when AWS resources are unavailable
const DEMO_DATA = [
  {
    "expense_id": "demo-1",
    "amount": 120,
    "category": "Food",
    "notes": "Demo food expense",
    "date": "2025-01-05T12:00:00Z"
  },
  {
    "expense_id": "demo-2",
    "amount": 350,
    "category": "Travel",
    "notes": "Demo travel charge",
    "date": "2025-01-10T15:30:00Z"
  }
];
