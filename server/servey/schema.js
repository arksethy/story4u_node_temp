var mongoose = require('mongoose');  

var schema = mongoose.Schema({
    title: String,
    choices: Array,
    totalVotes: Number
 });
 
module.exports = mongoose.model('Servey', schema, 'servey');