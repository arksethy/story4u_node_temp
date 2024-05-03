var mongoose = require('mongoose');  

var GifSchema = new mongoose.Schema({  
    name: String,
    gifInstance : Object,
    outerFile: String,
    audio: String,
    userEmail: String,
    role: String
  
});
var Gif = mongoose.model('Gif', GifSchema);

module.exports = Gif;
