var express = require('express');
var router = express.Router();
var Posts = require('../models/Posts');
var Categories = require('../models/Categories');
var Album = require('../models/Album');
var ObjectId = require('mongodb').ObjectID;
var passport = require('passport');
var bcrypt = require('bcryptjs');

// GET Admin Model
var Admin = require('../models/Admins');

// GET Home page
router.get('/', async function (req, res, next) {
    const posts = await Posts.find().sort({createdAt: 'desc'});
    const AllPosts = await Posts.find().sort({createdAt: 'desc'});
    const categories = await Categories.find();
    const gallery = await Album.find();

    res.render('user/index', {posts: posts, categories: categories, AllPosts: AllPosts, gallery: gallery, title: "Головна сторінка"});
});

// GET info page
router.get('/info-page', async function (req, res, next) {
    const posts = await Posts.find().sort({createdAt: 'desc'});
    const AllPosts = await Posts.find().sort({createdAt: 'desc'});
    const categories = await Categories.find();
    const gallery = await Album.find();
    res.render('user/info_page', {posts: posts, categories: categories, AllPosts: AllPosts, gallery: gallery, title: "Головна сторінка"});
});

// GET gallery
router.get('/gallery', async function (req, res, next) {
    const posts = await Posts.find().sort({createdAt: 'desc'});
    const AllPosts = await Posts.find().sort({createdAt: 'desc'});
    const categories = await Categories.find();
    const gallery = await Album.find();

    res.render('user/gallery', {posts: posts, categories: categories, AllPosts: AllPosts, gallery: gallery, title: "Галерея"});
});

// GET album
router.get('/gallery/album/:slug', async function (req, res, next) {
    const posts = await Posts.find().sort({createdAt: 'desc'});
    const AllPosts = await Posts.find().sort({createdAt: 'desc'});
    const categories = await Categories.find();
    const gallery = await Album.findOne({slug: req.params.slug});

    if (! gallery){
        res.redirect('/gallery');
    }

    res.render('user/album', {posts: posts, categories: categories, AllPosts: AllPosts, gallery: gallery, title: gallery.title});
});

// GET search
router.get('/search', async (req, res) => {
    const categories = await Categories.find();
    const AllPosts = await Posts.find().sort({createdAt: 'desc'});
    const gallery = await Album.find();

    var noMatch = null;

    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Posts.find({$or: [{title: regex,}, {description: regex}, {createdBy: regex}, {categories: regex}]})
            .sort({createdAt: 'desc'})
            .exec(function (err, posts) {
                Posts.count({$or: [{title: regex,}, {description: regex}, {createdBy: regex}, {categories: regex}]}).exec(function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        if (posts.length < 1) {
                            req.flash('danger', 'По вашому запиту нічого не знайдено!');
                            res.redirect("/");
                        }
                        res.render("user/search", {
                            posts: posts, categories: categories, noMatch: noMatch, AllPosts: AllPosts, gallery: gallery, title: "Пошук"
                        });
                    }
                })
            });
    }
});

/* GET news page + pagination */
router.get('/news', async function (req, res, next) {
    const categories = await Categories.find();
    const AllPosts = await Posts.find().sort({createdAt: 'desc'});
    const gallery = await Album.find();

    Posts.find({})
        .sort({createdAt: 'desc'})
        .exec(function (err, posts) {
            Posts.count().exec(function (err, count) {
                if (err) return next(err);
                res.render('user/news', {
                    posts: posts,
                    categories: categories,
                    AllPosts: AllPosts,
                    gallery: gallery,
                    title: "Новини"
                })
            })
        })
});

/* GET news page by categories + pagination */
router.get('/news/category/:categories', async function (req, res, next) {
    const categories = await Categories.find();
    const AllPosts = await Posts.find().sort({createdAt: 'desc'});
    const gallery = await Album.find();

    var category = req.params.categories;

    Posts.find({catSlug: category})
        .sort({createdAt: 'desc'})
        .exec(function (err, posts) {
            Posts.count().exec(function (err, count) {
                if (err) return next(err);
                res.render('user/newsByCategory', {
                    posts: posts,
                    categories: categories,
                    AllPosts: AllPosts,
                    gallery: gallery,
                    title: ucFirst(category).replace(/-/g, ' ')
                })
            })
        })
});


