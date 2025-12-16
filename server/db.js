var mongoose = require('mongoose');

// Use environment variable for MongoDB URI, fallback to default for local development
var uri = process.env.MONGODB_URI;

mongoose.connect(uri, {
  useNewUrlParser: true, 
  dbName: 'story4u',  
  useUnifiedTopology: true
})
.then(() => console.log('connection successful'))
.catch((err) => console.log('no connection', err));

//user - ark
//pass - arksethy

//mongodb+srv://ark:<password>@atlascluster.nnlmylv.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster
//mongodb+srv://ark:<password>@atlascluster.nnlmylv.mongodb.net/
// Get the default connection
// var db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// var uri = `mongodb+srv://user1:adx670A@cluster0.swyg7.mongodb.net/myproduct?retryWrites=true&w=majority`;

// mongoose.connect(uri);