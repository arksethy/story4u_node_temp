var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var Gif = require('./Gif');
const User = require('../user/User');
var VerifyToken = require('../auth/VerifyToken');
var { sanitizeHTML, sanitizeText } = require('../middleware/sanitize');

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/addUpdate', VerifyToken, function(req, res) {
    // Get authenticated user from token
    User.findById(req.userId, function (err, user) {
        if (err) return res.status(500).send({status: false, msg: 'Error on the server.'});
        if (!user) return res.status(404).send({status: false, msg: 'User not found.'});

        if(req.body.gifId){
            // Validate required fields for update
            if (!req.body.gifId) {
                return res.status(400).send({ status: false, msg: 'Gif ID is required for update.' });
            }

            // First check if the gif exists
            Gif.findOne({_id: req.body.gifId}, function(err, existingGif) {
                if (err) return res.status(500).send({ status: false, msg: 'Error in finding gif.' });
                if (!existingGif) return res.status(404).send({ status: false, msg: 'Gif not found.' });
                
                // If user is not superadmin, check if they are the creator
                if (user.role !== 'superadmin' && existingGif.userEmail !== user.email) {
                    return res.status(403).send({ status: false, msg: 'You can only update gif that you created.' });
                }

                // Sanitize HTML content before storing
                let doc = {'$set':{
                    gifInstance: sanitizeHTML(req.body.gifInstance), // Can contain HTML/iframes
                    name: sanitizeText(req.body.name), // Name should be plain text
                    outerFile: sanitizeText(req.body.outerFile), // URL should be plain text
                    audio: sanitizeText(req.body.audio) // URL should be plain text
                }}

                // Build query: superadmin can update any, regular users can only update their own
                let query = {_id: req.body.gifId};
                if (user.role !== 'superadmin') {
                    query.userEmail = user.email;
                }

                Gif.updateOne(query, doc, function(err, response){
                    if(err) return res.status(500).send({ status: false, msg: 'Error in updating gif.' });
                    if(response.matchedCount === 0) {
                        return res.status(404).send({ status: false, msg: 'Gif not found or you do not have permission to update it.' });
                    }
                    res.status(200).send({ status: true, action: 'update', msg: 'Gif is updated' });
                 });
            });

        }else{
            // Validate required fields for creation
            if (!req.body.name) {
                return res.status(400).send({ status: false, msg: 'Name is required.' });
            }

            // Sanitize HTML content before storing
            Gif.create({
                name: sanitizeText(req.body.name), // Name should be plain text
                gifInstance: sanitizeHTML(req.body.gifInstance), // Can contain HTML/iframes
                outerFile: sanitizeText(req.body.outerFile), // URL should be plain text
                audio: sanitizeText(req.body.audio), // URL should be plain text
                userEmail: user.email, // Use authenticated user's email from token
                role: user.role
              },
              function (err, gif) {
                if (err) return res.status(500).send({ status: false, msg: 'There was a problem creating the Gif.' });
               
                res.status(200).send({ status: true, action: 'add', msg: 'Gif is created' });
              });
        }
    })  
     
  });

  // Public endpoint - no authentication required
  router.post('/list', function(req, res) {
    // If user email is provided, filter by it, otherwise return all
    let filter = req.body.user ? {userEmail: req.body.user} : {};

    Gif.find(filter, function (err, gif) {
        if (err) return res.status(500).send({ status: false, msg: "There was a problem with fetching the Gif List." });
           
        res.status(200).send({ status: true, data: gif });
    }).sort({ createdAt: -1 }); // Sort by newest first
})

router.get('/:id', function(req, res) {

    Gif.find({_id: req.params.id}, function (err, gif) {
        if (err) return res.status(500).send("There was a problem with fetching the Gif.")
           
            res.status(200).send({ status: true, data: gif });

    })
})

  module.exports = router;