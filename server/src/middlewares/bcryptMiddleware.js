//////////////////////////////////////////////////////
// REQUIRE BCRYPT MODULE
//////////////////////////////////////////////////////
const bcrypt = require("bcrypt");
const logger = require("../logger.js");

//////////////////////////////////////////////////////
// SET SALT ROUNDS
//////////////////////////////////////////////////////
const saltRounds = 10;

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTIONS FOR THE PASSWORD
//////////////////////////////////////////////////////
module.exports = {
    comparePassword : (req, res, next) => {
        // Validate that password exists in request body
        if (!req.body.password) {
            return res.status(400).json({
                message: 'Password is required',
                error: 'MISSING_PASSWORD'
            });
        }

        // Validate that hash exists in res.locals
        if (!res.locals.hash) {
            return res.status(500).json({
                message: 'Password hash not found',
                error: 'HASH_NOT_FOUND'
            });
        }

        const callback = async (err, isMatch) => {
            if(err) {
                logger.error(`Error in password comparison: ${err}`);
                return res.status(500).json({
                    message: 'Error during password verification',
                    error: 'PASSWORD_VERIFICATION_ERROR'
                });
            } else {
                if(isMatch) { // if the password matches
                    logger.debug(`Password verification successful for user: ${res.locals.username}`);
                    next();
                } else {
                    try {
                        logger.warn(`Failed login attempt for user: ${res.locals.username} - invalid password`);
                    } catch(auditError) {
                        console.error('Error creating audit log for failed login:', auditError);
                    }
                    
                    res.status(401).json({
                        message : 'Incorrect password, please try again.',
                        error: 'INVALID_PASSWORD'
                    });
                };
            };
        };

        // bcrypt.compare() is a method to compare the provided password and the hashed password
        bcrypt.compare(req.body.password, res.locals.hash, callback);
    },

    hashPassword : (req, res, next) => {
        // Validate that password exists in request body
        if (!req.body.password) {
            return res.status(400).json({
                message: 'Password is required',
                error: 'MISSING_PASSWORD'
            });
        }

        const callback = (err, hash) => {
            if(err) {
                logger.error(`Error in password hashing: ${err}`);
                return res.status(500).json({
                    message: 'Error during password processing',
                    error: 'PASSWORD_HASHING_ERROR'
                });
            } else {
                req.body.password = hash; 
                next();
            };
        };

        // bcrypt.hash() is a method to hash the password to enhance security
        bcrypt.hash(req.body.password, saltRounds, callback);
    }
};