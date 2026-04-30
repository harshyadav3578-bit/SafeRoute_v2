const mongoose = require('mongoose');




const policeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
  },
  {
    collection: 'police',
  }
);

module.exports = mongoose.models.Police || mongoose.model('Police', policeSchema);
