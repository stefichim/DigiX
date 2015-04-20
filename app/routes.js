// app/routes.js
module.exports = function(app, passport) {
    app.get('/', function(req, res) {
        res.render('index.ejs');
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

    app.get('/add_account', isLoggedIn, function(req, res) {
        res.render('add_account', {
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