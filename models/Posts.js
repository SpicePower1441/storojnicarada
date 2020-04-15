const mongoose = require('mongoose');
const marked = require('marked');
const slugify = require('slugify');
const createDomPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const dompurify = createDomPurify(new JSDOM().window);

const postsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    markdown: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    sanitizedHtml: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    createdBy: {
        type: String,
        required: true
    },
    categories: {
        type: String,
        required: true
    },
    catSlug: {
        type: String,
        required: true
    },
    comments: [{
        username: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        comment: {
            type: String,
            required: true
        },
        postedAt: {
            type: Date,
            default: Date.now
        }
    }]
});

postsSchema.pre('validate', function(next) {
    if (this.title) {
        this.slug = slugify(this.title, { lower: true, strict: true })
    }

    if (this.markdown) {
        this.sanitizedHtml = dompurify.sanitize(marked(this.markdown))
    }

    next()
});

module.exports = mongoose.model('Posts', postsSchema);