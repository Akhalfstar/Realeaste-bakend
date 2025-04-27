// models/Property.js
import mongoose from "mongoose";


const PropertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  location: {
    // For geospatial queries
    type: {
      type: String,
      enum: ['Point'],
      default : 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required : true,
    },
  },
  price: {
    type: Number,
    required: true,
  },
  propertyType: {
    type: String,
    enum: ['house', 'apartment',  'commercial'],
    required: true,
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'rented', 'pending'],
    default: 'available',
  },
  bedrooms: {
    type: Number,
    default: 0,
  },
  bathrooms: {
    type: Number,
    default: 0,
  },
  area: {
    type: Number, // In square feet or meters
  },
  images: [{
    public_id: String,
    url: String
  }],
  features: [
    {
      type: String,
    },
  ],
  amenities: [
    {
      name : String,
      distance : Number,
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
});

PropertySchema.index({ location: '2dsphere' }); // For geospatial queries



export const Property = mongoose.model('property', PropertySchema);