import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_BIN = process.env.PYTHON_BIN || "python";
const PREDICT_SCRIPT_PATH = path.resolve(__dirname, "../../../model/predict.py");
const PREDICTION_TIMEOUT_MS = 20000;

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
        reject(new Error("Unable to run Python prediction process"));
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
        if (index === runners.length - 1) {
          reject(error);
          return;
        }

        tryRunner(index + 1);
      }
    };

    tryRunner(0);
  });
