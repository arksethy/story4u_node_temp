var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var Gif = require('./Gif');
const User = require('../user/User');

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/addUpdate', function(req, res) {
    User.findOne({ email: req.body.user }, function (err, user) {
        if (err) return res.status(500).send({auth: false, msg: 'Error on the server.'});
        if (!user) return res.status(404).send({auth: false, msg: 'No user found.'});

        if(req.body.gifId){
        let doc = {'$set':{gifInstance: req.body.gifInstance, 
                           name: req.body.name,
                           outerFile: req.body.outerFile,
                           audio: req.body.audio
                        }}

            Gif.update({_id: req.body.gifId, userEmail: req.body.user}, doc, function(err, response){
                if(err) res.json({message: "Error in updating gif with id " + req.body.gifId});
                res.status(200).send({ status: true, action: 'update', msg: 'Gif is updated' });
             });

        }else{
            Gif.create({
                name: req.body.name,
                gifInstance: req.body.gifInstance,
                outerFile: req.body.outerFile,
                audio: req.body.audio,
                userEmail: req.body.user,
                role: user.role
              },
              function (err, user) {
                if (err) return res.status(500).send("There was a problem creating the Gif.")
               
                res.status(200).send({ status: true, action: 'add', msg: 'Gif is created' });
              });
        }
    })  
     
  });

  router.post('/list', function(req, res) {

    Gif.find({userEmail: req.body.user}, function (err, gif) {
        if (err) return res.status(500).send("There was a problem with fetching the Gif List.")
           
            res.status(200).send({ status: true, data: gif });

    })
})

router.get('/:id', function(req, res) {

    Gif.find({_id: req.params.id}, function (err, gif) {
        if (err) return res.status(500).send("There was a problem with fetching the Gif.")
           
            res.status(200).send({ status: true, data: gif });

    })
})

  module.exports = router;