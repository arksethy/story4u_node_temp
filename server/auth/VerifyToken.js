var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('../config'); // get our config file

function verifyToken(req, res, next) {

  // check header for token - support both x-access-token and Authorization Bearer
  var token = req.headers['x-access-token'];
  
  // If not found in x-access-token, check Authorization Bearer header
  if (!token && req.headers['authorization']) {
    var authHeader = req.headers['authorization'];
    // Extract token from "Bearer <token>" format
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  if (!token) 
    return res.status(403).send({ auth: false, message: 'No token provided.' });

  // verifies secret and checks exp
  jwt.verify(token, config.secret, function(err, decoded) {      
    if (err) 
      return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });    

    // if everything is good, save to request for use in other routes
    req.userId = decoded.id;
    next();
  });

}

module.exports = verifyToken;