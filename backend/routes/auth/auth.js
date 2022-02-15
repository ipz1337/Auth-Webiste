//Express
const express = require('express');
const router = express.Router();
const connection = require('../../utils/connect_sql.js');
const expressBrute = require('express-brute');
const store = new expressBrute.MemoryStore();
const bruteforce = new expressBrute(store);
const async = require('async');
//Hashing
const hash = require('../../utils/hashing.js');
const hashPassword = hash.hashing.hashPassword;
const checkPassword = hash.hashing.checkPassword;
//Webhook Functions
const webhook = require('../../utils/web_logs.js');
const hook = webhook.web_logs.hook;
const Webhook = webhook.web_logs.Webhook;
const MessageBuilder = webhook.web_logs.MessageBuilder;
//Validation
const validator = require('../../utils/validation.js');
const validate = validator.validation.validate;



router.get('/register', (req, res) => {
	return res.render('register.ejs');
});
router.get('/login', (req, res) => {
    return res.render('login.ejs');
});






//ddos protection
router.use(function(req, res, next) {
    bruteforce.get(req, function(err, data) {
        if (err) {
            return next(err);
        }
        if (data) {
            return res.status(429).send('You have exceeded the rate limit');
        }
        next();
    });
});


//router.post('/users/add', function(req, res) {


router.post('/users/add',  bruteforce.prevent, function(req, res) {
    const user = req.body.user
    const password = req.body.password
    const email = req.body.email
    //validate email
    if (!validate.email(email)) {
        return res.status(400).send('Invalid email');
    }
    if (password.length < 8) {
        return res.status(400).send('Password must be at least 8 characters long')
    }
    if (user.length < 3) {
        return res.status(400).send('Username must be at least 3 characters long')
    }
    //make
    async.waterfall([
        function(callback) {
            connection.query('SELECT * FROM users WHERE username = ? OR email = ?', [user, email], function(err, result) {
                if (err) {
                    console.log(err)
                    return res.status(500).send('Internal Error')
                } else{
                    if (result.length > 0) {
                        res.status(409).send('User already exists')
                    } else {
                        callback(null, user, password_hashed, email)
                    }
                }
            })
        },
        function(user, password_hashed, email, callback) {
            const password_hashed = hashPassword(password)
            connection.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [user, password_hashed, email], function(err) {
                if (err) {
                    console.log(err)
                    return res.status(500).send('Internal Error')
                } else {
                    callback(null, user)
                }
            })
        },
        function(user, callback) {
            connection.query('SELECT * FROM users WHERE username = ?', [user], function(err, result) {
                if (err) {
                    console.log(err)
                    return res.status(500).send('Internal Error')
                } else {
                    callback(null, result[0])
                }
            })
        }
    ], function(err) {
        if (err) {
            console.log(err)
            return res.status(500).send('Internal Error')
        } else {
            res.status(201).send('User created')
        }
    })
});

router.post('/users/login',  bruteforce.prevent, (req, res) => {
    const email = req.query.email;
    const password = req.query.password;
    async.waterfall([
        function(callback) {
            connection.query('SELECT * FROM users WHERE email = ?', [email], function(err, result) {
                if (err) {
                    console.log(err)
                    return res.status(500).send('Internal Error')
                } else {
                    if (result.length > 0) {
                        callback(null, result[0])
                    } else {
                        return res.status(404).send('User not found')
                    }
                }
            })
        },
        function(user, callback) {
            if (checkPassword(password, user.password)) {
                callback(null, user)
            } else {
                return res.status(401).send('Wrong password')
            }
        }
    ], function(err, user) {
        if (err) {
            console.log(err)
            return res.status(500).send('Internal Error')
        } else {
            console.log(user)
            return res.redirect('/underconst')
        }
    })
});


module.exports = router;


