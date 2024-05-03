var mongoose = require('mongoose');

//Set up default mongoose connection
// var mongoDB = 'mongodb://127.0.0.1/my_database';
// var uri = `mongodb+srv://user1:adx670A@cluster0.swyg7.mongodb.net/myproduct?retryWrites=true&w=majority`;
// var uri = `mongodb+srv://story4uinfo:gFGG8RkzfHmP5bZz@cluster0.qikvxzr.mongodb.net/story4u?retryWrites=true&w=majority`;
// var uri = `mongodb+srv://ark:arksethy@atlascluster.nnlmylv.mongodb.net/story4u?retryWrites=true&w=majority`;
var uri = `mongodb+srv://story4uinfo:gFGG8RkzfHmP5bZz@cluster0.qikvxzr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(uri, {useNewUrlParser: true, dbName: 'story4u',  useUnifiedTopology: true})
.then(()=>console.log('connection successful'))
.catch(()=>console.log('no connection'));

//user - ark
//pass - arksethy

//mongodb+srv://ark:<password>@atlascluster.nnlmylv.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster
//mongodb+srv://ark:<password>@atlascluster.nnlmylv.mongodb.net/
// Get the default connection
// var db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// var uri = `mongodb+srv://user1:adx670A@cluster0.swyg7.mongodb.net/myproduct?retryWrites=true&w=majority`;

// mongoose.connect(uri);