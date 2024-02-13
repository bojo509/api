//creating mongodb definitions for the places
const mongoose = require('mongoose');
//schema of the collection of the places
const placeSchema = new mongoose.Schema({
    //owner of a place with reference to the user model
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    title: String,
    address: String,
    photos: [String],
    description: String,
    perks: [String],
    // To make them links that provide information about them
    localLandmarks: String,
    extraInfo: String,
    checkIn: String,
    checkOut: String,
    maxGuests: Number,
    price: Number,
});

const PlaceModel = mongoose.model('Place', placeSchema);
//exports the model for the collection
module.exports = PlaceModel;