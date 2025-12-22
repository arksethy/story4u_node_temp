var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var Satsang = require('./Schema');
const User = require('../user/User');
var VerifyToken = require('../auth/VerifyToken');
var { sanitizeHTML, sanitizeText, validateHTML, validateText } = require('../middleware/sanitize');

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/addUpdate', VerifyToken, function(req, res) {
    // Get authenticated user from token
    User.findById(req.userId, function (err, user) {
        if (err) return res.status(500).send({status: false, msg: 'Error on the server.'});
        if (!user) return res.status(404).send({status: false, msg: 'User not found.'});
        if (!(user.role ==='admin' || user.role ==='superadmin')) {
            return res.status(403).send({status: false, msg: 'User should be admin or superadmin.'});
        }

        // VALIDATE INPUT BEFORE ANY PROCESSING - REJECT IF INVALID
        const nameValidation = validateText(req.body.name);
        if (nameValidation && !nameValidation.isValid) {
            return res.status(400).send({ 
                status: false, 
                msg: nameValidation.errors.join(' ') 
            });
        }

        const descriptionValidation = validateHTML(req.body.description);
        if (descriptionValidation && !descriptionValidation.isValid) {
            return res.status(400).send({ 
                status: false, 
                msg: descriptionValidation.errors.join(' ') 
            });
        }

        // Only proceed with sanitization and saving if validation passes
        if(req.body.id){
            // First check if the satsang exists
            Satsang.findOne({_id: req.body.id}, function(err, satsang) {
                if (err) return res.status(500).send({ status: false, msg: 'Error in finding satsang.' });
                if (!satsang) return res.status(404).send({ status: false, msg: 'Satsang not found.' });
                
                // If user is not superadmin, check if they are the creator
                if (user.role !== 'superadmin' && satsang.userEmail !== user.email) {
                    return res.status(403).send({ status: false, msg: 'You can only update satsang that you created.' });
                }
                
                // Sanitize HTML content before storing (validation already passed)
                let doc = {'$set':{
                    description: sanitizeHTML(req.body.description), 
                    name: sanitizeText(req.body.name), // Name should be plain text
                    category: req.body.category,
                    updatedAt: new Date()
                }}
                
                // Add isDeleted to update if provided
                if (req.body.isDeleted !== undefined) {
                    doc.$set.isDeleted = req.body.isDeleted;
                }

                // Build query: superadmin can update any, admin can only update their own
                let query = {_id: req.body.id};
                if (user.role !== 'superadmin') {
                    query.userEmail = user.email;
                }

                Satsang.updateOne(query, doc, function(err, response){
                    if(err) return res.status(500).send({ status: false, msg: 'Error in updating satsang.' });
                    if(response.matchedCount === 0) {
                        return res.status(404).send({ status: false, msg: 'Satsang not found or you do not have permission to update it.' });
                    }
                    res.status(200).send({ status: true, action: 'update', msg: 'Satsang has been updated successfully.' });
                 });
            });

        }else{
            // Validate required fields for creation
            if (!req.body.name || !req.body.description || !req.body.category) {
                return res.status(400).send({ status: false, msg: 'Name, description, and category are required.' });
            }

            // Sanitize HTML content before storing (validation already passed)
            Satsang.create({
                name: sanitizeText(req.body.name), // Name should be plain text
                description: sanitizeHTML(req.body.description), // Description can contain HTML/iframes
                category: req.body.category,
                createdAt: new Date(),
                userEmail: user.email // Use authenticated user's email from token
              },
              function (err, satsang) {
                if (err) return res.status(500).send({ status: false, msg: 'There was a problem in adding satsang.' });
               
                res.status(200).send({ status: true, action: 'add', msg: 'Satsang has successfully added' });
              });
        }
    })  
     
  });

  router.post('/list', function(req, res) {
      let filter = req.body.category ? {category: req.body.category} : {}

    Satsang.find(filter, { userEmail: 0 }, function (err, satsang) {
        if (err) return res.status(500).send({ status: false, msg: "There was a problem with fetching the Satsang List." })
           
            res.status(200).send({ status: true, data: satsang });
    }).sort({createdAt:-1})
})

// Get archived satsang list - Requires authentication
router.post('/archived', VerifyToken, function(req, res) {
    // Get authenticated user from token
    User.findById(req.userId, function (err, user) {
        if (err) return res.status(500).send({status: false, msg: 'Error on the server.'});
        if (!user) return res.status(404).send({status: false, msg: 'User not found.'});
        
        // Filter for archived items (isDeleted === true)
        let filter = { isDeleted: true };
        if (req.body.category) {
            filter.category = req.body.category;
        }

        Satsang.find(filter, function (err, satsang) {
            if (err) return res.status(500).send({ status: false, msg: "There was a problem with fetching the archived Satsang List." })
               
            res.status(200).send({ status: true, data: satsang });
        }).sort({createdAt:-1});
    });
})

router.get('/:id', function(req, res) {

    Satsang.find({_id: req.params.id}, function (err, satsang) {
        if (err) return res.status(500).send("There was a problem with fetching the satsang.")
           
            res.status(200).send({ status: true, data: satsang });

    })
})

router.post('/delete', VerifyToken, function(req, res) {
    // Validate required field
    if (!req.body.id) {
        return res.status(400).send({ status: false, msg: 'Satsang ID is required.' });
    }

    // Get authenticated user from token
    User.findById(req.userId, function (err, user) {
        if (err) return res.status(500).send({ status: false, msg: 'Error on the server.' });
        if (!user) return res.status(404).send({ status: false, msg: 'User not found.' });
        if (user.role !== 'superadmin') {
            return res.status(403).send({ status: false, msg: 'Only superadmin can delete satsang.' });
        }

        // Check if satsang exists
        Satsang.findOne({_id: req.body.id}, function(err, satsang) {
            if (err) return res.status(500).send({ status: false, msg: 'Error in finding satsang.' });
            if (!satsang) return res.status(404).send({ status: false, msg: 'Satsang not found.' });

            // Delete the satsang
            Satsang.deleteOne({_id: req.body.id}, function (err, result) {
                if (err) return res.status(500).send({ status: false, msg: 'There was a problem with removing the satsang.' });
                if (result.deletedCount === 0) {
                    return res.status(404).send({ status: false, msg: 'Satsang not found.' });
                }
                res.status(200).send({ status: true, msg: 'Satsang has been deleted successfully.' });
            });
        });
    });
})

  module.exports = router;