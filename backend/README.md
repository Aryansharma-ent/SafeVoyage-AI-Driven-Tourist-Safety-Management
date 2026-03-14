# Tourist Risk Intelligence Platform

### Predictive AI-Driven Tourist Safety & Emergency Response System

## Overview

The **Tourist Risk Intelligence Platform** is a smart safety system designed to help protect tourists traveling in unfamiliar or high-risk regions. The platform combines **AI-based risk scoring, geospatial mapping, and emergency response tools** to proactively identify dangerous areas and enable rapid assistance when incidents occur.

The system analyzes environmental and contextual factors such as **crime rate, terrain difficulty, weather severity, and time of day** to generate a **dynamic risk score** for tourist locations.

Tourists can view **risk zones on an interactive map**, receive alerts when entering dangerous areas, report incidents, and trigger a **panic button** that shares their live location with an emergency dashboard.

This project is built as a **hackathon prototype using the MERN stack**.

---

# Problem Statement

Tourists traveling in unfamiliar areas often face several risks:

* Lack of awareness about **dangerous zones**
* Slow emergency response in remote areas
* Limited access to **real-time safety data**
* Poor coordination between travelers and authorities

The Tourist Risk Intelligence Platform addresses these issues by providing **predictive risk analysis and decentralized incident reporting**.

---

# Key Features

## 1. AI Risk Scoring Engine

The platform calculates a **risk score** for tourist areas using a lightweight predictive model.

### Risk Formula

risk_score =
0.4 × crime_rate

* 0.3 × weather_severity
* 0.2 × terrain_difficulty
* 0.1 × time_of_day_risk

### Risk Categories

🟢 Safe
🟡 Moderate Risk
🔴 High Risk

These scores help tourists **avoid dangerous areas before incidents occur**.

---

## 2. Interactive Risk Map

Users can explore an interactive map displaying risk levels across tourist locations.

Features include:

* Color-coded safety zones
* Location markers for reported incidents
* Dynamic risk visualization
* Real-time tourist safety data

Mapping technologies:

* Leaflet
* OpenStreetMap

---

## 3. Panic Emergency System

A panic button allows tourists to **immediately trigger an emergency alert**.

When activated, the system records:

* Device ID
* Latitude and Longitude
* Timestamp

The alert is instantly visible on the **admin dashboard**, allowing authorities to coordinate response efforts.

---

## 4. Incident Reporting

Users can report safety incidents such as:

* Theft
* Accidents
* Lost tourists
* Suspicious activity

These reports contribute to **crowdsourced safety intelligence**, improving risk analysis over time.

---

## 5. Tamper-Proof Incident Logging

Each incident report generates a **cryptographic hash** using SHA-256.

This simulates **blockchain-style tamper-evident logging** by linking each incident to the previous one using hashes.

---

# Why No User Authentication?

For a hackathon prototype, the platform avoids traditional login systems to **reduce friction during emergencies**.

Instead, the system uses **device IDs** generated on the client side.

Advantages:

* Faster emergency reporting
* No login delay during critical situations
* Simpler architecture for prototype development

In a production environment, secure authentication and identity verification would be implemented.

---

# System Architecture

Frontend → React
Backend → Node.js + Express
Database → MongoDB
Maps → Leaflet + OpenStreetMap
AI Engine → Risk scoring service

Architecture Flow:

User App → Backend API → Risk Engine → MongoDB → Map Visualization → Admin Dashboard

---

# Backend Folder Structure

server/
│
├── server.js
├── package.json
├── .env
│
├── config/
│   └── db.js
│
├── models/
│   ├── Incident.js
│   ├── RiskZone.js
│   ├── Emergency.js
│   └── Admin.js
│
├── routes/
│   ├── incidentRoutes.js
│   ├── riskRoutes.js
│   ├── emergencyRoutes.js
│   └── adminRoutes.js
│
├── controllers/
│   ├── incidentController.js
│   ├── riskController.js
│   ├── emergencyController.js
│   └── adminController.js
│
├── utils/
│   └── hashIncident.js
│
└── Middlewares/
	├── Errorhandler.js
	└── adminAuth.js

