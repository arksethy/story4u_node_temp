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
        if (!(user.role ==='admin' || user.role ==='superAdmin')) return res.status(404).send({auth: false, msg: 'User should be admin or superAdmin.'});

        if(req.body.id){
        let doc = {'$set':{description: req.body.description, 
                           name: req.body.name,
                           category: req.body.category,
                           updatedAt: new Date()
                        }}

            Satsang.update({_id: req.body.id, userEmail: req.body.user}, doc, function(err, response){
                if(err) res.json({message: "Error in updating satsang with id " + req.body.id});
                res.status(200).send({ status: true, action: 'update', msg: 'Satsang has updated' });
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
               
                res.status(200).send({ status: true, action: 'add', msg: 'Satsang has added' });
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

    Satsang.remove({_id: req.body.id}, function (err, satsang) {
        if (err) return res.status(500).send("There was a problem with removing the satsang.")
           
            res.status(200).send({ success: true });

    })
})

  module.exports = router;