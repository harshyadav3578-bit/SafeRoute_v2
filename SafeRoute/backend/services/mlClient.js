const ML_SERVICE_URL = "http://127.0.0.1:8000";

async function predictRouteSafetyWithML(features) {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(features),
    });

    if (!response.ok) {
      throw new Error(`ML service error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error("ML prediction failed");
    }

    return Number(data.predictedSafetyScore);
  } catch (error) {
    console.error("ML client error:", error.message);
    return null;
  }
}

module.exports = {
  predictRouteSafetyWithML,
};