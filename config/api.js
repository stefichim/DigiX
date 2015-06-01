var request = require('request');
var User = require('../app/models/user');
var privateInfo = require('../app/models/private');
var qs = require('querystring');
/* Facebook */
/* Facebook */
function removeNull(tmp_arr){
    for (var i = 0; i < tmp_arr.length; i++){
        if (tmp_arr[i] == ""){
            tmp_arr.splice(i, 1);
        }
    }
};

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
                        var tmp_arr = photosJson['data'][j].place.name.toLowerCase().split(/[\s,"'\.\-\(\)]+/);
                        removeNull(tmp_arr);
                        tags.push.apply(tags, tmp_arr);
                    }
                    // Photo description
                    if (photosJson['data'][j].name){
                        var tmp_arr = photosJson['data'][j].name.toLowerCase().split(/[\s,"'\.\-\(\)]+/);
                        removeNull(tmp_arr);
                        tags.push.apply(tags, tmp_arr);
                    }
                    // Photo tags
                    if (photosJson['data'].tags != undefined && photosJson['data'].tags.data != undefined) {
                        for (var tag_index = 0; tag_index < photosJson['data'].tags.data.length; tag_index++){
                            var tmp_arr = photosJson['data'].tags.data[k].name.toLowerCase().split(/[\s,"'\.\-\(\)]+/);
                            removeNull(tmp_arr);
                            tags.push.apply(tags, tmp_arr);
                        }
                    }

                    console.dir(tags);

                    photos.push({
                        url: photosJson['data'][j].source,
                        source: 'facebook',
                        tags: tags
                    });
                }

                console.dir(photosJson);


                if (photosJson['paging'] != undefined) {
                    if (photosJson['paging'].next != undefined)
                    {
                        getFacebookPhoto(photos, album_index, albums, token, photosJson['paging'].next, callback);
                    }
                    else {
                        getFacebookPhoto(photos, album_index + 1, albums, token, "", callback);
                    }
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


    var describeUrl = 'https://api.flickr.com/services/rest' + '?' + 'method=flickr.photos.getInfo' +
            '&' + 'photo_id=' + rspPhoto.id + '&secret='+rspPhoto.secret+ '&format=json&nojsoncallback=1',
        oauth = {
            consumer_key: privateInfo.flickr.consumer_key
            , consumer_secret: privateInfo.flickr.consumer_secret
        };

    request.get({url: describeUrl, oauth: oauth}, function(e,r,body){
        if(e){
            console.dir(e);
            return;
        }

        var info=JSON.parse(body);
        var description=info.photo.description._content;
        var splitDescription="";
        if(description!="") splitDescription=splitTextInTags(description);

        var tagUrl = 'https://api.flickr.com/services/rest' + '?' + 'method=flickr.tags.getListPhoto' +
            '&' + 'photo_id=' + rspPhoto.id + '&format=json&nojsoncallback=1';
        request.get({url: tagUrl, oauth: oauth}, function (e, r, body) {
            if (e) {
                console.dir(e);
                return;
            }
            var tags = JSON.parse(body);
            var realTags = [];

            for (j = 0; j < tags.photo.tags.tag.length; j++) {
                realTags.push(tags.photo.tags.tag[j].raw);
            }
            //console.log(rspPhoto);
            var commentsUrl='https://api.flickr.com/services/rest' + '?' + 'method=flickr.photos.comments.getList' +
                '&' + 'photo_id=' + rspPhoto.id + '&format=json&nojsoncallback=1' ;


            request.get({url: commentsUrl, oauth: oauth}, function (e, r, body) {
                var comments=JSON.parse(body);

                var authorList="",commentList="";
                var commentsArray= {
                    'author': [],
                    'content': []
                    };

                if(comments.comments!=undefined){
                    console.log(comments.comments.comment.length);
                    for(i=0;i<comments.comments.comment.length;i++) {
                        authorList = splitTextInTags(comments.comments.comment[i].realname);
                        commentList=splitTextInTags(comments.comments.comment[i]._content);
                        for(j=0;j<authorList.length;j++) commentsArray.author.push(authorList[j]);
                        for(j=0;j<commentList.length;j++) commentsArray.content.push(commentList[j]);
                    }
                }

                var peopleUrl='https://api.flickr.com/services/rest' + '?' + 'method=flickr.photos.people.getList' +
                    '&' + 'photo_id=' + rspPhoto.id + '&format=json&nojsoncallback=1' ;

                request.get({url: peopleUrl, oauth: oauth}, function (e, r, body) {
                    var people=JSON.parse(body).people;
                    if(people!=undefined) {
                        for (i = 0; i < people.total; i++) {
                            var splitName=splitTextInTags(people.person[i].realname);
                            realTags.push.apply(realTags,splitName);
                            console.log(realTags);
                        }
                    }

                    data.user.photos.push({
                        'url': photoUrl, 'source': 'flickr', 'tags': {
                            'description': splitDescription,
                            'tagged': realTags,
                            'comments': commentsArray
                        }
                    });
                    data.count++;
                    nextPictureFlickr(data, next);
                });
            });
        });

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


function getPicasaAlbums(profile_id, token, user, callback) {
    var url = 'https://picasaweb.google.com/data/feed/api/user/' + profile_id + '?alt=json&v=2&access=all&access_token=' + token;

    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var albumsJson = JSON.parse(body);

            if (albumsJson.feed.entry != undefined) {

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
            } else {
                callback(user);
            }
        }
    });
}

function getPicasaPhotos(photos, album_nr, album_array, profile_id, access_token, callback) {
    if (album_nr < album_array.length) {
        var album_url = 'https://picasaweb.google.com/data/feed/api/user/' + profile_id + '/albumid/' + album_array[album_nr]['gphoto$id']['$t'] + '?alt=json&v=2&access_token=' + access_token;
        request(album_url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var photosJson = JSON.parse(body);

                getPicasaPhotosInfo(0, profile_id, album_array[album_nr]['gphoto$id']['$t'], access_token, photosJson.feed.entry, photos, function (photos) {
                    getPicasaPhotos(photos, album_nr + 1, album_array, profile_id, access_token, callback);
                });
            }
        });
    } else {
        callback(photos);
    }
}

function getPicasaPhotosInfo(j, profile_id, album_id, token, photosInAlbum, photos, callback) {
    if (photosInAlbum != undefined && j < photosInAlbum.length) {
        var tags = [];

        getPicasaPhotoTags(profile_id
            , album_id
            , photosInAlbum[j]['gphoto$id']['$t']
            , token, function (titleTags, descriptionTags, commentsTags) {
                tags.push.apply(tags, titleTags);
                tags.push.apply(tags, descriptionTags);
                tags.push.apply(tags, commentsTags.authorTags);
                tags.push.apply(tags, commentsTags.textTags);

                photos.push({
                    url: photosInAlbum[j].content.src,
                    tags: tags,
                    source: 'google'
                });

                getPicasaPhotosInfo(j + 1, profile_id, album_id, token, photosInAlbum, photos, callback);
            });
    } else {
        callback(photos);
    }
}

function getPicasaPhotoTags(profile_id, album_id, photo_id, token, callback) {
    var photo_url = 'https://picasaweb.google.com/data/feed/api/user/' + profile_id + '/albumid/' + album_id + '/photoid/' + photo_id + '?alt=json&v=2&access_token=' + token;

    request(photo_url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var photoInfoJson = JSON.parse(body);

            var titleTags = splitTextInTags(photoInfoJson.feed.title['$t']);

            var descriptionTags = splitTextInTags(photoInfoJson.feed.subtitle['$t']);
            var commentsTags = [];

            for (var i = 0; photoInfoJson.feed.entry != undefined && i < photoInfoJson.feed.entry.length; i++) {
                var authorTags = splitTextInTags(photoInfoJson.feed.entry[i].title['$t']);
                var commentTextTags = splitTextInTags(photoInfoJson.feed.entry[i].content['$t']);

                commentsTags.push({
                    author: authorTags,
                    content: commentTextTags
                });
            }

            callback(titleTags, descriptionTags, commentsTags);
        }
    });
}

