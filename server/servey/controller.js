var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var rateLimit = require('express-rate-limit');
var Servey = require('./schema');
const User = require('../user/User');
var VerifyToken = require('../auth/VerifyToken');
var { sanitizeHTML, sanitizeText } = require('../middleware/sanitize');

// Rate limiter for voting (public endpoint - unauthenticated users)
// Uses IP + User-Agent for better tracking
const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP+UserAgent to 30 votes per minute (increased for 100k users)
  message: 'Too many votes, please try again later.',
  keyGenerator: function(req) {
    // Use IP + User-Agent to better distinguish users behind same IP
    const userAgent = req.get('user-agent') || 'unknown';
    return req.ip + ':' + userAgent.substring(0, 50);
  }
});

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/create', VerifyToken, function (req, res) {
  // Get authenticated user from token
  User.findById(req.userId, function (err, user) {
    if (err)
      return res.status(500).send({ status: false, msg: 'Error on the server.' });
    if (!user)
      return res.status(404).send({ status: false, msg: 'User not found.' });
    if (!(user.role === 'admin' || user.role === 'superadmin'))
      return res
        .status(403)
        .send({ status: false, msg: 'User should be admin or superadmin.' });

    // Validate required fields
    if (!req.body.title) {
      return res.status(400).send({ status: false, msg: 'Title is required.' });
    }
    if (!req.body.choices || !Array.isArray(req.body.choices) || req.body.choices.length < 2) {
      return res.status(400).send({ status: false, msg: 'At least 2 choices are required.' });
    }

    // Sanitize choices array (each choice object might have text fields)
    var sanitizedChoices = req.body.choices.map(function(choice) {
      var sanitized = {};
      // Sanitize each field in the choice object
      for (var key in choice) {
        if (choice.hasOwnProperty(key)) {
          // If it's a text field, sanitize it; otherwise keep as is
          if (typeof choice[key] === 'string') {
            sanitized[key] = sanitizeText(choice[key]); // Survey choices should be plain text
          } else {
            sanitized[key] = choice[key];
          }
        }
      }
      return sanitized;
    });

    Servey.create(
      {
        title: sanitizeText(req.body.title), // Title should be plain text
        choices: sanitizedChoices, // Sanitized choices
        totalVotes: 0,
        createdAt: new Date(),
      },
      function (err, servey) {
        if (err)
          return res
            .status(500)
            .send({ status: false, msg: 'There was a problem in creating servey.' });

        res.status(200).send({
          status: true,
          data: { id: servey._id, action: 'create', msg: 'new servey has created' },
        });
      }
    );
  });
});

// app.get('/data', function (req, res) {
//   Person.find(function (err, response) {
//     if (err) return handleError(err);
//     res.json(response);
//   });
// });

router.get('/Listings', function (req, res) {
  Servey.find({}, 'title', function (err, response) {
    //    if (err) return handleError(err);
    res.json(response);
  });
});

router.get('/Listings/:id', function (req, res) {
  Servey.findById(req.params.id, function (err, response) {
    //    if (err) return handleError(err);
    res.json(response);
  });
});

// Public endpoint - no authentication required (anyone can vote)
router.put('/Listings/:id', voteLimiter, function (req, res) {
  // Validate required fields
  if (!req.body.choices || !Array.isArray(req.body.choices) || req.body.choices.length === 0) {
    return res.status(400).send({ status: false, msg: 'Choices array with at least one choice is required.' });
  }

  // Validate survey ID
  if (!req.params.id) {
    return res.status(400).send({ status: false, msg: 'Survey ID is required.' });
  }

  // First check if survey exists
  Servey.findById(req.params.id, function (err, survey) {
    if (err) {
      return res.status(500).send({ status: false, msg: 'Error in finding survey.' });
    }
    if (!survey) {
      return res.status(404).send({ status: false, msg: 'Survey not found.' });
    }

    // Validate that the choice key exists in the survey
    var choiceKey = req.body.choices[0].key;
    var validChoice = survey.choices.some(function(choice) {
      return choice.key === choiceKey;
    });

    if (!validChoice) {
      return res.status(400).send({ status: false, msg: 'Invalid choice key.' });
    }

    // Update vote count
    let doc = { $inc: { totalVotes: 1, 'choices.$.vote': 1 } };

    Servey.updateOne(
      { _id: req.params.id, 'choices.key': choiceKey },
      doc,
      function (err, response) {
        if (err) {
          return res.status(500).send({ status: false, msg: 'Error in updating survey.' });
        }
        if (response.matchedCount === 0) {
          return res.status(404).send({ status: false, msg: 'Survey or choice not found.' });
        }
        res.status(200).send({ status: true, msg: 'Vote recorded successfully.' });
      }
    );
  });
});

module.exports = router;