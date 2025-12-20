var mongoose = require('mongoose');  

var schema = new mongoose.Schema({  
    name: String,
    description: String,
    category: Number,
    createdAt: Date,
    updatedAt: Date,
    userEmail: String,
    isDeleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Satsang', schema, 'satsang');
