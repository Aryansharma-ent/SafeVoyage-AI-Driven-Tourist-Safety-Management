/**
 * Demo Seeder — Tourist Risk Intelligence Platform
 * Usage:
 *   node seedDemo.js                     (defaults to Jaipur)
 *   node seedDemo.js --city jaipur
 *   node seedDemo.js --city delhi
 *   node seedDemo.js --city mumbai
 *   node seedDemo.js --city bangalore
 *   node seedDemo.js --city goa
 *   node seedDemo.js --clear             (wipes all demo data without re-seeding)
 *   node seedDemo.js --city mumbai --clear (wipes then seeds Mumbai)
 */

import mongoose from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });

// ─── Models (inline schema to avoid import graph issues) ────────────────────

const IncidentSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lon: { type: Number, required: true, min: -180, max: 180 },
    },
    description: { type: String, required: true },
    incidentType: {
      type: String,
      enum: ["theft", "accident", "lost", "suspicious", "other"],
      default: "other",
      required: true,
    },
    previousHash: { type: String, required: true },
    incidentHash: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const RiskZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },
    crimeRate: { type: Number, required: true, min: 0, max: 1 },
    weatherScore: { type: Number, required: true, min: 0, max: 1 },
    terrainScore: { type: Number, required: true, min: 0, max: 1 },
    timeScore: { type: Number, required: true, min: 0, max: 1 },
    tourist_density: { type: Number, required: true },
    state: { type: String, default: "unknown" },
    description: { type: String, default: "city tourism" },
    geofenceRadius: { type: Number, default: 500, min: 50 },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: {
      type: String,
      enum: ["safe", "low", "moderate", "high"],
      default: "safe",
    },
  },
  { timestamps: true }
);

const Incident = mongoose.models.Incident || mongoose.model("Incident", IncidentSchema);
const RiskZone = mongoose.models.RiskZone || mongoose.model("RiskZone", RiskZoneSchema);

// ─── City Data ───────────────────────────────────────────────────────────────

const CITIES = {
  jaipur: {
    label: "Jaipur, Rajasthan",
    state: "Rajasthan",
    spots: [
      { name: "Hawa Mahal",      lat: 26.9239, lon: 75.8267 },
      { name: "Amber Fort",      lat: 26.9855, lon: 75.8513 },
      { name: "City Palace",     lat: 26.9258, lon: 75.8237 },
      { name: "Jantar Mantar",   lat: 26.9246, lon: 75.8242 },
      { name: "Nahargarh Fort",  lat: 26.9477, lon: 75.8141 },
      { name: "Jal Mahal",       lat: 26.9528, lon: 75.8382 },
      { name: "Albert Hall",     lat: 26.9116, lon: 75.8193 },
      { name: "Johri Bazaar",    lat: 26.9198, lon: 75.8216 },
    ],
  },
  delhi: {
    label: "New Delhi",
    state: "Delhi",
    spots: [
      { name: "India Gate",              lat: 28.6129, lon: 77.2295 },
      { name: "Red Fort",                lat: 28.6562, lon: 77.2410 },
      { name: "Qutub Minar",             lat: 28.5245, lon: 77.1855 },
      { name: "Lotus Temple",            lat: 28.5535, lon: 77.2588 },
      { name: "Chandni Chowk",           lat: 28.6508, lon: 77.2311 },
      { name: "Humayun's Tomb",          lat: 28.5933, lon: 77.2507 },
      { name: "Akshardham Temple",       lat: 28.6127, lon: 77.2773 },
      { name: "Connaught Place",         lat: 28.6315, lon: 77.2167 },
    ],
  },
  mumbai: {
    label: "Mumbai, Maharashtra",
    state: "Maharashtra",
    spots: [
      { name: "Gateway of India",          lat: 18.9220, lon: 72.8347 },
      { name: "Marine Drive",              lat: 18.9438, lon: 72.8231 },
      { name: "Elephanta Caves Jetty",     lat: 18.9633, lon: 72.8450 },
      { name: "Juhu Beach",                lat: 19.0969, lon: 72.8267 },
      { name: "CST Railway Station",       lat: 18.9402, lon: 72.8356 },
      { name: "Haji Ali Dargah",           lat: 18.9825, lon: 72.8090 },
      { name: "Siddhivinayak Temple",      lat: 19.0167, lon: 72.8303 },
      { name: "Dharavi",                   lat: 19.0418, lon: 72.8530 },
    ],
  },
  bangalore: {
    label: "Bengaluru, Karnataka",
    state: "Karnataka",
    spots: [
      { name: "Cubbon Park",         lat: 12.9767, lon: 77.5993 },
      { name: "Lalbagh Gardens",     lat: 12.9507, lon: 77.5848 },
      { name: "Ulsoor Lake",         lat: 12.9833, lon: 77.6266 },
      { name: "MG Road",             lat: 12.9750, lon: 77.6070 },
      { name: "Vidhana Soudha",      lat: 12.9795, lon: 77.5909 },
      { name: "Tipu Sultan's Fort",  lat: 12.9607, lon: 77.5714 },
      { name: "Wonderla",            lat: 12.8231, lon: 77.4274 },
      { name: "Bannerghatta Zoo",    lat: 12.8004, lon: 77.5765 },
    ],
  },
  goa: {
    label: "Goa",
    state: "Goa",
    spots: [
      { name: "Calangute Beach",   lat: 15.5440, lon: 73.7553 },
      { name: "Baga Beach",        lat: 15.5551, lon: 73.7517 },
      { name: "Chapora Fort",      lat: 15.6031, lon: 73.7390 },
      { name: "Anjuna Beach",      lat: 15.5748, lon: 73.7403 },
      { name: "Old Goa Basilica",  lat: 15.5009, lon: 73.9115 },
      { name: "Palolem Beach",     lat: 15.0100, lon: 74.0230 },
      { name: "Dudhsagar Falls",   lat: 15.3141, lon: 74.3140 },
      { name: "Vagator Beach",     lat: 15.5939, lon: 73.7436 },
    ],
  },
};

