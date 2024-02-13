//here will be the mongodb definitions
const mongoose = require('mongoose');
const {Schema} = mongoose;

const UserSchema = new Schema({
    // defining the types
    name: String,
    username: String,
    phone: String,
    email: {type:String, unique:true},
    password: String,
});

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;
