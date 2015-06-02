// config/passport.js

// load all the things we need
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var FlickrStrategy = require('passport-flickr').Strategy;
var privateInfo = require('../app/models/private');

// load up the user model
var User = require('../app/models/user');

var configAuth = require('./auth');

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var request = require('request');

var api = require('./api');

// expose this function to our app using module.exports
module.exports = function (passport) {
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

    passport.use('signup', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, username, password, done) {

            process.nextTick(function () {

                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                User.findOne({'username': username}, function (err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);

                    // check to see if theres already a user with that email
                    if (user) {
                        return done(null, false, req.flash('message', 'That username is already taken.'));
                    } else {

                        // if there is no user with that email
                        // create the user
                        var newUser = new User();

                        console.log(req.body.gender);

                        newUser.username = username;
                        newUser.password = newUser.generateHash(password);
                        newUser.email = req.body.email;
                        newUser.first_name = req.body.first_name;
                        newUser.last_name = req.body.last_name;
                        newUser.current_picture_index = '0';
                        newUser.tree.push({
                            'myID': '0',
                            'mother': "",
                            'father': "",
                            'name': username,
                            'genre': req.body.gender
                        });
                        newUser.save(function (err) {
                            if (err)
                                throw err;
                            return done(null, newUser);
                        });
                    }

                });

            });

        }));

    passport.use('login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, username, password, done) { // callback with email and password from our form

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            User.findOne({'username': username}, function (err, user) {
                // if there are any errors, return the error before anything else
                if (err)
                    return done(err);

                // if no user is found, return the message
                if (!user)
                    return done(null, false, req.flash('message', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

                // if the user is found but the password is wrong
                if (!user.validPassword(password))
                    return done(null, false, req.flash('message', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

                // all is well, return successful user
                user.current_picture_index = '0';
                user.save(function (err) {
                    if (err) {
                        console.dir(err);
                    }
                });
                return done(null, user);
            });

        }));

    /* Facebook */
    passport.use('facebook', new FacebookStrategy({
            clientID: configAuth.facebookAuth.clientID,
            clientSecret: configAuth.facebookAuth.clientSecret,
            callbackURL: configAuth.facebookAuth.callbackURL,
            profileFields: ['id'],
            passReqToCallback: true
        },
        function (req, token, refreshToken, profile, done) {
            // make the code asynchronous

            process.nextTick(function () {

                // try to find the user based on their google id
                User.findOne({'_id': req.user._id}, function (err, user) {
                        if (err)
                            return done(err);

                        if (user) {
                            api.getFacebookAlbum(profile.id, token, user, function (user) {
                                user.save(function (err) {
                                    if (err)
                                        throw  err;

                                    console.log(user);

                                    return done(null, user);
                                })

                            })

                        }
                    }
                )
                ;
            })
        }));

    passport.use('flickr', new FlickrStrategy({
            consumerKey: privateInfo.flickr.consumer_key,
            consumerSecret: privateInfo.flickr.consumer_secret,
            callbackURL: 'http://localhost:2080/flickr/code',
            passReqToCallback: true
        },
        function (req, token, tokenSecret, profile, done) {
            console.log("passport");
            console.log(profile);
            process.nextTick(function () {

                console.log("passport");
                console.log(profile);
                // try to find the user based on their google id
                User.findOne({'_id': req.user._id}, function (err, user) {
                        if (err)
                            return done(err);
                        if (user) {
                            user.flickr.nsid = profile.id;
                            user.flickr.token = token;
                            user.flickr.token_secret = tokenSecret;
                            user.save(function (err) {
                                if (err) throw err;
                                return api.getFlickrPhotos(user.username, function () {
                                    return done(null, user);
                                })
                            })
                        }
                    }
                );
            })
        }
    ));

    passport.use('google', new GoogleStrategy({

            clientID: '152182259153-13oi5urbb2p7rsg68e5ug5irrqsr161k.apps.googleusercontent.com',
            clientSecret: 'n0lqjSHG8slVc9swmNq3tkHa',
            callbackURL: 'http://localhost:2080/auth/google/callback',
            passReqToCallback: true
        },
        function (req, token, refreshToken, profile, done) {

            // make the code asynchronous

            process.nextTick(function () {

                // try to find the user based on their google id
                User.findOne({'_id': req.user._id}, function (err, user) {
                        if (err)
                            return done(err);

                        if (user) {
                            api.getPicasaAlbums(profile.id, token, user, function (user) {
                                user.save(function (err) {
                                    if (err)
                                        throw  err;

                                    return done(null, user);
                                })

                            })

                        }
                    }
                )
                ;
            });

        }));
};