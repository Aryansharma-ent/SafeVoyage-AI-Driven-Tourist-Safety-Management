from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

MODEL_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = MODEL_DIR.parent


def resolve_dataset_path():
	candidates = [
		PROJECT_ROOT / "dataset" / "tourist_risk_dataset.csv",
		PROJECT_ROOT / "tourist_risk_dataset.csv",
	]

	for path in candidates:
		if path.exists():
			return path

	raise FileNotFoundError("tourist_risk_dataset.csv not found in expected locations")

# load dataset
dataset_path = resolve_dataset_path()
df = pd.read_csv(dataset_path)

# encode text data
state_encoder = LabelEncoder()
desc_encoder = LabelEncoder()

df["state"] = state_encoder.fit_transform(df["state"])
df["description"] = desc_encoder.fit_transform(df["description"])

# features
X = df.drop("risk_score", axis=1)
y = df["risk_score"]

# train test split
X_train, X_test, y_train, y_test = train_test_split(
X, y, test_size=0.2, random_state=42
)

# model
model = RandomForestRegressor(
n_estimators=100,
random_state=42
)

model.fit(X_train, y_train)

r2_score = model.score(X_test, y_test)

print("Model R2 Score:", r2_score)

# save model artifacts next to this script
joblib.dump(model, MODEL_DIR / "risk_model.pkl")
joblib.dump(state_encoder, MODEL_DIR / "state_encoder.pkl")
joblib.dump(desc_encoder, MODEL_DIR / "desc_encoder.pkl")

print("Model Saved Successfully")