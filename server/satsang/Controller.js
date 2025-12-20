var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var Satsang = require('./Schema');
const User = require('../user/User');

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/addUpdate', function(req, res) {
    User.findOne({ email: req.body.user }, function (err, user) {
        if (err) return res.status(500).send({auth: false, msg: 'Error on the server.'});
        if (!user) return res.status(404).send({auth: false, msg: 'No user found.'});
        if (!(user.role ==='admin' || user.role ==='superadmin')) return res.status(404).send({auth: false, msg: 'User should be admin or superadmin.'});

        if(req.body.id){
            // First check if the satsang exists and verify the user is the creator
            Satsang.findOne({_id: req.body.id}, function(err, satsang) {
                if (err) return res.status(500).send({ status: false, msg: 'Error in finding satsang.' });
                if (!satsang) return res.status(404).send({ status: false, msg: 'Satsang not found.' });
                
                // Check if the current user is the creator of this satsang
                if (satsang.userEmail !== req.body.user) {
                    return res.status(403).send({ status: false, msg: 'You can only update satsang that you created.' });
                }
                
                let doc = {'$set':{description: req.body.description, 
                                   name: req.body.name,
                                   category: req.body.category,
                                   updatedAt: new Date()
                                }}
                
                // Add isDeleted to update if provided
                if (req.body.isDeleted !== undefined) {
                    doc.$set.isDeleted = req.body.isDeleted;
                }

                Satsang.updateOne({_id: req.body.id, userEmail: req.body.user}, doc, function(err, response){
                    if(err) return res.status(500).send({ status: false, msg: 'Error in updating satsang.' });
                    if(response.matchedCount === 0) {
                        return res.status(404).send({ status: false, msg: 'Satsang not found or you do not have permission to update it.' });
                    }
                    res.status(200).send({ status: true, action: 'update', msg: 'Satsang has been updated successfully.' });
                 });
            });

        }else{
            Satsang.create({
                name: req.body.name,
                description: req.body.description,
                category: req.body.category,
                createdAt: new Date(),
                userEmail: req.body.user
              },
              function (err, user) {
                if (err) return res.status(500).send("There was a problem in adding satsang.")
               
                res.status(200).send({ status: true, action: 'add', msg: 'Satsang has successfully added' });
              });
        }
    })  
     
  });

  router.post('/list', function(req, res) {
      let filter = req.body.category ? {category: req.body.category} : {}

    Satsang.find(filter, function (err, satsang) {
        if (err) return res.status(500).send("There was a problem with fetching the Satsang List.")
           
            res.status(200).send({ status: true, data: satsang });
    }).sort({createdAt:-1})
})

router.get('/:id', function(req, res) {

    Satsang.find({_id: req.params.id}, function (err, satsang) {
        if (err) return res.status(500).send("There was a problem with fetching the satsang.")
           
            res.status(200).send({ status: true, data: satsang });

    })
})

router.post('/delete', function(req, res) {
    // First verify the user exists and has superadmin role
    User.findOne({ email: req.body.user }, function (err, user) {
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