// ─── Incident templates per spot ─────────────────────────────────────────────

const INCIDENT_TEMPLATES = [
  { incidentType: "theft",      description: "Tourist reported phone snatched near entrance" },
  { incidentType: "suspicious", description: "Suspicious individual loitering around tourist group" },
  { incidentType: "accident",   description: "Minor slip and fall reported on uneven terrain" },
  { incidentType: "theft",      description: "Pickpocket reported in crowded area" },
  { incidentType: "lost",       description: "Tourist separated from group and reported lost" },
  { incidentType: "suspicious", description: "Unlicensed guides aggressively approaching tourists" },
  { incidentType: "other",      description: "Tourist confronted by aggressive street vendors" },
  { incidentType: "accident",   description: "Vehicle near-miss reported at crossing near attraction" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const jitter = (val, range = 0.003) => val + (Math.random() - 0.5) * 2 * range;

const buildHash = ({ deviceId, location, description, incidentType, createdAt, previousHash }) => {
  const payload = JSON.stringify({ deviceId, lat: location.lat, lon: location.lon, description, incidentType, createdAt, previousHash });
  return crypto.createHash("sha256").update(payload).digest("hex");
};

const toRiskLevel = (score) => {
  if (score >= 70) return "high";
  if (score >= 45) return "moderate";
  if (score >= 20) return "low";
  return "safe";
};

// ─── Seeding logic ────────────────────────────────────────────────────────────

async function seedCity(cityKey) {
  const city = CITIES[cityKey];
  if (!city) {
    console.error(`❌ Unknown city "${cityKey}". Available: ${Object.keys(CITIES).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n🌆 Seeding demo data for ${city.label}...`);

  const incidents = [];
  let previousHash = "GENESIS";

  for (const spot of city.spots) {
    // 2–3 incidents per spot
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const template = INCIDENT_TEMPLATES[Math.floor(Math.random() * INCIDENT_TEMPLATES.length)];
      const location = { lat: jitter(spot.lat), lon: jitter(spot.lon) };
      const deviceId = `demo-device-${crypto.randomBytes(4).toString("hex")}`;
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)); // within last week

      const incidentHash = buildHash({
        deviceId,
        location,
        description: template.description,
        incidentType: template.incidentType,
        createdAt,
        previousHash,
      });

      incidents.push({
        deviceId,
        location,
        description: template.description,
        incidentType: template.incidentType,
        previousHash,
        incidentHash,
        createdAt,
        updatedAt: createdAt,
      });

      previousHash = incidentHash;
    }
  }

  // Insert incidents (skip duplicates gracefully)
  let incInserted = 0;
  for (const inc of incidents) {
    try {
      await Incident.create(inc);
      incInserted++;
    } catch (e) {
      if (e.code !== 11000) throw e; // ignore duplicate hash
    }
  }
  console.log(`  ✅ ${incInserted} incidents seeded`);

  // Seed one risk zone per spot
  const riskZones = city.spots.map((spot) => {
    const crimeRate    = parseFloat((0.3 + Math.random() * 0.6).toFixed(3));
    const weatherScore = parseFloat((0.1 + Math.random() * 0.5).toFixed(3));
    const terrainScore = parseFloat((0.1 + Math.random() * 0.5).toFixed(3));
    const timeScore    = parseFloat((Math.random() * 0.8).toFixed(3));
    const tourist_density = parseFloat((0.4 + Math.random() * 0.6).toFixed(3));

    const riskScore = parseFloat(
      (crimeRate * 30 + weatherScore * 25 + terrainScore * 25 + tourist_density * 10 + timeScore * 10).toFixed(2)
    );

    return {
      name: spot.name,
      location: { lat: spot.lat, lon: spot.lon },
      crimeRate,
      weatherScore,
      terrainScore,
      timeScore,
      tourist_density,
      state: city.state,
      description: "city tourism",
      geofenceRadius: 400 + Math.floor(Math.random() * 300),
      riskScore,
      riskLevel: toRiskLevel(riskScore),
    };
  });

  let zoneInserted = 0;
  for (const zone of riskZones) {
    try {
      // Upsert by name+state so re-running doesn't duplicate
      await RiskZone.findOneAndUpdate(
        { name: zone.name, state: zone.state },
        zone,
        { upsert: true, returnDocument: "after" }
      );
      zoneInserted++;
    } catch (e) {
      throw e;
    }
  }
  console.log(`  ✅ ${zoneInserted} risk zones seeded`);

  // Summary by risk level
  const summary = riskZones.reduce((acc, z) => {
    acc[z.riskLevel] = (acc[z.riskLevel] || 0) + 1;
    return acc;
  }, {});
  console.log(`  📊 Risk levels: ${JSON.stringify(summary)}`);
}

