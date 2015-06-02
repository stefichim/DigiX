// server.js
var express = require('express');
var app = express();
var port = process.env.PORT || 2080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var ig = require('instagram-node').instagram();
var mongodb = require('express-mongo-db');


// configuration
app.use(express.static(__dirname + '/static'));

var favicon = require('serve-favicon');
app.use(favicon('static/images/digix.ico'));

var configDB = require('./config/database.js');
mongoose.connect(configDB.url);


require('./config/passport')(passport); // pass passport for configuration

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());     // get information from html forms

app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(session({secret: 'node-digix-project'})); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// routes ======================================================================
app.use(function (req, res, next) {
    req.ig = ig;
    next();
});
app.use(mongodb(require('mongodb'), {
    hosts: [{
        host: 'localhost',
        port: 27017
    }],
    mongoClient: {
        slaveOk: true
    },
    database: 'DigiX'
}));
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);