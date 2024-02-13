const mongoose = require('mongoose');
//creating mongodb definitions for the booking
const bookingSchema = new mongoose.Schema({
    //place id with reference to the place model
    place:{type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Place'},
    user:{type: mongoose.Schema.Types.ObjectId, required: true},
    numberOfGuests: {type: Number, required: true},
    checkIn: {type: Date, required: true},
    checkOut: {type: Date, required: true},
    name: {type: String, required: true},
    mobile: {type: String, required: true},
    price: {type: Number, required: true},
});

//exports the model by creating a class for the collection
const BookingModel = mongoose.model('Booking', bookingSchema);

module.exports = BookingModel;