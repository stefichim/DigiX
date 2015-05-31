var request = require('request');
var User = require('../app/models/user');
var privateInfo = require('../app/models/private');
var qs = require('querystring');
/* Facebook */
function getFacebookPhoto(photos, album_index, albums, token, next, callback) {
    if (album_index < albums.length) {
        var album_url = "";
        if (next === "") {
            album_url = 'https://graph.facebook.com/' + albums[album_index].id + '/photos?access_token=' + token;
        }
        else {
            album_url = next;
        }

        console.dir(album_url);

        request(album_url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var photosJson = JSON.parse(body);
                console.dir(photosJson);

                for (var j = 0; j < photosJson['data'].length; j++) {
                    photos.push({
                        url: photosJson['data'][j].source,
                        source: 'facebook'
                    });
                }

                if (photosJson['paging'].next != undefined) {
                    getFacebookPhoto(photos, album_index, albums, token, photosJson['paging'].next, callback);
                }
                else {
                    getFacebookPhoto(photos, album_index + 1, albums, token, "", callback);
                }
            }
        });
    } else {
        callback(photos);
    }
};

function getFacebookAlbum(profile_id, token, user, callback) {
    var url = 'https://graph.facebook.com/' + profile_id + '/albums?access_token=' + token;

    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var albumsJson = JSON.parse(body)['data'];
            console.dir(albumsJson);

            getFacebookPhoto(new Array(), 0, albumsJson, token, "", function (photos) {
                for (var i = 0; i < photos.length; i++) {
                    user.photos.push(photos[i]);
                }

                user.facebook.token = token;
                user.facebook.profile_id = profile_id;

                callback(user);
            });
        }
    });
};

function unsyncFacebookPhotos(user, isRefresh, callback) {
    if (isRefresh != 1){
        user.facebook.token = undefined;
        user.facebook.profile_id = undefined;
    }

    for (var i = user.photos.length - 1; i >= 0; i--) {
        if (user.photos[i].source == 'facebook') {
            user.photos.splice(i, 1);
        }
    }

    callback(user);
};

function syncFacebookPhotos(user, callback) {
    getFacebookAlbum(user.facebook.profile_id, user.facebook.token, user, function (user) {
        callback(user);
    });
};



function getFlickrPhotos(username, res){

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
            console.log("pava");
            console.dir(body);
            insertDatabaseFlickr(username, JSON.parse(body), res);
        });
    });
};
function insertDatabaseFlickr(username, body, next) {
    var count = 0;
    User.findOne({username: username}, function (err, user) {
        if (err) {
            console.dir(err);
            return;
        }
        var data = {
            username: username,
            body: body,
            count: count,
            user: user
        }
        nextPictureFlickr(data, next);
    });

}
function nextPictureFlickr(data, next) {
    var total = data.body.photos.total;
    if (data.count == total) {
        data.user.save(function (err) {
            if (err) return;
        })
        return next.redirect('/flickr');
    }
    var rspPhoto = data.body.photos.photo[data.count];

    var photoUrl = 'https://farm' + rspPhoto.farm + '.staticflickr.com/'
        + rspPhoto.server + '/' + rspPhoto.id + '_' + rspPhoto.secret
        + '.jpg';
    var url = 'https://api.flickr.com/services/rest' + '?' + 'method=flickr.tags.getListPhoto' +
            '&' + 'photo_id=' + rspPhoto.id + '&format=json&nojsoncallback=1'
        , oauth = {
            consumer_key: privateInfo.flickr.consumer_key
            , consumer_secret: privateInfo.flickr.consumer_secret
        };
    request.get({url: url, oauth: oauth}, function (e, r, body) {
        if (e) {
            console.dir(e);
            return;
        }
        var tags = JSON.parse(body);
        var realTags = [];
        for (j = 0; j < tags.photo.tags.tag.length; j++) {
            realTags.push(tags.photo.tags.tag[j].raw);
        }
        data.user.photos.push({'url': photoUrl,'source':'flickr', 'tags': realTags});
        data.count++;
        nextPictureFlickr(data, next);
    });
}
function unsyncFlickr(user, callback ){
    for (var i = user.photos.length - 1; i >= 0; i--) {
        if (user.photos[i].source == 'flickr') {
            user.photos.splice(i, 1);
        }
    }
    user.flickr.nsid=undefined;
    user.flickr.token=undefined;
    user.flickr.token_secret=undefined;
    callback(user);
}

module.exports = {
    getFacebookPhoto : getFacebookPhoto,
    getFacebookAlbum : getFacebookAlbum,
    unsyncFacebookPhotos : unsyncFacebookPhotos,
    syncFacebookPhotos : syncFacebookPhotos,

    getFlickrPhotos: getFlickrPhotos,
    unsyncFlickr: unsyncFlickr
};
