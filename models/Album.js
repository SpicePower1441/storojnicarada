var mongoose = require('mongoose');

// Category Schema
var AlbumSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    postedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: String,
        required: true
    },
    photos: [{
        image: {
            type: String
        }
    }]
});

var Album = module.exports = mongoose.model('Album', AlbumSchema);