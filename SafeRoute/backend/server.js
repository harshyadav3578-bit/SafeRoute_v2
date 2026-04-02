const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const policeRoutes = require('./routes/police');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect('mongodb://127.0.0.1:27017/saferoute')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.json({ message: 'SafeRoute backend is running' });
});

app.use('/api/police', policeRoutes);
app.use('/api/auth', authRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
