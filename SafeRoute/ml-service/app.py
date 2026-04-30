import joblib
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

MODEL_PATH = "model.pkl"
FEATURES_PATH = "feature_columns.pkl"

app = FastAPI(title="SafeRoute ML Service")

model = joblib.load(MODEL_PATH)
feature_columns = joblib.load(FEATURES_PATH)


class RouteFeatures(BaseModel):
    crimeHits: float
    accidentHits: float
    incidentHits: float
    distanceKm: float
    durationMin: float
    temporalPenalty: float
    routeComplexityPenalty: float


@app.get("/")
def root():
    return {"message": "SafeRoute ML service running"}


@app.post("/predict")
def predict(features: RouteFeatures):
    input_row = [
        features.crimeHits,
        features.accidentHits,
        features.incidentHits,
        features.distanceKm,
        features.durationMin,
        features.temporalPenalty,
        features.routeComplexityPenalty,
    ]

    prediction = model.predict([input_row])[0]
    prediction = float(max(0, min(100, prediction)))

    return {
        "success": True,
        "predictedSafetyScore": round(prediction, 2)
    }