---

# Database Models

## RiskZone

Stores safety risk information for geographic areas.

Fields:

* name
* location (lat, lon)
* crimeRate
* weatherScore
* terrainScore
* timeScore
* tourist_density
* geofenceRadius (auto-computed from nearby incidents)
* riskScore
* riskLevel

---

## Incident

Stores crowd-sourced incident reports.

Fields:

* description
* location (latitude, longitude)
* deviceId
* incidentType
* previousHash
* incidentHash
* timestamps

---

## Emergency

Stores panic button alerts.

Fields:

* deviceId
* location
* status
* emergencyType
* message
* timestamps

---

## Admin

Stores admin credentials for protected update operations.

Fields:

* name
* email
* password (bcrypt hash)
* role

---

# API Endpoints

## Risk Zones

Create a risk zone

POST /api/risk/create

Get all risk zones

GET /api/risk/all

Check whether a user location falls inside any risk geofence

POST /api/risk/geofence/check

---

## Incident Reporting

Submit an incident

POST /api/incidents/report

Retrieve all incidents

GET /api/incidents/all

Verify hash chain integrity

GET /api/incidents/verify-chain

---

## Emergency System

Trigger panic alert

POST /api/emergency/panic

Get active emergencies

GET /api/emergency/all

---

## Admin

Admin login

POST /api/admin/login

Update emergency by ID (protected)

PATCH /api/admin/emergency/:id

Update risk zone by ID (protected)

PATCH /api/admin/risk/:id

---

# Example Request

### Panic Button Request

POST /api/emergency/panic

Request Body

{
"deviceId": "device_123",
"location": {
"lat": 28.6139,
"lon": 77.2090
},
"emergencyType": "medical",
"message": "Tourist collapsed near gate"
}

Response

{
"_id": "...",
"deviceId": "device_123",
"status": "active",
"location": {
"lat": 28.6139,
"lon": 77.2090
},
"emergencyType": "medical",
"message": "Tourist collapsed near gate"
}

---

# AI Risk Integration (MVP)

In the current backend, risk fields are stored via API, and geofence radius is automatically estimated using nearby incident coordinates.

Planned integration path:

* AI model returns crime/weather/terrain/time scores and final risk classification.
* Backend validates and stores the model output.
* Frontend consumes the stored risk and geofence status for alerts.

---

# Tech Stack

Frontend
React
Leaflet

Backend
Node.js
Express.js

Database
MongoDB

Libraries
Axios
Crypto (SHA-256 hashing)

---

# Setup Instructions

## Clone Repository

git clone https://github.com/your-repo/tourist-risk-intelligence

cd tourist-risk-intelligence

---

## Install Backend Dependencies

npm install

---

## Environment Variables

Create a .env file:

MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=admin_email_for_reference

---

## Run Server

npm run dev

Server will run on:

http://localhost:8000

---

# Future Improvements

The platform can be extended with:

* Real machine learning models for predictive analysis
* Real blockchain integration for immutable logging
* Live GPS tracking
* Route safety recommendations
* Integration with government emergency systems
* AI anomaly detection for suspicious behavior

---

# Target Users

* Tourists traveling in unfamiliar locations
* Adventure travelers and trekkkers
* Tourism safety authorities
* Emergency response teams

---

# Project Vision

The goal of this platform is to create a **predictive safety ecosystem** that protects travelers before incidents occur and enables faster response during emergencies.

By combining **AI risk modeling, geospatial intelligence, and decentralized reporting**, the system helps make travel **safer and more informed**.

---

# Hackathon Note

This project is a **prototype built for a hackathon**. Some components such as predictive AI models and blockchain functionality are simplified for demonstration purposes.
