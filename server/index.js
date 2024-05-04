var express = require('express');
var bodyParser = require('body-parser')
var cors = require('cors');
var AuthController = require('./auth/AuthController');
const controller = require("./file/controller");
const GifController = require("./gif/Controller");
const SatsangController = require("./satsang/Controller");
var db = require('./db');
var mongoose = require('mongoose');
var path = require('path');


var dir = path.join(__dirname, 'resources/static/assets/uploads');

global.__basedir = __dirname;


global.__root   = __dirname + '/'; 





// import {machineId, machineIdSync} from 'node-machine-id';
var machine = require('node-machine-id');



var app = express();
app.use(cors());
app.use('/resources/static/assets/uploads', express.static(dir));


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

//for testing porpose
app.get('/', (req, res)=>{
   res.status(200).send('home page')
})
app.use('/api/auth', AuthController);
app.post("/upload", controller.upload);
app.get("/files", controller.getListFiles);
app.get("/files/:name", controller.download);
app.use('/gif', GifController);
app.use('/satsang', SatsangController);







var personSchema = mongoose.Schema({
    title: String,
    choices: Array,
    totalVotes: Number
 });
 
 var Person = mongoose.model("Person", personSchema);

app.post('/createServey', function(req, res){    
     
     var doc = new Person(req.body);
     doc.save(function (err) {
        // if (err) return handleError(err);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('New Servey created !');
      });
 });

app.get('/data', function(req, res){
    Person.find(function(err, response){
       if (err) return handleError(err);
       res.json(response);
    });
 });

 app.get('/Listings', function(req, res){
    Person.find({}, 'title', function(err, response){
    //    if (err) return handleError(err); 
       res.json(response);
    });
 });

 app.get('/Listings/:id', function(req, res){
    Person.findById(req.params.id, function(err, response){
    //    if (err) return handleError(err); 
       res.json(response);
    });
 });

 app.put('/Listings/:id', function(req, res){
     console.log('machind-d-------',machine.machineIdSync({original: true}));
     let {totalvotes, choices} = req.body,
        // doc = {'$set':{totalvotes: totalvotes, 'choices.$.vote': choices[0].vote}}$inc: { 'foo.count': 1 } 
        doc = {'$inc':{totalVotes: 1, 'choices.$.vote': 1}}

    Person.update({_id: req.params.id, 'choices.key': choices[0].key}, doc, function(err, response){
       if(err) res.json({message: "Error in updating person with id " + req.params.id});
       res.json(response);
    });
 });


 app.listen(8080, () => console.log(`Started server at http://localhost:8080!`));
