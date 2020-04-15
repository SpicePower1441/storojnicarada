var mongoose = require('mongoose');

// Category Schema
var CategoriesSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String
    }
});

var Categories = module.exports = mongoose.model('Categories', CategoriesSchema);