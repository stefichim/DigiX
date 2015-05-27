// app/models/user.js
// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model


var userSchema = mongoose.Schema({

    username: String,
    password: String,
    email : String,
    first_name: String,
    last_name: String,

    flickr : {
        nsid : String,
        token : String,
        token_secret: String
    },
    facebook: {
        token: String,
        token_secret: String
    },
    instagram: {
        access_token: Object
    },
    google :{
        token: String,
        token_secret : String
    },
    photos : [{
        url: String,
        tags : [String]
    }]

});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {

    return bcrypt.compareSync(password, this.password);
};

// create the model for users and expose it to our app
module.exports =mongoose.model('User', userSchema);