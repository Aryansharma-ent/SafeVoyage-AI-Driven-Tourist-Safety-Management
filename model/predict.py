import json
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import requests

MODEL_DIR = Path(__file__).resolve().parent
MODEL_PATH = MODEL_DIR / "risk_model.pkl"
STATE_ENCODER_PATH = MODEL_DIR / "state_encoder.pkl"
DESC_ENCODER_PATH = MODEL_DIR / "desc_encoder.pkl"

model = joblib.load(MODEL_PATH)
state_encoder = joblib.load(STATE_ENCODER_PATH)
desc_encoder = joblib.load(DESC_ENCODER_PATH)


def clamp(value, min_value, max_value):
    return max(min_value, min(value, max_value))


def encode_or_fallback(encoder, value):
    classes = set(encoder.classes_)
    if value in classes:
        return int(encoder.transform([value])[0]), False

    fallback_value = encoder.classes_[0]
    return int(encoder.transform([fallback_value])[0]), True


def map_weathercode_to_risk(weathercode):
    if weathercode in [0, 1, 2, 3]:
        return 0.2
    if weathercode in [45, 48, 51, 52, 53, 54, 55, 56, 57]:
        return 0.5
    if weathercode in [61, 62, 63, 64, 65, 66, 67, 80, 81, 82, 95, 96, 97, 98, 99]:
        return 0.8
    if weathercode in [71, 72, 73, 74, 75, 77, 85, 86]:
        return 0.7
    return 0.5


def get_elevation(lat, lon):
    try:
        url = f"https://api.open-elevation.com/api/v1/lookup?locations={lat},{lon}"
        response = requests.get(url, timeout=4)
        if response.status_code != 200:
            return 0.5

        data = response.json()
        elevation = data.get("results", [{}])[0].get("elevation")
        if elevation is None:
            return 0.5

        return clamp(float(elevation) / 3000.0, 0.0, 1.0)
    except Exception:
        return 0.5


def get_weather_risk(lat, lon):
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        response = requests.get(url, timeout=4)
        if response.status_code != 200:
            return 0.5

        data = response.json()
        weathercode = data.get("current_weather", {}).get("weathercode")
        if weathercode is None:
            return 0.5

        return map_weathercode_to_risk(weathercode)
    except Exception:
        return 0.5


def get_time_of_day():
    hour = datetime.utcnow().hour
    return 1 if hour >= 18 or hour < 6 else 0


def risk_level_from_score(score):
    if score < 35:
        return "safe"
    if score < 55:
        return "low"
    if score < 75:
        return "moderate"
    return "high"


def predict_risk(state, description, crime_rate, lat, lon, tourist_density):
    state_encoded, state_fallback = encode_or_fallback(state_encoder, state)
    description_encoded, description_fallback = encode_or_fallback(desc_encoder, description)

    crime_rate = clamp(float(crime_rate), 0.0, 1.0)
    tourist_density = clamp(float(tourist_density), 0.0, 1.0)
    terrain_difficulty = get_elevation(lat, lon)
    weather_risk = get_weather_risk(lat, lon)
    time_of_day = get_time_of_day()

    features = np.array(
        [[
            state_encoded,
            description_encoded,
            crime_rate,
            weather_risk,
            terrain_difficulty,
            tourist_density,
            time_of_day,
        ]]
    )

    risk_score = float(model.predict(features)[0])
    risk_score = clamp(risk_score, 0.0, 100.0)
    risk_level = risk_level_from_score(risk_score)

    return {
        "risk_score": round(risk_score, 2),
        "risk_score_normalized": round(risk_score / 100.0, 4),
        "risk_level": risk_level,
        "feature_snapshot": {
            "state_fallback_used": state_fallback,
            "description_fallback_used": description_fallback,
            "crime_rate": round(crime_rate, 4),
            "weather_risk": round(weather_risk, 4),
            "terrain_difficulty": round(terrain_difficulty, 4),
            "tourist_density": round(tourist_density, 4),
            "time_of_day": int(time_of_day),
        },
    }


if __name__ == "__main__":
    if len(sys.argv) != 7:
        print(json.dumps({"error": "Invalid arguments"}))
        sys.exit(1)

    try:
        state = sys.argv[1]
        description = sys.argv[2]
        crime_rate = float(sys.argv[3])
        lat = float(sys.argv[4])
        lon = float(sys.argv[5])
        tourist_density = float(sys.argv[6])

        result = predict_risk(state, description, crime_rate, lat, lon, tourist_density)
        print(json.dumps(result))
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)