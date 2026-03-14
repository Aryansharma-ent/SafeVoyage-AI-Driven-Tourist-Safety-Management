# SafeVoyage

AI-driven Tourist Safety and Emergency Management Platform.

SafeVoyage is a full-stack risk intelligence system that combines:
- Incident reporting
- AI-based area risk scoring
- Dynamic geofence zones
- Live map visualization
- Emergency SOS handling
- Tamper-evident incident chain logging

The platform is designed for hackathon and prototype scenarios where rapid incident capture and proactive alerts matter more than heavy onboarding friction.

## 1. Problem It Solves
Tourists in unfamiliar places often lack:
- Real-time awareness of dangerous areas
- Fast and contextual emergency response
- Trustworthy incident records

SafeVoyage addresses this by continuously converting crowd incidents and environmental context into actionable map risk zones and entry alerts.

## 2. Core Features
- AI risk prediction engine for location-level scoring
- Automatic risk-zone creation and updates from incidents
- Geo-fence entry detection and risk alerting
- Interactive map with color-coded zones and risk dots
- Panic-based emergency reporting
- Tamper-evident incident hash chain validation
- Admin login and protected management endpoints

## 3. Tech Stack
### Frontend
- React
- React Router
- React Leaflet + Leaflet
- Axios
- React Icons

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- JWT-based admin protection

### AI and Data
- Python
- scikit-learn (RandomForestRegressor)
- pandas, numpy, joblib
- LabelEncoder for categorical features

## 4. Architecture
User App -> Backend API -> Risk Signal Engine -> Python Model Inference -> MongoDB Risk Zones -> Map Rendering + Geofence Alerts

Data flow summary:
1. User reports incident
2. Incident stored with previousHash and incidentHash
3. Backend derives area signals from nearby incidents and device density
4. Backend calls Python model process for risk prediction
5. Risk zone is upserted with score, level, and geofence radius
6. Map fetches zones and checks if user entered any geofence

## 5. Repository Structure

```text
.
|- backend/
|  |- createAdmin.js
|  |- server/
|     |- server.js
|     |- config/db.js
|     |- Controllers/
|     |- Middlewares/
|     |- Models/
|     |- Routes/
|     |- utils/
|- frontend/
|  |- tourist-risk-platform/
|     |- src/
|        |- components/
|        |- pages/
|        |- services/
|- model/
|  |- train_model.py
|  |- predict.py
|  |- risk_model.pkl
|  |- state_encoder.pkl
|  |- desc_encoder.pkl
|- tourist_risk_dataset.csv
```

## 6. AI Model Details
### Training
Training script: model/train_model.py

- Reads dataset from either:
  - dataset/tourist_risk_dataset.csv
  - tourist_risk_dataset.csv
- Encodes state and description with LabelEncoder
- Trains RandomForestRegressor (100 trees)
- Stores:
  - risk_model.pkl
  - state_encoder.pkl
  - desc_encoder.pkl

### Runtime Inference
Inference script: model/predict.py

Input features:
- state
- description
- crime_rate
- weather_risk
- terrain_difficulty
- tourist_density
- time_of_day

Runtime enrichments:
- weather_risk from Open-Meteo weather code mapping
- terrain_difficulty from Open-Elevation (normalized)
- time_of_day from UTC day/night logic

Output:
- risk_score (0 to 100)
- risk_score_normalized (0 to 1)
- risk_level (safe, low, moderate, high)
- feature_snapshot for explainability

Risk level thresholds:
- safe: score < 35
- low: 35 to < 55
- moderate: 55 to < 75
- high: >= 75

## 7. Incident-Driven Risk Signal Engine
File: backend/server/utils/riskZoneEngine.js

Signal derivation logic:
- Nearby incidents selected by geo window
- Weighted incident load by type:
  - theft: 1.0
  - suspicious: 0.8
  - accident: 0.7
  - lost: 0.4
  - other: 0.5
- crimeRate derived from weighted incident pressure
- tourist_density derived from unique nearby device IDs
- state reverse-geocoded from location (fallback unknown)
- semantic description inferred from dominant incident type
- geofence radius auto-computed from distance spread of nearby incidents

