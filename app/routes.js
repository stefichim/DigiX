// app/routes.js
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
        res.render('profile', {
            user : req.user
        });
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

    app.get('/twitter', isLoggedIn, function(req, res) {
        res.render('twitter.ejs', {
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
};

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}