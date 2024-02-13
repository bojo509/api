// a model for the liked collection in the database
const mongoose = require('mongoose');
//creating mongodb definitions for the liked
const LikedSchema = new mongoose.Schema({
    //place id with reference to the place model
    place:{type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Place'},
    user:{type: mongoose.Schema.Types.ObjectId, required: true},
});

//exports the model by creating a class for the collection
const LikedModel = mongoose.model('Liked', LikedSchema);

module.exports = LikedModel;