function splitTextInTags(text) {
    var tagFirstPos = 0;
    var tags = [];
    for (var i = 0; i < text.length; i++) {
        if (isCharNotPartOfTag(text.charAt(i))) {
            if (i - tagFirstPos > 0) {
                tags.push(text.substring(tagFirstPos, i).toLowerCase());
            }
            tagFirstPos = i + 1;
        }
    }

    if (i - tagFirstPos > 0) {
        tags.push(text.substring(tagFirstPos, i).toLowerCase());
    }
    return tags;
}

function isCharNotPartOfTag(char) {
    if (char.charCodeAt(0) < 48) {
        return true;
    } else if (char.charCodeAt(0) > 57 && char.charCodeAt(0) < 65) {
        return true;
    } else if (char.charCodeAt(0) > 90 && char.charCodeAt(0) < 97) {
        return true;
    } else if (char.charCodeAt(0) > 122) {
        return true;
    } else {
        return false;
    }
}

module.exports = {
    getFacebookPhoto : getFacebookPhoto,
    getFacebookAlbum : getFacebookAlbum,
    unsyncFacebookPhotos : unsyncFacebookPhotos,
    syncFacebookPhotos : syncFacebookPhotos,

    getFlickrPhotos: getFlickrPhotos,
    unsyncFlickr: unsyncFlickr,

    getPicasaAlbums: getPicasaAlbums,
    splitTextInTags: splitTextInTags
};
