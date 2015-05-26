// app/models/user.js
// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model

var privateSchema= {
    flickr: {
        consumer_key : '3df130b07fe77f78ba318d87fe192c00',
        consumer_secret: '1d3e72bacff0745c'
    }
};


var userSchema = mongoose.Schema({

    username: String,
    password: String,
    email : String,
    first_name: String,
    last_name: String,

    flickr : {
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

    /*local            : {
        username     : String,
        password     : String,
        email        : String,
        first_name   : String,
        last_name    : String
    },
    facebook         : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    },
    twitter          : {
        id           : String,
        token        : String,
        displayName  : String,
        username     : String
    },
    google           : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    }
    , flickr : {
        username: String,
        token: String,
        token_secret: String
    }*/

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