var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var Servey = require('./schema');
const User = require('../user/User');

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/create', function (req, res) {
  User.findOne({ email: req.body.user }, function (err, user) {
    if (err)
      return res.status(500).send({ auth: false, msg: 'Error on the server.' });
    if (!user)
      return res.status(404).send({ auth: false, msg: 'No user found.' });
    if (!(user.role === 'admin' || user.role === 'superAdmin'))
      return res
        .status(404)
        .send({ auth: false, msg: 'User should be admin or superAdmin.' });

    Servey.create(
      {
        title: req.body.title,
        choices: req.body.choices,
        totalVotes: 0,
        createdAt: new Date(),
      },
      function (err, id) {
        if (err)
          return res
            .status(500)
            .send('There was a problem in creating servey.');

        res.status(200).send({
          status: true,
          data: { id: id, action: 'create', msg: 'new servey has created' },
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

router.put('/Listings/:id', function (req, res) {
//   console.log('machind-d-------', machine.machineIdSync({ original: true }));
  let { totalvotes, choices } = req.body,
    // doc = {'$set':{totalvotes: totalvotes, 'choices.$.vote': choices[0].vote}}$inc: { 'foo.count': 1 }
    doc = { $inc: { totalVotes: 1, 'choices.$.vote': 1 } };

  Servey.update(
    { _id: req.params.id, 'choices.key': choices[0].key },
    doc,
    function (err, response) {
      if (err)
        res.json({
          message: 'Error in updating servey with id ' + req.params.id,
        });
      res.json(response);
    }
  );
});

module.exports = router;