## 8. Backend API
Base URL: http://localhost:8000/api

### Risk
- GET /risk/all
  - Fetch all risk zones
- POST /risk/create (admin protected)
  - Create zone (or use derived AI fields)
- POST /risk/predict
  - Predict risk for location with optional context
- POST /risk/geofence/check
  - Check whether user location is inside any risk geofence

### Incidents
- GET /incidents/all
- POST /incidents/report
  - Reports incident and triggers automatic risk-zone upsert
- GET /incidents/verify-chain
  - Verifies hash chain integrity

### Emergency
- GET /emergency/all
- POST /emergency/panic

### Admin
- POST /admin/login
- PATCH /admin/emergency/:id (protected)
- PATCH /admin/risk/:id (protected)

## 9. Database Models
### Incident
- deviceId
- location.lat, location.lon
- description
- incidentType
- previousHash
- incidentHash
- timestamps

### RiskZone
- name
- location.lat, location.lon
- state
- description
- crimeRate
- weatherScore
- terrainScore
- timeScore
- tourist_density
- riskScore (0 to 100)
- riskLevel
- geofenceRadius
- timestamps

### Emergency
- deviceId
- location
- status
- emergencyType
- message
- timestamps

### Admin
- name
- email
- password (hashed)
- role

## 10. Frontend Behavior
Map page:
- Continuously tracks user location
- Fetches and refreshes risk zones
- Renders risk circles and colored zone dots
- Calls geofence endpoint periodically
- Shows "inside risk zone" alerts and status
- Displays live AI prediction card for current location

Incident page:
- Captures current location
- Allows manual location pinning via map click
- Sends incident details to backend

## 11. Setup Instructions
## Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB URI

### A. Backend setup
1. Open terminal in backend
2. Install dependencies:
   npm install
3. Create backend .env with:
   - MONGO_URL=<your_mongodb_connection_string>
   - JWT_SECRET=<your_secret>
   - ADMIN_EMAIL=<admin_email>
4. Optional: create admin user
   node createAdmin.js
5. Run backend:
   npm run dev

Backend runs on port 8000.

### B. Frontend setup
1. Open terminal in frontend/tourist-risk-platform
2. Install dependencies:
   npm install
3. Optional .env:
   REACT_APP_API_URL=http://localhost:8000/api
4. Run frontend:
   npm start

Frontend runs on port 3000.

### C. Model setup
1. Open terminal in model
2. Install Python dependencies:
   py -3 -m pip install joblib numpy pandas scikit-learn requests
3. Train model:
   py -3 train_model.py

This generates model artifacts used by backend inference.

## 12. Quick Demo Script (For Judges)
1. Start backend and frontend.
2. Open incident page and report a theft at a location.
3. Explain that backend stores a tamper-evident incident hash chain.
4. Show that incident triggers automatic AI risk-zone upsert.
5. Open map and show new/updated risk zone dot and geofence.
6. Move into zone (or use same coordinates) and show risk entry alert.
7. Call /api/risk/predict and show explainable feature snapshot output.
8. Call /api/incidents/verify-chain and show chain integrity check.

## 13. What Makes This Strong
- Not static heatmap: risk changes with new incidents
- Hybrid intelligence: incident signals + weather + terrain + time
- Real operational behavior: geofence entry alerts
- Explainable outputs: feature snapshot returned with prediction
- Trust layer: tamper-evident incident chain

## 14. Current Limitations
- Dataset is synthetic/prototype-grade and should be calibrated on real data
- External weather/elevation APIs can timeout; fallback defaults are used
- Geofence is circular heuristic, not route-network aware polygons

## 15. Future Improvements
- Critical severity tier and adaptive alert escalation
- Queue/caching layer for high-throughput incident bursts
- Strong reverse geocoder for region fidelity
- Time-series retraining pipeline and model versioning
- Role-based dashboards with analytics and SLA tracking

## 16. License
Prototype for educational/hackathon use.
