// app/routes.js
var request         =require('../node_modules/request/index.js');
// load up the user model
var mongoose = require('mongoose');
var User            = require('../app/models/user');
var muci =  require('../app/models/user.js');
var async           = require('../node_modules/async');
var privateInfo= require('../app/models/private');
var qs = require('querystring');

module.exports = function(app, passport) {
    app.get('/', function(req, res) {
        res.render('index.ejs', { message: req.flash("message") });
    });

    app.post('/signup', passport.authenticate('signup', {
        successRedirect : '/profile',
        failureRedirect : '/',
        failureFlash : true
    }));

    app.post('/login', passport.authenticate('login', {
        successRedirect : '/profile',
        failureRedirect : '/',
        failureFlash : true
    }));

    app.get('/profile', isLoggedIn, function(req, res) {
        req.db.collection(req.user.username).find({},{'_id':false,'tags':false},function(err, cursor){
            if (err){
             res.send("Error"); 
            }
            else {
                cursor.toArray(function(err,result){
                    res.render('profile', {
                        user : req.user,
                        photos:result
                    });
                })
            }
        })
        
    });

    //----------------------------------------------------------
    //----------------------------------------------------------
    // PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA
    //----------------------------------------------------------
    //----------------------------------------------------------
    app.get('/sync/Flickr', isLoggedIn, function(req,res){
        var tempUsername=req.user;
        console.log("pavaloaquis");
        console.log(tempUsername);

        var  oauth = {
                callback: 'http://localhost:2080/flickr/code'
                , consumer_key: privateInfo.flickr.consumer_key
                , consumer_secret: privateInfo.flickr.consumer_secret }
            , url = 'https://www.flickr.com/services/oauth/request_token';

        request.post({url:url, oauth:oauth}, function(e,r,body){

            var req_data=qs.parse(body);
            var uri='https://www.flickr.com/services/oauth/authorize' + '?'+
                qs.stringify({oauth_token:req_data.oauth_token});
            res.redirect(uri);


            app.get('/flickr/code',function(req,res) {
                var  oauth =
                    {   consumer_key: privateInfo.flickr.consumer_key
                        , consumer_secret: privateInfo.flickr.consumer_secret
                        , token: req.query.oauth_token
                        , token_secret: req_data.oauth_token_secret
                        , verifier: req.query.oauth_verifier
                    }
                    , url = 'https://www.flickr.com/services/oauth/access_token'
                    ;
                console.log("before");
                console.log(req.query.oauth_token);
                console.log(req_data.oauth_token_secret);
                console.log(req.query.oauth_verifier);
                console.log("after");
                request.post({url:url, oauth:oauth}, function (e, r, body) {

                    var perm_data = qs.parse(body)
                        , oauth =
                        { consumer_key: privateInfo.flickr.consumer_key
                            , consumer_secret: privateInfo.flickr.consumer_secret
                            , token: perm_data.oauth_token
                            , token_secret: perm_data.oauth_token_secret
                        };

                    //request.get('/profile');
                    console.log("nsid");
                    console.log(perm_data.user_nsid);
                    var req = {
                        username: tempUsername.username,
                        oauth_token: perm_data.oauth_token,
                        oauth_token_secret: perm_data.oauth_token_secret
                    };

                    updateFlickrCredentials(req);
                    res.redirect("/profile");
                });


            });

        });

    });

    function updateFlickrCredentials(req){
        console.log("update");
        console.log(req);

        User.findOne({'username': req.username}, function(err,user){
            user.flickr.token=req.oauth_token;
            user.flickr.token_secret=req.oauth_token_secret;
            user.save(function(err, next){
                console.log(err);
                return getFlickrPictues(req);
            });
        });

    }

    function getFlickrPictues(req){
        console.log("get");
        console.log(req);
        var oauth_token,oauth_token_secret;
        User.findOne({username: req.username}, function(err,user){
            if(err) {
                console.log("Eroare la gasit user!");
                return;
            }
            var oauth = {
                consumer_key: privateInfo.flickr.consumer_key
                , consumer_secret: privateInfo.flickr.consumer_secret
                , token: user.flickr.token
                , token_secret: user.flickr.token_secret
            };
            var url='https://api.flickr.com/services/rest'+'?'+'method=flickr.people.getPhotos'+
                '&'+'user_id=131928155%40N02' + '&' + 'privacy_filter=2' + '&format=json&nojsoncallback=1';
            request.get({url:url, oauth:oauth}, function(e,r,body){
                if(e) return;
                return insertDatabase(JSON.parse(body));
            });
        });
    }

    function insertDatabase(body){
        User.findOne({username: 'a'}, function(err,user) {
            if(err) {
                console.dir(err);
            }
            for(i=0;i<body.photos.total;i++){
                var rspPhoto=body.photos.photo[i];
                console.log(rspPhoto);
                var url='https://farm'+rspPhoto.farm + '.staticflickr.com/'
                        + rspPhoto.server + '/'+ rspPhoto.id+'_'+rspPhoto.secret
                        +'.jpg';

                user.photos.push({'url': url, 'tags': ['ceva']});
            }
            user.save(function(err, next){
                console.log(err);
                return check(user);
            });
        });
    }

    function check(user){
        console.log(user.photos);
    }

    //----------------------------------------------------------
    //----------------------------------------------------------
    // PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA
    //----------------------------------------------------------
    //----------------------------------------------------------

    app.get('/instagram/code', isLoggedIn, function(req, res) {
        if(req.query && req.query.code){
                var data= {
                    'client_id': '094ce9a906634c468f99aaa7da117b65',
                    'client_secret': 'f697fdd797e042e19f6430294f3d5a1e',
                    'redirect_uri': 'http://localhost:2080/instagram/code',
                    'grant_type': 'authorization_code',
                    'code': req.query.code
                }
                request.post(
                    {url:'https://api.instagram.com/oauth/access_token', form: data},
                    function(err,httpResponse,body){
                        var instagram_token=JSON.parse(body);
                        req.db.collection('users').update(
                            {'_id':req.user['_id']}, 
                            {"$set":{"instagram":instagram_token}}
                            ,function(err,result){
                                if(err){console.log(err);}
                                 getInstagramPictures(req, res, function(err,result){
                                    if(err){
                                        console.log(err)
                                    }else{
                                        res.redirect('/profile');}
                                 });
                        });    
                });
        }
    });

    app.get('/edit_profile', isLoggedIn, function(req, res) {
        res.render('edit_profile', {
            user : req.user
        });
    });

    app.post('/edit_profile', passport.authenticate('edit', {
        successRedirect : '/profile',
        failureRedirect : '/profile',
        failureFlash : true
    }));

    app.get('/facebook', isLoggedIn, function(req, res) {
        res.render('facebook.ejs', {
            user : req.user
        });
    });

    app.get('/google', isLoggedIn, function(req, res) {
        res.render('google+.ejs', {
            user : req.user
        });
    });

    app.get('/instagram', isLoggedIn, function(req, res) {
        res.render('instagram.ejs', {
            user : req.user
        });
    });

    app.get('/flickr', isLoggedIn, function(req, res) {
        res.render('flickr.ejs', {
            user : req.user
        });
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    app.get('/photos',isLoggedIn, function(req, res){
        req.db.collection(req.user.local.username).find({},{'_id':false,'tags':false},function(err, cursor){
            if (err){
             res.send("Error"); 
            }
            else {
                cursor.toArray(function(err,result){
                    res.send(result);
                })
            }
        })
    })
};

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}

function getInstagramPictures(req, res, next) {
    req.db.collection('users').findOne({
        '_id': req.user['_id']
    }, function(err, result) {
        if (err) {
            console.log(err);
        } if(!result.instagram.access_token){
            console.log("no acesstoken");
            next();
        }else {
            var user=result.local
            req.ig.use({
                client_id: '094ce9a906634c468f99aaa7da117b65',
                client_secret: 'f697fdd797e042e19f6430294f3d5a1e'
            });
            req.ig.use({
                'access_token': result.instagram.access_token
            });
            req.ig.user_self_media_recent(function(err, medias, pagination, remaining, limit) {
                if (err) {
                    next(err);
                } else {
                    //console.dir(medias);
                    var my_medias = [];
                    async.each(medias, function(media, callback) {
                        var url = media.images.standard_resolution.url;
                        // var tags = media.tags;
                        var tags={}
                        async.parallel([

                            function(_callback) {
                                async.each(media.comments.data, function(comment, _cb) {
                                    tags[comment.from.username]=true;
                                    var words = comment.from.full_name.split(" ");
                                    words.forEach(function (element, index, array){
                                        tags[element] = true;
                                    });
                                    //tags[comment.from.full_name]=true;
                                    _cb();
                                }, _callback);
                            },
                            function(_callback) {
                                async.each(media.comments.data, function(comment, _cb) {
                                    var words = comment.text.split(" ");
                                    words.forEach(function (element, index, array){
                                        tags[element] = true;
                                    });
                                    _cb();
                                }, _callback);
                            },
                            //aici se termina incercarea
                            function(_callback) {
                                async.each(media.likes.data, function(like, _cb) {
                                    tags[like.username]=true;
                                    var words = like.full_name.split(" ");
                                    words.forEach(function (element, index, array){
                                        tags[element] = true;
                                    });
                                    //tags[like.full_name]=true;
                                    _cb();
                                }, _callback);
                            },
                            function(_callback) {
                                async.each(media.users_in_photo, function(user, _cb) {
                                    tags[user.user.username]=true;
                                    var words = user.user.full_name.split(" ");
                                    words.forEach(function (element, index, array){
                                        tags[element] = true;
                                    });
                                    //tags[user.user.full_name]=true;
                                    _cb();
                                }, _callback);
                            },
                            function(_callback) {
                                async.each(media.tags, function(tag, _cb) {
                                    tags[tag]=true;
                                    tags[tag]=true;
                                    _cb();
                                }, _callback);
                            }
                        ], function() {
                            my_medias.push({
                                'url': url,
                                'tags': Object.keys(tags)
                            });
                            console.dir(my_medias);
                            callback();
                        });
                    }, function() {
                        console.log(user.username);
                        req.db.collection(user.username).insert(my_medias,function(err,res){
                            if(err){
                                next(err);
                            }else{
                                next(null,null)
                            }
                        })
                    });
                }
            });

        }
    });
};