async function clearDemoData() {
  console.log("\n🗑️  Clearing all demo data (deviceId starts with 'demo-device-')...");
  const { deletedCount } = await Incident.deleteMany({ deviceId: /^demo-device-/ });
  console.log(`  ✅ Removed ${deletedCount} demo incidents`);
  // Risk zones are upserted so clearing is optional — wipe all for a clean slate
  const rzResult = await RiskZone.deleteMany({});
  console.log(`  ✅ Removed ${rzResult.deletedCount} risk zones`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cityArg = args.includes("--city")
    ? args[args.indexOf("--city") + 1]?.toLowerCase()
    : (process.env.SEED_DEMO_CITY || "jaipur").toLowerCase();
  const shouldClear = args.includes("--clear");

  if (!process.env.MONGO_URL) {
    console.error("❌ MONGO_URL not found in .env — make sure your .env file is in the backend/ folder.");
    process.exit(1);
  }

  console.log("🔗 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected");

  if (shouldClear) {
    await clearDemoData();
  }

  if (!args.includes("--clear") || args.includes("--city")) {
    await seedCity(cityArg);
  }

  await mongoose.disconnect();
  console.log("\n🎉 Done! Your demo data is ready.\n");
}

main().catch((err) => {
  console.error("❌ Seeder failed:", err.message);
  process.exit(1);
});
