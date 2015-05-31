// app/routes.js
var request         =require('../node_modules/request/index.js');
// load up the user model
var mongoose        = require('mongoose');
var User            = require('../app/models/user');
var muci =  require('../app/models/user.js');
var async           = require('../node_modules/async');
var privateInfo     = require('../app/models/private');
var qs              = require('querystring');

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
        User.findOne({'username': req.user.username}, function(err,user){
            if (err) console.log(err);
            else{
                var my_pictures = [];
                user.photos.forEach(function (photo){
                    my_pictures.push(photo.url);
                });
                res.render('profile', {
                    user : user,
                    photos: my_pictures
                });
            }
        });
    });



    //----------------------------------------------------------
    //----------------------------------------------------------
    // PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA PAVA
    //----------------------------------------------------------
    //----------------------------------------------------------

    app.get('/arbore', isLoggedIn, function(req,res){
        console.log("ceva");
       res.render('arbore.ejs',{});
    });


    function changeSons(node,type,user,res){
        if(user.tree.length==0) changeMyself(user,node,res);
        else {
            for (i = 0; i < user.tree.length; i++) {
                console.log(user.tree[i].myId);
                console.log(node.relId);
                if (user.tree[i].myId == node.relId) {
                    console.log("pavaloi");
                    if (type == "mother") user.tree[i].mother = String(node.myId);
                    else user.tree[i].father = String(node.myId);
                    changeMyself(user, node, res);
                }
            }
        }
    }

    function changeMyself(user,node,res){
        var found=false;
        for (i = 0; i < user.tree.length; i++) {
            if (user.tree[i].myId == node.myId) {
                console.log("here");
                user.tree[i].children.push(node.relId);
                found=true;
            }
        }

        if (found == false) {
            user.tree.push({
                'myId': node.myId,
                'name': node.name,
                'mother': "",
                'father': "",
                'myType': node.type,
                'children': [node.child]
            });
            console.log("inserez");
            console.log(user.tree[0]);

            user.save(function (err) {
                console.log(user);
                console.log("ceva");
                if (err) {
                    console.dir(err);
                }

            });
        }

    }

    app.post('/ajax', isLoggedIn, function(req,res) {

        var node=req.body.node;
        User.findOne({'username': req.user.username}, function(err,user){
            changeSons(node,node.type,user,res);
        });

    });





    app.get('/sync/Flickr', isLoggedIn, function(req,res){
        var tempUsername=req.user;
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
       
                request.post({url:url, oauth:oauth}, function (e, r, body) {

                    var perm_data = qs.parse(body)
                        , oauth =
                        { consumer_key: privateInfo.flickr.consumer_key
                            , consumer_secret: privateInfo.flickr.consumer_secret
                            , token: perm_data.oauth_token
                            , token_secret: perm_data.oauth_token_secret
                        };
                    console.log(perm_data);
                    var credentials = {
                        username: tempUsername.username,
                        oauth_token: perm_data.oauth_token,
                        oauth_token_secret: perm_data.oauth_token_secret,
                        nsid: perm_data.user_nsid
                    };
                    updateFlickrCredentials(credentials,res);

                });


            });

        });

    });

    function updateFlickrCredentials(credentials, next){


        User.findOne({'username': credentials.username}, function(err,user){
            user.flickr.token=credentials.oauth_token;
            user.flickr.token_secret=credentials.oauth_token_secret;
            user.flickr.nsid=credentials.nsid;
            user.save(function(err){
                if(err) console.dir(err);
                else //next.redirect('/flickr/get/photos/?username='+credentials.username);
                     getFlickrPhotos(credentials.username, next);
            });
        });

    }



    function getFlickrPhotos(username, next) {
        User.findOne({username: username}, function (err, user) {
            if (err) {
                console.dir(err);
                return;
            }
            var oauth = {
                consumer_key: privateInfo.flickr.consumer_key
                , consumer_secret: privateInfo.flickr.consumer_secret
                , token: user.flickr.token
                , token_secret: user.flickr.token_secret
            }, url = 'https://api.flickr.com/services/rest' + '?' + 'method=flickr.people.getPhotos' +
                '&' + 'user_id=' + user.flickr.nsid + '&format=json&nojsoncallback=1';


            request.get({url: url, oauth: oauth}, function (e, r, body) {
                if (e) {
                    console.dir(e);
                    return;
                }
                insertDatabase(username, JSON.parse(body), next);
            });


        });
    }



    function insertDatabase(username,body,res){
        var count=0;
        User.findOne({username: username}, function(err,user) {
            if (err) {
                console.dir(err);
                return;
            }
            var data={
                username: username,
                body: body,
                count:count,
                user: user
            }
            nextPicture(data, res);
        });

    }
    function nextPicture(data,next){
        var total=data.body.photos.total;
        if(data.count==total) {
            data.user.save(function(err){
                if(err) return;
            })
            return next.redirect('/flickr');

        }
        var rspPhoto=data.body.photos.photo[data.count];

        var photoUrl='https://farm'+rspPhoto.farm + '.staticflickr.com/'
            + rspPhoto.server + '/'+ rspPhoto.id+'_'+rspPhoto.secret
            +'.jpg';
        var url='https://api.flickr.com/services/rest'+'?'+'method=flickr.tags.getListPhoto'+
                '&'+'photo_id='+ rspPhoto.id + '&format=json&nojsoncallback=1'
            ,oauth = {
                consumer_key: privateInfo.flickr.consumer_key
                ,consumer_secret: privateInfo.flickr.consumer_secret};
        request.get({url:url, oauth:oauth}, function(e,r,body){
            if(e) {
                console.dir(e);
                return;
            }
            var tags=JSON.parse(body);
            var realTags = [];
            for(j=0;j<tags.photo.tags.tag.length;j++){
                realTags.push(tags.photo.tags.tag[j].raw);
            }
            data.user.photos.push({'url': photoUrl, 'tags': realTags});
            data.count++;
            nextPicture(data,next);
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

    app.get('/instagram/code', isLoggedIn, function(req, res) {
        if(req.query && req.query.code){
            var data= {
                'client_id': privateInfo.instagram.client_id,
                'client_secret': privateInfo.instagram.client_secret,
                'redirect_uri': privateInfo.instagram.redirect_uri,
                'grant_type': privateInfo.instagram.grant_type,
                'code': req.query.code
            }
            request.post(
                {url: privateInfo.instagram.url_get_access_token, form: data},
                function(err,httpResponse,body){

                    var instagram_token = JSON.parse(body);
                    User.findOne({'username': req.user.username}, function(err,user){
                        user.instagram.access_token = instagram_token;
                        user.save(function(err, next){
                            if (err) console.log(err);
                            getInstagramPictures(req, res, function(err,result){
                                if(err){
                                    console.log(err)
                                }else{
                                    res.redirect('/profile');}
                            });
                        });
                    });

                    /*var instagram_token=JSON.parse(body);
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
                        });*/

                });
        }
    });

    function getInstagramPictures(req, res, next) {
        User.findOne({'username': req.user.username}, function(err,user){
            if (err) console.log(err);
            else if (!user.instagram.access_token) console.log('No access token found for INSTAGRAM. Moving on!');
            else{
                req.ig.use({
                    client_id: privateInfo.instagram.client_id,
                    client_secret: privateInfo.instagram.client_secret
                });
                req.ig.use({
                    'access_token': user.instagram.access_token.access_token
                });
                req.ig.user_self_media_recent(function(err, medias, pagination, remaining, limit) {
                    if (err) {
                        next(err);
                    } else {
                        var my_medias = [];
                        async.each(medias, function(media, callback) {
                            var url = media.images.standard_resolution.url;
                            var tags={}
                            async.parallel([

                                function(_callback) {
                                    async.each(media.comments.data, function(comment, _cb) {
                                        tags[comment.from.username.toLowerCase()]=true;
                                        var words = comment.from.full_name.split(" ");
                                        words.forEach(function (element, index, array){
                                            tags[element.toLowerCase()] = true;
                                        });
                                        _cb();
                                    }, _callback);
                                },
                                function(_callback) {
                                    async.each(media.comments.data, function(comment, _cb) {
                                        var words = comment.text.split(" ");
                                        words.forEach(function (element, index, array){
                                            tags[element.toLowerCase()] = true;
                                        });
                                        _cb();
                                    }, _callback);
                                },
                                function(_callback) {
                                    async.each(media.likes.data, function(like, _cb) {
                                        tags[like.username]=true;
                                        var words = like.full_name.split(" ");
                                        words.forEach(function (element, index, array){
                                            tags[element.toLowerCase()] = true;
                                        });
                                        _cb();
                                    }, _callback);
                                },
                                function(_callback) {
                                    async.each(media.users_in_photo, function(user, _cb) {
                                        tags[user.user.username.toLowerCase()]=true;
                                        var words = user.user.full_name.split(" ");
                                        words.forEach(function (element, index, array){
                                            tags[element.toLowerCase()] = true;
                                        });
                                        _cb();
                                    }, _callback);
                                },
                                function(_callback) {
                                    async.each(media.tags, function(tag, _cb) {
                                        tags[tag.toLowerCase()]=true;
                                        //tags[tag.toLowerCase()]=true;
                                        _cb();
                                    }, _callback);
                                }
                            ], function() {
                                my_medias.push({
                                    'url': url,
                                    'tags': Object.keys(tags)
                                });
                                callback();
                            });
                        }, function() {
                            //user.photos = user.photos.concat(my_medias);
                            //a.push.apply(a, b)
                            user.photos.push.apply(user.photos, my_medias);
                            //console.log(user.photos);
                            user.save(function(err){
                                if(err) {
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

    //----------------------------------------------------------
    //----------------------------------------------------------
    // NORBERT NORBERT NORBERT NORBERT NORBERT NORBERT NORBERT
    //----------------------------------------------------------
    //----------------------------------------------------------

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
        var msg="Sync Flickr";
        var link="/sync/Flickr";
        if(req.user.flickr.nsid!=undefined) {
            msg = "Unsync Flickr";
            link="/unsync/Flickr";
        }
        res.render('flickr.ejs', {
            user : req.user,
            msg: msg,
            link: link
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