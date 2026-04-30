import os
import joblib
import numpy as np
import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
DB_NAME = os.getenv("DB_NAME", "saferoute")

MODEL_PATH = "model.pkl"
FEATURES_PATH = "feature_columns.pkl"


def bootstrap_score(row):
    """
    Bootstrap label generator for initial training
    until enough real route logs are available.
    """
    score = 100

    score -= row["crimeHits"] * 4.5
    score -= row["accidentHits"] * 5.0
    score -= row["incidentHits"] * 6.0
    score -= row["distanceKm"] * 0.4
    score -= row["durationMin"] * 0.35
    score -= row["temporalPenalty"] * 1.2
    score -= row["routeComplexityPenalty"] * 1.5

    score = max(0, min(100, score))
    return score


def build_synthetic_dataset():
    rows = []

    for crime_hits in range(0, 8):
        for accident_hits in range(0, 8):
            for incident_hits in range(0, 8):
                for duration in [10, 20, 30, 40, 50]:
                    for distance in [3, 6, 10, 15, 20]:
                        temporal_penalty = 0 if duration < 30 else 5
                        route_complexity_penalty = 0
                        if distance > 15:
                            route_complexity_penalty += 3
                        if duration > 35:
                            route_complexity_penalty += 3

                        row = {
                            "crimeHits": crime_hits,
                            "accidentHits": accident_hits,
                            "incidentHits": incident_hits,
                            "distanceKm": distance,
                            "durationMin": duration,
                            "temporalPenalty": temporal_penalty,
                            "routeComplexityPenalty": route_complexity_penalty,
                        }
                        row["targetScore"] = bootstrap_score(row)
                        rows.append(row)

    return pd.DataFrame(rows)


def load_route_logs_dataset():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    route_logs = list(db["routelogs"].find({}))

    rows = []

    for log in route_logs:
        for route in log.get("routes", []):
            row = {
                "crimeHits": route.get("crimeHits", 0),
                "accidentHits": route.get("accidentHits", 0),
                "incidentHits": route.get("incidentHits", 0),
                "distanceKm": float(route.get("distanceKm", 0)),
                "durationMin": float(route.get("durationMin", 0)),
                "temporalPenalty": route.get("temporalPenalty", 0),
                "routeComplexityPenalty": route.get("routeComplexityPenalty", 0),
                "targetScore": float(route.get("safetyScore", 0)),
            }
            rows.append(row)

    client.close()

    if not rows:
        return pd.DataFrame()

    return pd.DataFrame(rows)


def main():
    log_df = load_route_logs_dataset()

    if len(log_df) < 20:
        print("Not enough real route logs. Using synthetic bootstrap dataset.")
        df = build_synthetic_dataset()
    else:
        print(f"Using {len(log_df)} real route rows from MongoDB.")
        df = log_df.copy()

    feature_columns = [
        "crimeHits",
        "accidentHits",
        "incidentHits",
        "distanceKm",
        "durationMin",
        "temporalPenalty",
        "routeComplexityPenalty",
    ]

    X = df[feature_columns]
    y = df["targetScore"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=10,
        random_state=42
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)

    print(f"Training complete. MAE: {mae:.3f}")

    joblib.dump(model, MODEL_PATH)
    joblib.dump(feature_columns, FEATURES_PATH)

    print(f"Saved model to {MODEL_PATH}")
    print(f"Saved feature columns to {FEATURES_PATH}")


if __name__ == "__main__":
    main()