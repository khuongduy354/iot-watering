import mongoose from 'mongoose';

const soilMoistureSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now(),
    required: true
  },
  rawValue: {
    type: Number,
    required: true
  },
  moisturePercentage: {
    type: Number,
    required: true
  }
});

const SoilMoisture = mongoose.models.SoilMoisture || mongoose.model('SoilMoisture', soilMoistureSchema);

export default SoilMoisture;