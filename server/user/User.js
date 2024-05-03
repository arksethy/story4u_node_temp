var mongoose = require('mongoose');  

var UserSchema = new mongoose.Schema({  
  name: String,
  email: String,
  password: String,
  role: String
});
var User = mongoose.model('User', UserSchema, 'User');

module.exports = User;
