var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var User = require('../user/User');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var config = require('../config');
var VerifyToken = require('./VerifyToken');
var roleBasedRateLimit = require('../middleware/roleBasedRateLimit');

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

// Middleware to verify superadmin role
function VerifySuperAdmin(req, res, next) {
  User.findById(req.userId, function (err, user) {
    if (err) return res.status(500).send({ auth: false, message: 'Error finding user.' });
    if (!user) return res.status(404).send({ auth: false, message: 'User not found.' });
    if (user.role !== 'superadmin') {
      return res.status(403).send({ auth: false, message: 'Access denied. Superadmin role required.' });
    }
    req.currentUser = user; // Store current user in request
    next();
  });
}

// Middleware to verify admin or superadmin role
function VerifyAdmin(req, res, next) {
  User.findById(req.userId, function (err, user) {
    if (err) return res.status(500).send({ auth: false, message: 'Error finding user.' });
    if (!user) return res.status(404).send({ auth: false, message: 'User not found.' });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).send({ auth: false, message: 'Access denied. Admin or Superadmin role required.' });
    }
    req.currentUser = user; // Store current user in request
    next();
  });
}


// User registration is now restricted - only superadmin can create users
// Use /api/auth/create-user endpoint instead (requires superadmin token)
// This endpoint is kept for backward compatibility but returns error
router.post('/register', function(req, res) {
  return res.status(403).send({ 
    auth: false, 
    message: 'Public registration is disabled. Only admin or superadmin can create users. Please contact an administrator.' 
  });
  
    // Input validation - Check required fields
    if (!req.body.name || !req.body.email || !req.body.password) {
      return res.status(400).send({ 
        auth: false, 
        message: 'Name, email, and password are required' 
      });
    }

    // Trim and sanitize inputs
    var name = req.body.name.trim();
    var email = req.body.email.trim().toLowerCase();
    var password = req.body.password;

    // Validate name length
    if (name.length < 2 || name.length > 100) {
      return res.status(400).send({ 
        auth: false, 
        message: 'Name must be between 2 and 100 characters' 
      });
    }

    // Validate email format
    var emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).send({ 
        auth: false, 
        message: 'Please enter a valid email address' 
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).send({ 
        auth: false, 
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Check for password complexity (optional but recommended)
    var hasUpperCase = /[A-Z]/.test(password);
    var hasLowerCase = /[a-z]/.test(password);
    var hasNumbers = /\d/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).send({ 
        auth: false, 
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    // Check if email already exists
    User.findOne({ email: email }, function (err, existingUser) {
      if (err) {
        return res.status(500).send({ 
          auth: false, 
          message: 'Error checking email availability' 
        });
      }
      
      if (existingUser) {
        return res.status(400).send({ 
          auth: false, 
          message: 'Email is already registered' 
        });
      }

      // Hash password
      var hashedPassword = bcrypt.hashSync(password, 8);
      
      // Create user with role always set to 'user' (ignore any role in request)
      User.create({
        name: name,
        email: email,
        role: 'user', // Always default to 'user', role cannot be set during registration
        password: hashedPassword
      },
      function (err, user) {
        if (err) {
          // Handle duplicate email error (in case of race condition)
          if (err.code === 11000) {
            return res.status(400).send({ 
              auth: false, 
              message: 'Email is already registered' 
            });
          }
          // Handle validation errors
          if (err.name === 'ValidationError') {
            var messages = Object.keys(err.errors).map(function(key) {
              return err.errors[key].message;
            }).join(', ');
            return res.status(400).send({ 
              auth: false, 
              message: messages 
            });
          }
          return res.status(500).send({ 
            auth: false, 
            message: 'There was a problem registering the user' 
          });
        }
        
        // Create a token
        var token = jwt.sign({ id: user._id }, config.secret, {
          expiresIn: 86400 // expires in 24 hours
        });
        
        res.status(200).send({ 
          auth: true, 
          token: token,
          message: 'User registered successfully',
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }); 
    });
  });

  router.post('/login', function(req, res) {
    // Validate input
    if (!req.body.email || !req.body.password) {
      return res.status(400).send({auth: false, msg: 'Email and password are required.'});
    }

    // Always perform password comparison to prevent timing attacks
    // Use a dummy hash if user doesn't exist
    var dummyHash = '$2a$08$dummy.hash.to.prevent.timing.attacks.here';
    
    User.findOne({ email: req.body.email }, function (err, user) {
      if (err) {
        // Use dummy comparison to prevent timing difference
        bcrypt.compareSync(req.body.password, dummyHash);
        return res.status(500).send({auth: false, msg: 'Error on the server.'});
      }
      
      // Get password hash (use dummy if user doesn't exist)
      var passwordHash = user ? user.password : dummyHash;
      
      // Always perform password comparison (even if user doesn't exist)
      var passwordIsValid = bcrypt.compareSync(req.body.password, passwordHash);
      
      // Check if user exists AND password is valid
      if (!user || !passwordIsValid) {
        return res.status(401).send({ auth: false, msg: 'Invalid email or password.' });
      }
  
      // if user is found and password is valid
      // create a token
      var token = jwt.sign({ id: user._id }, config.secret, {
        expiresIn: 86400 // expires in 24 hours
      });
  
      // return the information including token as JSON
      res.status(200).send({ auth: true, token: token, loginUser: user.email, role: user.role});
    });
  
  });
  
  router.get('/logout', function(req, res) {
    res.status(200).send({ auth: false, token: null });
  });

  router.get('/me', VerifyToken, function(req, res, next) {

    User.findById(req.userId, { password: 0 }, function (err, user) {
      if (err) return res.status(500).send("There was a problem finding the user.");
      if (!user) return res.status(404).send("No user found.");
      res.status(200).send(user);
    });
  
  });

  // Create first superadmin - Only works if no superadmin exists
  router.post('/setup-superadmin', function(req, res) {
    // Check if any superadmin exists
    User.findOne({ role: 'superadmin' }, function (err, existingSuperAdmin) {
      if (err) {
        return res.status(500).send({ 
          status: false, 
          message: 'Error checking for superadmin' 
        });
      }
      
      if (existingSuperAdmin) {
        return res.status(403).send({ 
          status: false, 
          message: 'Superadmin already exists. Use /api/auth/create-user endpoint with superadmin token.' 
        });
      }
      
      // Input validation
      if (!req.body.name || !req.body.email || !req.body.password) {
        return res.status(400).send({ 
          status: false, 
          message: 'Name, email, and password are required' 
        });
      }
      
      // Trim and sanitize inputs
      var name = req.body.name.trim();
      var email = req.body.email.trim().toLowerCase();
      var password = req.body.password;
      
      // Validate name length
      if (name.length < 2 || name.length > 100) {
        return res.status(400).send({ 
          status: false, 
          message: 'Name must be between 2 and 100 characters' 
        });
      }
      
      // Validate email format
      var emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).send({ 
          status: false, 
          message: 'Please enter a valid email address' 
        });
      }
      
      // Validate password strength
      if (password.length < 8) {
        return res.status(400).send({ 
          status: false, 
          message: 'Password must be at least 8 characters long' 
        });
      }
      
      // Check for password complexity
      var hasUpperCase = /[A-Z]/.test(password);
      var hasLowerCase = /[a-z]/.test(password);
      var hasNumbers = /\d/.test(password);
      
      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        return res.status(400).send({ 
          status: false, 
          message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
        });
      }
      
      // Check if email already exists
      User.findOne({ email: email }, function (err, existingUser) {
        if (err) {
          return res.status(500).send({ 
            status: false, 
            message: 'Error checking email availability' 
          });
        }
        
        if (existingUser) {
          return res.status(400).send({ 
            status: false, 
            message: 'Email is already registered' 
          });
        }
        
        // Hash password
        var hashedPassword = bcrypt.hashSync(password, 8);
        
        // Create superadmin
        User.create({
          name: name,
          email: email,
          role: 'superadmin',
          password: hashedPassword
        }, function (err, user) {
          if (err) {
            if (err.code === 11000) {
              return res.status(400).send({ 
                status: false, 
                message: 'Email is already registered' 
              });
            }
            if (err.name === 'ValidationError') {
              var messages = Object.keys(err.errors).map(function(key) {
                return err.errors[key].message;
              }).join(', ');
              return res.status(400).send({ 
                status: false, 
                message: messages 
              });
            }
            return res.status(500).send({ 
              status: false, 
              message: 'There was a problem creating the superadmin' 
            });
          }
          
          // Create a token
          var token = jwt.sign({ id: user._id }, config.secret, {
            expiresIn: 86400 // expires in 24 hours
          });
          
          res.status(200).send({ 
            status: true, 
            message: 'Superadmin created successfully',
            auth: true,
            token: token,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              role: user.role
            }
          });
        });
      });
    });
  });

  // Update user role - Only superadmin can change roles
  router.put('/update-role', VerifyToken, VerifySuperAdmin, function(req, res) {
    if (!req.body.userId || !req.body.role) {
      return res.status(400).send({ 
        status: false, 
        message: 'userId and role are required' 
      });
    }

    // Validate role
    var validRoles = ['user', 'admin', 'superadmin'];
    if (!validRoles.includes(req.body.role)) {
      return res.status(400).send({ 
        status: false, 
        message: 'Invalid role. Must be one of: user, admin, superadmin' 
      });
    }

    // Prevent superadmin from changing their own role
    if (req.body.userId.toString() === req.userId.toString()) {
      return res.status(400).send({ 
        status: false, 
        message: 'You cannot change your own role' 
      });
    }

    User.findById(req.body.userId, function (err, user) {
      if (err) {
        return res.status(500).send({ 
          status: false, 
          message: 'Error finding user' 
        });
      }
      if (!user) {
        return res.status(404).send({ 
          status: false, 
          message: 'User not found' 
        });
      }

      // Update role
      user.role = req.body.role;
      user.save(function (err, updatedUser) {
        if (err) {
          return res.status(500).send({ 
            status: false, 
            message: 'Error updating user role' 
          });
        }
        res.status(200).send({ 
          status: true, 
          message: 'User role updated successfully',
          user: {
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role
          }
        });
      });
    });
  });

  // Create user - Only superadmin can create users
  router.post('/create-user', VerifyToken, VerifySuperAdmin, roleBasedRateLimit.createUserLimiter, function(req, res) {
    // Input validation - Check required fields
    if (!req.body.name || !req.body.email || !req.body.password) {
      return res.status(400).send({ 
        status: false, 
        message: 'Name, email, and password are required' 
      });
    }

    // Trim and sanitize inputs
    var name = req.body.name.trim();
    var email = req.body.email.trim().toLowerCase();
    var password = req.body.password;
    var role = req.body.role || 'user'; // Default to 'user' if not provided

    // Validate role
    var validRoles = ['user', 'admin', 'superadmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).send({ 
        status: false, 
        message: 'Invalid role. Must be one of: user, admin, superadmin' 
      });
    }

    // Validate name length
    if (name.length < 2 || name.length > 100) {
      return res.status(400).send({ 
        status: false, 
        message: 'Name must be between 2 and 100 characters' 
      });
    }

    // Validate email format
    var emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).send({ 
        status: false, 
        message: 'Please enter a valid email address' 
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).send({ 
        status: false, 
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Check for password complexity
    var hasUpperCase = /[A-Z]/.test(password);
    var hasLowerCase = /[a-z]/.test(password);
    var hasNumbers = /\d/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).send({ 
        status: false, 
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    // Check if email already exists
    User.findOne({ email: email }, function (err, existingUser) {
      if (err) {
        return res.status(500).send({ 
          status: false, 
          message: 'Error checking email availability' 
        });
      }
      
      if (existingUser) {
        return res.status(400).send({ 
          status: false, 
          message: 'Email is already registered' 
        });
      }

      // Hash password
      var hashedPassword = bcrypt.hashSync(password, 8);
      
      // Create user with specified role (only superadmin can create users)
      User.create({
        name: name,
        email: email,
        role: role,
        password: hashedPassword
      },
      function (err, user) {
        if (err) {
          // Handle duplicate email error
          if (err.code === 11000) {
            return res.status(400).send({ 
              status: false, 
              message: 'Email is already registered' 
            });
          }
          // Handle validation errors
          if (err.name === 'ValidationError') {
            var messages = Object.keys(err.errors).map(function(key) {
              return err.errors[key].message;
            }).join(', ');
            return res.status(400).send({ 
              status: false, 
              message: messages 
            });
          }
          return res.status(500).send({ 
            status: false, 
            message: 'There was a problem creating the user' 
          });
        }
        
        res.status(200).send({ 
          status: true, 
          message: 'User created successfully',
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }); 
    });
  });

  // Get list of users - Only admin and superadmin can access
  router.get('/users', VerifyToken, function(req, res) {
    // First verify the user is admin or superadmin
    User.findById(req.userId, function (err, currentUser) {
      if (err) {
        return res.status(500).send({ 
          status: false, 
          message: 'Error finding user.' 
        });
      }
      if (!currentUser) {
        return res.status(404).send({ 
          status: false, 
          message: 'User not found.' 
        });
      }
      
      // Check if user is admin or superadmin
      if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
        return res.status(403).send({ 
          status: false, 
          message: 'Access denied. Admin or Superadmin role required.' 
        });
      }

      // Get all users (excluding passwords)
      User.find({}, { password: 0 }, function (err, users) {
        if (err) {
          return res.status(500).send({ 
            status: false, 
            message: 'Error fetching users' 
          });
        }
        
        res.status(200).send({ 
          status: true, 
          count: users.length,
          users: users 
        });
      }).sort({ createdAt: -1 }); // Sort by newest first
    });
  });

  // Get user by email - Only admin and superadmin can access
  router.get('/user-by-email', VerifyToken, function(req, res) {
    if (!req.query.email) {
      return res.status(400).send({ 
        status: false, 
        message: 'Email parameter is required' 
      });
    }

    // Verify admin/superadmin role
    User.findById(req.userId, function (err, currentUser) {
      if (err) {
        return res.status(500).send({ 
          status: false, 
          message: 'Error finding user.' 
        });
      }
      if (!currentUser) {
        return res.status(404).send({ 
          status: false, 
          message: 'User not found.' 
        });
      }
      
      if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
        return res.status(403).send({ 
          status: false, 
          message: 'Access denied. Admin or Superadmin role required.' 
        });
      }

      // Sanitize email
      var email = req.query.email.trim().toLowerCase();

      User.findOne({ email: email }, { password: 0 }, function (err, user) {
        if (err) {
          return res.status(500).send({ 
            status: false, 
            message: 'Error finding user.' 
          });
        }
        if (!user) {
          return res.status(404).send({ 
            status: false, 
            message: 'User not found.' 
          });
        }
        res.status(200).send({ 
          status: true, 
          user: user 
        });
      });
    });
  });

  module.exports = router;