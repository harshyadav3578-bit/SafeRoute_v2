const express = require('express');
const Police = require('../models/Police');

const router = express.Router();

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.get('/', async (req, res) => {
  try {
    const data = await Police.find().lean();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Could not fetch police stations.' });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, limit } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng are required.' });
    }

    const sourceLat = Number(lat);
    const sourceLng = Number(lng);
    const maxResults = Number(limit) > 0 ? Number(limit) : 5;

    if (Number.isNaN(sourceLat) || Number.isNaN(sourceLng)) {
      return res.status(400).json({ message: 'lat and lng must be valid numbers.' });
    }

    const stations = await Police.find().lean();

    const nearbyStations = stations
      .filter((station) => typeof station.lat === 'number' && typeof station.lng === 'number')
      .map((station) => ({
        ...station,
        distance: haversineDistance(sourceLat, sourceLng, station.lat, station.lng),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults);

    res.json(nearbyStations);
  } catch (error) {
    console.error('Nearby police error:', error);
    res.status(500).json({ message: 'Could not fetch nearby police stations.' });
  }
});

module.exports = router;
