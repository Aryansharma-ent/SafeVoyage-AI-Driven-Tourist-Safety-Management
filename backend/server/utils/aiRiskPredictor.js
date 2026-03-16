import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_BIN = process.env.PYTHON_BIN || "python";
const PREDICT_SCRIPT_PATH = path.resolve(__dirname, "../../../model/predict.py");
const PREDICTION_TIMEOUT_MS = 20000;

// ─── JS Statistical Fallback (used when Python model is unavailable) ─────────

const fetchWithTimeout = async (url, timeoutMs = 4000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
};

const getWeatherRisk = async (lat, lon) => {
  const data = await fetchWithTimeout(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
  );
  const code = data?.current_weather?.weathercode;
  if (code == null) return 0.5;
  if ([0, 1, 2, 3].includes(code)) return 0.2;
  if ([45, 48, 51, 52, 53, 54, 55, 56, 57].includes(code)) return 0.5;
  if ([61, 62, 63, 64, 65, 66, 67, 80, 81, 82, 95, 96, 97, 98, 99].includes(code)) return 0.8;
  if ([71, 72, 73, 74, 75, 77, 85, 86].includes(code)) return 0.7;
  return 0.5;
};

const getTerrainDifficulty = async (lat, lon) => {
  const data = await fetchWithTimeout(
    `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`
  );
  const elevation = data?.results?.[0]?.elevation;
  if (elevation == null) return 0.5;
  return Math.min(Math.max(elevation / 3000, 0), 1);
};

const getTimeOfDay = () => {
  const hour = new Date().getUTCHours();
  return hour >= 18 || hour < 6 ? 1 : 0;
};

const riskLevelFromScore = (score) => {
  if (score < 35) return "safe";
  if (score < 55) return "low";
  if (score < 75) return "moderate";
  return "high";
};

const statisticalFallback = async ({ crimeRate, touristDensity, location }) => {
  const [weather_risk, terrain_difficulty] = await Promise.all([
    getWeatherRisk(location.lat, location.lon),
    getTerrainDifficulty(location.lat, location.lon),
  ]);
  const time_of_day = getTimeOfDay();

  const score = Math.min(
    Math.max(
      crimeRate * 40 +
      weather_risk * 25 +
      terrain_difficulty * 20 +
      touristDensity * 10 +
      time_of_day * 5,
      0
    ),
    100
  );

  const risk_score = parseFloat(score.toFixed(2));
  return {
    risk_score,
    risk_score_normalized: parseFloat((risk_score / 100).toFixed(4)),
    risk_level: riskLevelFromScore(risk_score),
    source: "statistical_fallback",
    feature_snapshot: {
      crime_rate: crimeRate,
      weather_risk,
      terrain_difficulty,
      tourist_density: touristDensity,
      time_of_day,
    },
  };
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const runPredictionProcess = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: path.resolve(__dirname, "../../.."),
      env: process.env,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    const timeoutId = setTimeout(() => {
      child.kill();
      reject(new Error("Model prediction timed out"));
    }, PREDICTION_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        reject(new Error(stderr || stdout || `Prediction process exited with code ${code}`));
        return;
      }

      resolve(stdout.trim());
    });
  });

export const predictRiskWithModel = ({ state, description, crimeRate, location, touristDensity }) =>
  new Promise((resolve, reject) => {
    const safeCrimeRate = clamp(Number(crimeRate), 0, 1);
    const safeTouristDensity = clamp(Number(touristDensity), 0, 1);

    const scriptArgs = [
      PREDICT_SCRIPT_PATH,
      String(state),
      String(description),
      String(safeCrimeRate),
      String(location.lat),
      String(location.lon),
      String(safeTouristDensity),
    ];

    const runners = [
      () => runPredictionProcess(PYTHON_BIN, scriptArgs),
      () => runPredictionProcess("py", ["-3", ...scriptArgs]),
    ];

    const tryRunner = async (index) => {
      if (index >= runners.length) {
        // Python unavailable — use JS statistical fallback so zone upsert still works
        try {
          const fallback = await statisticalFallback({
            crimeRate: safeCrimeRate,
            touristDensity: safeTouristDensity,
            location,
          });
          resolve(fallback);
        } catch (fallbackError) {
          reject(fallbackError);
        }
        return;
      }

      try {
        const output = await runners[index]();
        const parsed = JSON.parse(output);

        if (parsed.error) {
          reject(new Error(parsed.error));
          return;
        }

        resolve(parsed);
      } catch (error) {
        tryRunner(index + 1);
      }
    };

    tryRunner(0);
  });