// GET Post info
router.get('/news/:slug', async (req, res) => {
    const postsSlug = await Posts.findOne({slug: req.params.slug});
    const AllPosts = await Posts.find().sort({createdAt: 'desc'});
    const categories = await Categories.find();
    const gallery = await Album.find();
    const posts = await Posts.find().sort({createdAt: 'desc'});

    if (! postsSlug){
        res.redirect('/news');
    }

    if (posts == null) res.redirect('/news');
    res.render('user/single_news', {posts: posts, categories: categories, AllPosts: AllPosts, gallery: gallery, title: postsSlug.title, postsSlug:postsSlug});
});

// Get contact page
router.get('/contact-us', async (req, res) => {
    const AllPosts = await Posts.find().sort({createdAt: 'desc'});
    const categories = await Categories.find();
    const posts = await Posts.find().sort({createdAt: 'desc'});

    res.render('user/contacts', {categories: categories, AllPosts: AllPosts, title: 'Контакти', posts: posts});
});

// Comment
router.post('/news/:slug/comment', async (req, res) => {

    var comment_id = ObjectId();

    Posts.findOne({_id: req.body.posts_id}, (err, posts) => {
        if (err) {
            return console.log(err);
        } else {
            posts.comments.push({
                username: req.body.username,
                email: req.body.email,
                comment: req.body.comment,
                _id: comment_id
            });
            posts.save();
            req.flash('success', 'Ваш коментар успішно доданий!');
            res.redirect('/news/' + req.params.slug);
        }
    });

});

// GET Register
// router.get('/register', async function (req, res, next) {
//     const categories = await Categories.find();
//     const AllPosts = await Posts.find().sort({createdAt: 'desc'});
//     const posts = await Posts.find().sort({createdAt: 'desc'});
//     res.render('register', {
//         title: 'Реєстрація',
//         categories: categories,
//         AllPosts: AllPosts,
//         posts: posts
//     });
// });

// POST Register
// router.post('/register', function (req, res, next) {
//     var username = req.body.username;
//     var email = req.body.email;
//     var password = req.body.password;
//     var password2 = req.body.password2;
//
//     Admin.findOne({username: username}, function (err, user) {
//         if (err) console.log(err);
//         if (user) {
//             res.redirect('/register');
//         } else {
//             var user = new Admin({
//                 username: username,
//                 email: email,
//                 password: password,
//                 admin: 0
//             });
//
//             bcrypt.genSalt(10, function (err, salt) {
//                 bcrypt.hash(user.password, salt, function (err, hash) {
//                     if (err) console.log(err);
//                     user.password = hash;
//                     user.save(function (err) {
//                         if (err) {
//                             console.log(err);
//                         } else {
//                             res.redirect('/login');
//                         }
//                     });
//                 });
//             });
//         }
//     });
// });

// GET Login
router.get('/login', async function (req, res, next) {
    const categories = await Categories.find();
    const AllPosts = await Posts.find().sort({createdAt: 'desc'});
    if (res.locals.user) res.redirect('/');
    const posts = await Posts.find().sort({createdAt: 'desc'});

    res.render('login', {
        title: 'Вхід',
        categories: categories,
        AllPosts: AllPosts,
        posts: posts
    });
});

// POST Login
router.post('/login', function (req, res, next) {
    passport.authenticate('local', {
        successRedirect: '/admin/dashboard',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
});

// GET Logout
router.get('/logout', function (req, res, next) {
    req.logout();
    req.flash('success', 'Ви вийшли з облікового запису!');
    res.redirect('/');
});

// Special function
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

function ucFirst(str) {
    if (!str) return str;

    return str[0].toUpperCase() + str.slice(1);
}

module.exports = router;
