var request = require('request');

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

        //console.dir(album_url);

        request(album_url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var photosJson = JSON.parse(body);
                //console.dir(photosJson);

                for (var j = 0; j < photosJson['data'].length; j++) {
                    tags = [];

                    // Photo location
                    if (photosJson['data'][j].place != undefined && photosJson['data'][j].place.name != undefined){
                        tags.push.apply(tags, photosJson['data'][j].place.name.toLowerCase().split(" ."));
                    }
                    // Photo description
                    if (photosJson['data'][j].name){
                        tags.push.apply(tags, photosJson['data'][j].name.toLowerCase().split(" ."));
                    }
                    // Photo tags
                    if (photosJson['data'].tags != undefined && photosJson['data'].tags.data != undefined) {
                        for (var tag_index = 0; tag_index < photosJson['data'].tags.data.length; tag_index++){
                            tags.push.apply(tags, photosJson['data'].tags.data[k].name.toLowerCase().split(" ."));
                        }
                    }

                    console.dir(tags);

                    photos.push({
                        url: photosJson['data'][j].source,
                        source: 'facebook',
                        tags: tags
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

module.exports = {
    getFacebookPhoto : getFacebookPhoto,
    getFacebookAlbum : getFacebookAlbum,
    unsyncFacebookPhotos : unsyncFacebookPhotos,
    syncFacebookPhotos : syncFacebookPhotos
};
