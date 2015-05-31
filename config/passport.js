// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

// load up the user model
var User = require('../app/models/user');

var configAuth = require('./auth');

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var request = require('request');

var api = require('./api');

function getPicasaAlbums(profile_id, token, user, callback) {
    var url = 'https://picasaweb.google.com/data/feed/api/user/' + profile_id + '?alt=json&v=2&access=all&access_token=' + token;

    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var albumsJson = JSON.parse(body);


            getPicasaPhotos(new Array(), 0, albumsJson.feed.entry, profile_id, token, function (photos) {
                for (var i = user.photos.length - 1; i >= 0; i--) {
                    if (user.photos[i].source == 'google') {
                        user.photos.splice(i, 1);
                    }
                }

                for (var i = 0; i < photos.length; i++) {
                    user.photos.push(photos[i]);
                }

                user.google.user_id = profile_id;
                user.google.access_token = token;

                callback(user);
            });
        }
    });
}

function getPicasaPhotos(photos, album_nr, album_array, profile_id, access_token, callback) {
    if (album_nr < album_array.length) {
        var album_url = 'https://picasaweb.google.com/data/feed/api/user/' + profile_id + '/albumid/' + album_array[album_nr]['gphoto$id']['$t'] + '?alt=json&v=2&access_token=' + access_token;
        request(album_url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var photosJson = JSON.parse(body);

                for (var j = 0; j < photosJson.feed.entry.length; j++) {
                    photos.push({
                        url: photosJson.feed.entry[j].content.src,
                        source: 'google'
                    });
                }

                getPicasaPhotos(photos, album_nr + 1, album_array, profile_id, access_token, callback);
            }
        });
    } else {
        callback(photos);
    }
}

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

            // asynchronous
            // User.findOne wont fire unless data is sent back
            process.nextTick(function () {

                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                User.findOne({'local.username': username}, function (err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);

                    // check to see if theres already a user with that email
                    if (user) {
                        return done(null, false, req.flash('message', 'That username is already taken.'));
                    } else {

                        // if there is no user with that email
                        // create the user
                        var newUser            = new User();

                        newUser.username = username;
                        newUser.password = newUser.generateHash(password);
                        newUser.email = req.body.email;
                        newUser.first_name = req.body.first_name;
                        newUser.last_name = req.body.last_name;
                        newUser.current_picture_index = '0';
                        // set the user's local credentials
                        /* newUser.local.username   = username;
                         newUser.local.password   = newUser.generateHash(password);
                         newUser.local.email      = req.body.email;
                         newUser.local.first_name = req.body.first_name;
                         newUser.local.last_name  = req.body.last_name;*/

                        // save the user
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
            clientID        : configAuth.facebookAuth.clientID,
            clientSecret    : configAuth.facebookAuth.clientSecret,
            callbackURL     : configAuth.facebookAuth.callbackURL,
            profileFields   : ['id'],
            passReqToCallback: true
        },
        function(req, token, refreshToken, profile, done) {
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
                                getPicasaAlbums(profile.id, token, user, function (user) {
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
                });

            }));
};