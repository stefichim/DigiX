// app/routes.js
var request = require('../node_modules/request/index.js');
// load up the user model
var mongoose = require('mongoose');
var User = require('../app/models/user');
var async = require('../node_modules/async');
var privateInfo = require('../app/models/private');
var qs = require('querystring');
var api = require('../config/api');
var treeF = require('../config/treeFunctions');

module.exports = function (app, passport) {
    app.get('/', function (req, res) {
        res.render('index.ejs', {message: req.flash("message")});
    });

    app.post('/signup', passport.authenticate('signup', {
        successRedirect: '/profile',
        failureRedirect: '/',
        failureFlash: true
    }));

    app.post('/login', passport.authenticate('login', {
        successRedirect: '/profile',
        failureRedirect: '/',
        failureFlash: true
    }));

    app.get('/tree', isLoggedIn, function (req, res) {
        User.findOne({'username': req.user.username}, function (err, user) {
            if (err) console.log(err);
            else {
                res.render('tree', {
                    user: user
                });
            }
        });
    });

    app.get('/refresh', isLoggedIn, function (req, res) {
        User.findOne({'username': req.user.username}, function (err, user) {
            if (err) console.log(err);
            else {
                api.unsyncFacebookPhotos(user, 1, function (user) {
                    user.save(function (err) {
                        if (err)
                            throw  err;
                        api.syncFacebookPhotos(user, function (user) {
                            user.save(function (err) {
                                if (err) {
                                    res.redirect('logout');
                                    throw  err;
                                }

                                refreshInstagramPhotos(req, res, user, function (user) {
                                    api.getPicasaAlbums(user.google.user_id, user.google.access_token, user, function (user) {
                                        res.redirect('profile');
                                    });
                                })
                            });
                        });
                    })
                });


            }
        });
    });

    app.get('/profile', isLoggedIn, function (req, res) {
        User.findOne({'username': req.user.username}, function (err, user) {
            if (err) console.log(err);
            else {
                var my_pictures = [];
                var previousButtonVisible = 'visible';
                var nextButtonVisible = 'visible';

                var i;
                console.log(user.current_picture_index);
                console.log(parseInt(user.current_picture_index));
                for (i = parseInt(user.current_picture_index); i < user.photos.length && i < (parseInt(user.current_picture_index) + privateInfo.profile.numberOfPicturesPage); i++) {
                    my_pictures.push(user.photos[i].url);
                }

                //user.current_picture_index = parseInt(user.current_picture_index) + my_pictures.length;
                //user.save(function (err) {
                //    if (err) {
                //        console.dir(err);
                //    }
                //});

                if (parseInt(user.current_picture_index) < privateInfo.profile.numberOfPicturesPage) {
                    previousButtonVisible = 'invisible';
                }
                if (parseInt(user.current_picture_index) + privateInfo.profile.numberOfPicturesPage > (user.photos.length - 1)) {
                    nextButtonVisible = 'invisible';
                }

                res.render('profile', {
                    user: user,
                    photos: my_pictures,
                    previousButtonVisible: previousButtonVisible,
                    nextButtonVisible: nextButtonVisible
                });
            }
        });
    });

    app.get('/profile/next', isLoggedIn, function (req, res) {
        User.findOne({'username': req.user.username}, function (err, user) {
            user.current_picture_index = parseInt(user.current_picture_index) + privateInfo.profile.numberOfPicturesPage;
            user.save(function (err) {
                if (err) {
                    console.dir(err);
                }
            });
            res.redirect('/profile');
        });
    });

    app.get('/profile/previous', isLoggedIn, function (req, res) {
        User.findOne({'username': req.user.username}, function (err, user) {

            user.current_picture_index = parseInt(user.current_picture_index) - privateInfo.profile.numberOfPicturesPage;
            user.save(function (err) {
                if (err) {
                    console.dir(err);
                }
            });
            res.redirect('/profile');

        });
    });

    app.get('/profile/button', isLoggedIn, function (req, res) {
        User.findOne({'username': req.user.username}, function (err, user) {
            user.current_picture_index = 0;
            user.save(function (err) {
                if (err) {
                    console.dir(err);
                }
            });
            res.redirect('/profile');
        });
    });

    app.get('/search_photos_button', isLoggedIn, function (req, res) {
        User.findOne({'username': req.user.username}, function (err, user) {
            user.current_picture_search_index = 0;
            user.searched_photos.length = 0;

            var queryString = req.query.searched_text;
            if (queryString.length == 0) {
                user.current_picture_index = 0;
                user.save(function (err) {
                    if (err) {
                        console.dir(err);
                    }
                });
                res.redirect('/profile');
            }
            else {
                //var words = queryString.toLowerCase().split(" ");
                var words = api.splitTextInTags(queryString);

                var i;
                for (i = 0; i < user.photos.length; i++) {

                    var photoTags = [];
                    photoTags.push.apply(photoTags, user.photos[i].tags.description);
                    for (var j = 0; j < user.photos[i].tags.comments.length; j++) {
                        photoTags.push.apply(photoTags, user.photos[i].tags.comments[j].author);
                        photoTags.push.apply(photoTags, user.photos[i].tags.comments[j].content);
                    }
                    photoTags.push.apply(photoTags, user.photos[i].tags.likes);
                    photoTags.push.apply(photoTags, user.photos[i].tags.tagged);

                    photoTags = photoTags.filter(function (value, index, self) {
                        return self.indexOf(value) === index;
                    });

                    var tagsScore = 0;
                    for (var j = 0; j < words.length; j++) {
                        for (var k = 0; k < photoTags.length; k++) {
                            if (photoTags[k].indexOf(words[j]) > -1) {
                                tagsScore++;
                            }
                        }
                    }

                    var photo = {
                        url: user.photos[i].url,
                        score: tagsScore
                    }

                    user.searched_photos.push(photo);
                }

                user.searched_photos.sort(function (a, b) {
                    return parseFloat(b.score) - parseFloat(a.score)
                });

                var maxScore = 0;
                if (user.searched_photos.length) {
                    maxScore = user.searched_photos[0].score;
                }

                for (var i = 0; i < user.searched_photos.length; i++) {
                    if (user.searched_photos[i].score < maxScore / 2) {
                        user.searched_photos.splice(i, 1);
                        i--;
                    }
                }

                user.save(function (err) {
                    if (err) {
                        console.dir(err);
                    }
                });
                res.redirect('/search_photos');
            }
        });
    });

    app.get('/search_photos', isLoggedIn, function (req, res) {
        User.findOne({'username': req.user.username}, function (err, user) {
            var my_pictures = [];
            var previousButtonVisible = 'visible';
            var nextButtonVisible = 'visible';

            var i;
            for (i = parseInt(user.current_picture_search_index); i < user.searched_photos.length && i < (parseInt(user.current_picture_search_index) + privateInfo.profile.numberOfPicturesPage); i++) {
                my_pictures.push(user.searched_photos[i].url);
            }



            if (parseInt(user.current_picture_search_index) < privateInfo.profile.numberOfPicturesPage) {
                previousButtonVisible = 'invisible';
            }
            if (parseInt(user.current_picture_search_index) + privateInfo.profile.numberOfPicturesPage > (user.searched_photos.length - 1)) {
                nextButtonVisible = 'invisible';
            }

            res.render('search_photos', {
                user: user,
                photos: my_pictures,
                previousButtonVisible: previousButtonVisible,
                nextButtonVisible: nextButtonVisible
            });
        });
    });

    app.get('/search_photos/next', isLoggedIn, function (req, res) {
        User.findOne({'username': req.user.username}, function (err, user) {
            user.current_picture_search_index = parseInt(user.current_picture_search_index) + privateInfo.profile.numberOfPicturesPage;
            user.save(function (err) {
                if (err) {
                    console.dir(err);
                }
            });
            res.redirect('/search_photos');
        });
    });

    app.get('/search_photos/previous', isLoggedIn, function (req, res) {
        User.findOne({'username': req.user.username}, function (err, user) {


            user.current_picture_search_index = parseInt(user.current_picture_search_index) - privateInfo.profile.numberOfPicturesPage;
            user.save(function (err) {
                if (err) {
                    console.dir(err);
                }
            });
            res.redirect('/profile');
        });
    });

    //----------------------------------------------------------
    //----------------------------------------------------------
    // PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA
    //----------------------------------------------------------
    //----------------------------------------------------------


    app.get('/arbore', isLoggedIn, function (req, res) {
        res.render('arbore.ejs', {});
    });


    app.post('/ajax', isLoggedIn, function (req, res) {
        var node = req.body.node;
        User.findOne({'username': req.user.username}, function (err, user) {
            updateTree(user, node);
        });

    });

    app.get('/get/root', isLoggedIn, function (req, res) {
        console.log("AJAX");
        var tree = req.user.tree;
        var root;
        for (i = 0; i < tree.length; i++) {
            if (tree[i].myID == "root") root = tree[i];
        }
        console.log(root);
        res.send(root);
    });

    app.get('/get/parents', isLoggedIn, function (req, res) {
        var myID = req.query.myID;
        var parents = {
            mother: String,
            father: String
        }
        var tree = req.user.tree;
        for (i = 0; i < tree.length; i++) {
            if (tree[i].myID == myID) {
                parents.mother = tree[i].mother;
                parents.father = tree[i].father;
                res.send(parents);
            }
        }
        res.send(parents);
    });

    app.get('/get/children', isLoggedIn, function (req, res) {
        var tree = req.user.tree;
        var myID = req.query.myID;
        var children = {
            boys: [String],
            girl: [String]
        }
        for (i = 0; i < tree.length; i++) {
            if (tree[i].mother == myID || tree[i].father == myID) {
                if (tree[i].genre == "male") children.boys.push(tree[i].myID);
                else children.girl.push(tree[i].myID);
            }
        }
        res.send(children);
    });



    function updateTree(user, node, res) {
        var found = false;
        for (i = 0; i < user.tree.length; i++) {
            if (found == true) return;
            if (user.tree[i].myID = node.fromID) {
                var newNode = {
                    myID: node.myID,
                    name: node.name,
                    mother: "",
                    father: "",
                    genre: ""
                }
                if (node.type == "mother") {
                    user.tree[i].mother = node.myID;
                    newNode.genre = "female";
                    user.tree.push(newNode);
                    found = true;
                }
                else if (node.type == "father") {
                    user.tree[i].father = node.myID;
                    newNode.genre = "male";
                    user.tree.push(newNode);
                    found = true;
                }
                else if (node.type == "girl") {
                    newNode.mother = node.fromID;
                    newNode.genre = "female";
                    user.tree.push(newNode);
                    found = true;
                }
                else if (node.type == "boy") {
                    newNode.father = node.fromID;
                    newNode.genre = "male";
                    user.tree.push(newNode);
                    found = true;
                }

            }
            if (found == true) {
                user.save(function (err) {
                    if (err) console.dir(err);

                })
            }
        }

    }

    app.get('/unsync/Flickr', isLoggedIn, function (req, res) {
        console.log("unsync");
        User.findOne({username: req.user.username}, function (err, user) {
            if (err || !user)
                return done(err);
            api.unsyncFlickr(user, function (user) {
                console.log("bere");
                user.save(function (err) {
                    if (err)
                        throw  err;
                    res.redirect('/flickr');
                })
            });
        });
    });

    app.get('/sync/Flickr', isLoggedIn, function (req, res) {
        var tempUsername = req.user;
        var oauth = {
                callback: 'http://localhost:2080/flickr/code'
                , consumer_key: privateInfo.flickr.consumer_key
                , consumer_secret: privateInfo.flickr.consumer_secret
            }
            , url = 'https://www.flickr.com/services/oauth/request_token';

        request.post({url: url, oauth: oauth}, function (e, r, body) {
            var req_data = qs.parse(body);
            var uri = 'https://www.flickr.com/services/oauth/authorize' + '?' +
                qs.stringify({oauth_token: req_data.oauth_token});
            res.redirect(uri);
            app.get('/flickr/code', function (req, res) {
                var oauth =
                    {
                        consumer_key: privateInfo.flickr.consumer_key
                        , consumer_secret: privateInfo.flickr.consumer_secret
                        , token: req.query.oauth_token
                        , token_secret: req_data.oauth_token_secret
                        , verifier: req.query.oauth_verifier
                    }
                    , url = 'https://www.flickr.com/services/oauth/access_token'
                    ;

                request.post({url: url, oauth: oauth}, function (e, r, body) {

                    var perm_data = qs.parse(body);

                    var credentials = {
                        username: tempUsername.username,
                        oauth_token: perm_data.oauth_token,
                        oauth_token_secret: perm_data.oauth_token_secret,
                        nsid: perm_data.user_nsid
                    };
                    updateFlickrCredentials(credentials, res);

                });


            });

        });

    });

    function updateFlickrCredentials(credentials, next) {


        User.findOne({'username': credentials.username}, function (err, user) {
            user.flickr.token = credentials.oauth_token;
            user.flickr.token_secret = credentials.oauth_token_secret;
            user.flickr.nsid = credentials.nsid;
            user.save(function (err) {
                if (err) console.dir(err);
                else api.getFlickrPhotos(credentials.username, next);
            });
        });

    }




    //----------------------------------------------------------
    //----------------------------------------------------------
    // PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA
    //----------------------------------------------------------
    //----------------------------------------------------------


    //----------------------------------------------------------
    //----------------------------------------------------------
    // NORBERT NORBERT NORBERT NORBERT NORBERT NORBERT NORBERT
    //----------------------------------------------------------
    //----------------------------------------------------------

    app.get('/instagram/code', isLoggedIn, function (req, res) {
        if (req.query && req.query.code) {
            var data = {
                'client_id': privateInfo.instagram.client_id,
                'client_secret': privateInfo.instagram.client_secret,
                'redirect_uri': privateInfo.instagram.redirect_uri,
                'grant_type': privateInfo.instagram.grant_type,
                'code': req.query.code
            }
            request.post(
                {url: privateInfo.instagram.url_get_access_token, form: data},
                function (err, httpResponse, body) {

                    var instagram_token = JSON.parse(body);
                    User.findOne({'username': req.user.username}, function (err, user) {
                        user.instagram.access_token = instagram_token;
                        user.save(function (err, next) {
                            if (err) console.log(err);
                            getInstagramPictures(req, res, function (err, result) {
                                if (err) {
                                    console.log(err)
                                } else {
                                    res.redirect('/instagram');
                                }
                            });
                        });
                    });



                });
        }
    });

    function refreshInstagramPhotos(req, res, user, callback) {
        if (user.instagram.access_token) {
            for (var i = user.photos.length - 1; i >= 0; i--) {
                if (user.photos[i].source == 'Instagram') {
                    user.photos.splice(i, 1);
                }
            }
            getInstagramPictures(req, res, function (err, result) {
                if (err) {
                    console.log(err)
                }

                user.save(function (err) {
                    if (err) {
                        console.dir(err);
                    }

                    callback(user);
                });

            });
        } else {
            callback(user);
        }
    }

    function getInstagramPictures(req, res, next) {
        User.findOne({'username': req.user.username}, function (err, user) {
            if (err) console.log(err);
            else if (!user.instagram.access_token) console.log('No access token found for INSTAGRAM. Moving on!');
            else {
                req.ig.use({
                    client_id: privateInfo.instagram.client_id,
                    client_secret: privateInfo.instagram.client_secret
                });
                req.ig.use({
                    'access_token': user.instagram.access_token.access_token
                });
                req.ig.user_self_media_recent(function (err, medias, pagination, remaining, limit) {
                    if (err) {
                        next(err);
                    } else {
                        var my_medias = [];
                        async.each(medias, function (media, callback) {
                            var url = media.images.standard_resolution.url;
                            var tags = {};
                            tags.description = [];
                            tags.comments = [];
                            tags.likes = [];
                            tags.tagged = [];
                            async.parallel([

                                function (_callback) {
                                    async.each(media.comments.data, function (comment, _cb) {
                                        var comm = [];
                                        comm.author = [];
                                        comm.author.push.apply(comm.author, api.splitTextInTags(comment.from.username));
                                        comm.author.push.apply(comm.author, api.splitTextInTags(comment.from.full_name));

                                        comm.content = [];
                                        comm.content.push.apply(comm.content, api.splitTextInTags(comment.text));

                                        tags.comments.push(comm);

                                        //tags[comment.from.username.toLowerCase()] = true;
                                        //var words = comment.from.full_name.split(" ");
                                        //words.forEach(function (element, index, array) {
                                        //    tags[element.toLowerCase()] = true;
                                        //});
                                        _cb();
                                    }, _callback);
                                },
                                //function (_callback) {
                                //    async.each(media.comments.data, function (comment, _cb) {
                                //        var words = comment.text.split(" ");
                                //        words.forEach(function (element, index, array) {
                                //            tags[element.toLowerCase()] = true;
                                //        });
                                //        _cb();
                                //    }, _callback);
                                //},
                                function (_callback) {
                                    async.each(media.likes.data, function (like, _cb) {
                                        tags.likes.push.apply(tags.likes, api.splitTextInTags(like.username));
                                        tags.likes.push.apply(tags.likes, api.splitTextInTags(like.full_name));

                                        //tags[like.username] = true;
                                        //var words = like.full_name.split(" ");
                                        //words.forEach(function (element, index, array) {
                                        //    tags[element.toLowerCase()] = true;
                                        //});
                                        _cb();
                                    }, _callback);
                                },
                                function (_callback) {
                                    async.each(media.users_in_photo, function (user, _cb) {
                                        tags.tagged.push.apply(tags.tagged, api.splitTextInTags(user.user.username));
                                        tags.tagged.push.apply(tags.tagged, api.splitTextInTags(user.user.full_name));

                                        //tags[user.user.username.toLowerCase()] = true;
                                        //var words = user.user.full_name.split(" ");
                                        //words.forEach(function (element, index, array) {
                                        //    tags[element.toLowerCase()] = true;
                                        //});
                                        _cb();
                                    }, _callback);
                                },
                                function (_callback) {
                                    async.each(media.tags, function (tag, _cb) {
                                        tags.tagged.push.apply(tags.tagged, api.splitTextInTags(tag));

                                        //tags[tag.toLowerCase()] = true;
                                        //tags[tag.toLowerCase()]=true;
                                        _cb();
                                    }, _callback);
                                }
                            ], function () {
                                my_medias.push({
                                    'url': url,
                                    'tags': tags, //Object.keys(tags),
                                    'source': 'Instagram'
                                });
                                callback();
                            });
                        }, function () {
                            //user.photos = user.photos.concat(my_medias);
                            //a.push.apply(a, b)
                            user.photos.push.apply(user.photos, my_medias);
                            //console.log(user.photos);
                            user.save(function (err) {
                                if (err) {
                                    console.dir(err);
                                }
                            });
                            next(null, null);
                        });
                    }
                });
            }
        });


    };

    app.get('/instagram/unsync', isLoggedIn, function (req, res) {
        User.findOne({'username': req.user.username}, function (err, user) {
            if (err) console.log(err);
            else {
                var i;
                for (i = 0; i < user.photos.length; ++i) {
                    if (user.photos[i].source === "Instagram") {
                        user.photos.splice(i--, 1);
                    }
                }
                user.instagram.access_token = undefined;
                user.save(function (err) {
                    if (err) {
                        console.dir(err);
                    }
                });
                res.redirect('/instagram');
            }
        });
    });

    //----------------------------------------------------------
    //----------------------------------------------------------
    // NORBERT NORBERT NORBERT NORBERT NORBERT NORBERT NORBERT
    //----------------------------------------------------------
    //----------------------------------------------------------

    app.get('/edit_profile', isLoggedIn, function (req, res) {
        res.render('edit_profile', {
            user: req.user
        });
    });

    app.post('/edit_profile', passport.authenticate('edit', {
        successRedirect: '/profile',
        failureRedirect: '/profile',
        failureFlash: true
    }));

    app.get('/instagram', isLoggedIn, function (req, res) {
        var msg = "Sync Instagram";
        var route = "https://instagram.com/oauth/authorize/?client_id=094ce9a906634c468f99aaa7da117b65&redirect_uri=http://localhost:2080/instagram/code&response_type=code";
        if (req.user.instagram.access_token != undefined) {
            msg = "Unsync Instagram";
            route = "/instagram/unsync";
        }
        res.render('instagram.ejs', {
            user: req.user,
            msg: msg,
            route: route
        });
    });

    app.get('/flickr', isLoggedIn, function (req, res) {
        var msg = "Sync Flickr";
        var link = "/sync/Flickr";
        if (req.user.flickr.nsid != undefined) {
            msg = "Unsync Flickr";
            link = "/unsync/Flickr";
        }
        res.render('flickr.ejs', {
            user: req.user,
            msg: msg,
            link: link
        });
    });

    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });


    app.get('/google', isLoggedIn, function (req, res) {
        var message = "Sync Google+";
        var route = "/auth/google";
        if (req.user.google.user_id != undefined) {
            message = "Unsync Google+";
            route = "/deauth/google";
        }
        res.render('google+.ejs', {
            user: req.user,
            message: message,
            route: route
        });
    });

    app.get('/auth/google', isLoggedIn, passport.authenticate('google', {scope: ['https://picasaweb.google.com/data/', 'profile', 'https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/plus.me']}));

    // the callback after google has authenticated the user
    app.get('/auth/google/callback', passport.authenticate('google', {
        successRedirect: '/profile',
        failureRedirect: '/'
    }));

    app.get('/deauth/google', isLoggedIn, function (req, res) {

        User.findOne({'username': req.user.username}, function (err, user) {
            // if there are any errors, return the error before anything else
            if (err || !user)
                return done(err);

            user.google.user_id = undefined;
            user.google.access_token = undefined;

            for (var i = user.photos.length - 1; i >= 0; i--) {
                if (user.photos[i].source == 'google') {
                    user.photos.splice(i, 1);
                }
            }

            user.save(function (err) {
                if (err) {
                    return done(null, user);
                }
            });
        });

        res.redirect('/google');
    });

    /* Facebook - Tudor */
    app.get('/facebook', isLoggedIn, function (req, res) {
        var message = "Sync Facebook";
        var route = "/auth/facebook";
        if (req.user.facebook.token != undefined) {
            message = "Unsync Facebook";
            route = "/deauth/facebook";
        }
        res.render('facebook.ejs', {
            user: req.user,
            message: message,
            route: route
        });
    });

    app.get('/auth/facebook', passport.authenticate('facebook', {scope: ['user_photos']}));

    app.get('/auth/facebook/callback', passport.authenticate('facebook', {
        successRedirect: '/profile',
        failureRedirect: '/logout'
    }));

    app.get('/deauth/facebook', isLoggedIn, function (req, res) {
        User.findOne({'_id': req.user._id}, function (err, user) {
            if (err || !user)
                return done(err);

            api.unsyncFacebookPhotos(user, 0, function (user) {
                user.save(function (err) {
                    if (err)
                        throw  err;
                })
            });
        });

        res.redirect('/facebook');
    });

    app.get('/advanced_search', isLoggedIn, function (req, res) {
            User.findOne({'username': req.user.username}, function (err, user) {
                    user.current_picture_search_index = 0;
                    user.searched_photos.length = 0;

                    var description_tags = api.splitTextInTags(req.query.description);
                    var commented_by_tags = api.splitTextInTags(req.query.commented_by);
                    var commented_content_tags = api.splitTextInTags(req.query.commented_content);
                    var liked_by_tags = api.splitTextInTags(req.query.liked_by);
                    var persons_tagged_tags = api.splitTextInTags(req.query.persons_tagged);


                    if (description_tags.length == 0 && commented_by_tags.length == 0 && commented_content_tags.length == 0 && liked_by_tags.length == 0 && persons_tagged_tags.length == 0) {
                        user.current_picture_index = 0;
                        user.save(function (err) {
                            if (err) {
                                console.dir(err);
                            }
                        });
                        res.redirect('/profile');
                    } else {
                        var photos = user.photos;

                        for (var i = 0; i < photos.length; i++) {
                            photos[i].score = 0;
                            for (var j = 0; j < description_tags.length; j++) {
                                for (var k = 0; k < photos[i].tags.description.length; k++) {
                                    if (photos[i].tags.description[k].indexOf(description_tags[j]) > -1) {
                                        photos[i].score++;
                                    }
                                }
                            }

                            if (commented_by_tags.length > 0 || commented_content_tags.length > 0) {

                                for (var l = 0; l < photos[i].tags.comments.length; l++) {
                                    for (j = 0; j < commented_by_tags.length; j++) {
                                        for (k = 0; k < photos[i].tags.comments[l].author.length; k++) {
                                            if (photos[i].tags.comments[l].author[k].indexOf(commented_by_tags[j]) > -1) {
                                                photos[i].score++;
                                            }
                                        }
                                    }

                                    for (j = 0; j < commented_content_tags.length; j++) {
                                        for (k = 0; k < photos[i].tags.comments[l].content.length; k++) {
                                            if (photos[i].tags.comments[l].content[k].indexOf(commented_content_tags[j]) > -1) {
                                                photos[i].score++;
                                            }
                                        }
                                    }
                                }
                            }


                            for (j = 0; j < liked_by_tags.length; j++) {
                                for (k = 0; k < photos[i].tags.likes.length; k++) {
                                    if (photos[i].tags.likes[k].indexOf(liked_by_tags[j]) > -1) {
                                        photos[i].score++;
                                    }
                                }
                            }

                            for (j = 0; j < persons_tagged_tags.length; j++) {
                                for (k = 0; k < photos[i].tags.tagged.length; k++) {
                                    if (photos[i].tags.tagged[k].indexOf(persons_tagged_tags[j]) > -1) {
                                        photos[i].score++;
                                    }
                                }
                            }
                        }

                        var searched_photos = [];

                        for (i = 0; i < photos.length; i++) {
                            if (photos[i].score > 0) {
                                searched_photos.push(photos[i]);
                            }
                        }

                        photos.sort(function (a, b) {
                            if (a.score < b.score)
                                return 1;
                            else if (a.score > b.score)
                                return -1;
                            else
                                return 0;
                        });

                        if (searched_photos.length == 0)
                            searched_photos = undefined;

                        user.searched_photos = searched_photos;

                        user.save(function (err) {
                            if (err) {
                                console.dir(err);
                            }

                            res.redirect('/search_photos');
                        });
                    }
                }
            )
            ;
        }
    )
    ;
}
;

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}