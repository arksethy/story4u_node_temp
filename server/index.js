require('dotenv').config();
var express = require('express');
var bodyParser = require('body-parser')
var cors = require('cors');
var AuthController = require('./auth/AuthController');
const controller = require("./file/controller");
const GifController = require("./gif/Controller");
const SatsangController = require("./satsang/Controller");
const ServeyController = require("./servey/controller");
var db = require('./db');
var mongoose = require('mongoose');
var path = require('path');


var dir = path.join(__dirname, 'resources/static/assets/uploads');

global.__basedir = __dirname;


global.__root   = __dirname + '/'; 





// import {machineId, machineIdSync} from 'node-machine-id';
var machine = require('node-machine-id');



var app = express();

// Configure CORS with environment variable
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};
app.use(cors(corsOptions));

app.use('/resources/static/assets/uploads', express.static(dir));


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

//for testing porpose
app.get('/', (req, res)=>{
   res.status(200).send('this is our home page')
})

app.use('/api/auth', AuthController);
app.post("/upload", controller.upload);
app.get("/files", controller.getListFiles);
app.get("/files/:name", controller.download);
app.use('/gif', GifController);
app.use('/satsang', SatsangController);
app.use('/servey', ServeyController);


const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});