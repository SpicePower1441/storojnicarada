var express = require('express');
var router = express.Router();
var Posts = require('../models/Posts');
var Admin = require('../models/Admins');
var Categories = require('../models/Categories');
var Album = require('../models/Album');
var ObjectId = require('mongodb').ObjectID;
var fs = require('fs-extra');
var mkdirp = require('mkdirp');
var auth = require('../config/auth');
var isAdmin = auth.isAdmin;
var resizeImg = require('resize-img');


/* GET home page. */
router.get('/', isAdmin, async function (req, res, next) {
    Posts.find({})
        .sort({createdAt: 'desc'})
        .exec(function (err, posts) {
            Posts.count().exec(function (err, count) {
                if (err) return next(err);
                res.render('admin/dashboard', {
                    posts: posts,
                })
            })
        })

});

// GET search
router.get('/search', isAdmin, async (req, res) => {
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
                            res.redirect("/admin/dashboard");
                        }
                        res.render("admin/admin_search", {
                            posts: posts,
                            noMatch: noMatch,
                            title: "Пошук"
                        });
                    }
                })
            });
    }
});

// GET new post
router.get('/post/add-post', isAdmin, (req, res) => {

    Categories.find(function (err, categories) {
        res.render('admin/add_post', {
            posts: new Posts(),
            categories: categories
        });
    });

});

// GET categories
router.get('/categories', isAdmin, (req, res) => {
    Categories.find(function (err, categories) {
        if (err) return console.log(err);
        res.render('admin/categories', {
            categories: categories
        });
    });
});

// Post new category
router.post('/categories/add-category', (req, res) => {
    var title = req.body.title;
    var slug = title.replace(/\s+/g, '-').toLowerCase();

    Categories.findOne({slug: slug}, function (err, category) {
        if (category) {
            req.flash('danger', 'Така назва вже існує!');
            res.redirect('/admin/dashboard/categories');
        } else {
            var category = new Categories({
                title: title,
                slug: slug
            });
            category.save(function (err) {
                if (err) return console.log(err);

                Categories.find(function (err, categories) {
                    if (err) {
                        console.log(err);
                    } else {
                        req.app.locals.categories = categories;
                    }
                });
                req.flash('success', 'Категорія успішно додана!');
                res.redirect('/admin/dashboard/categories');
            });
        }
    });
});


// POST new post
router.post('/post/add-post', async (req, res, next) => {

    var imageFile = typeof req.files.image !== "undefined" ? req.files.image.name : "";

    var title = req.body.title;
    var description = req.body.description;
    var markdown = req.body.markdown;
    var createdBy = req.user.username;
    var categories = req.body.categories;
    var catSlug = categories.replace(/\s+/g, '-').toLowerCase();

    var posts = new Posts({
        title: title,
        description: description,
        markdown: markdown,
        image: imageFile,
        createdBy: createdBy,
        categories: categories,
        catSlug: catSlug,
    });
    posts.save(function (err) {
        if (err) return console.log(err);

        mkdirp('public/images/' + posts._id, function (err) {
            return console.log(err);
        });

        if (imageFile != "") {
            var productImage = req.files.image;
            var path = 'public/images/' + posts._id + '/' + imageFile;

            productImage.mv(path, function (err) {
                return console.log(err);
            });
        }

        req.flash('success', 'Новина успішно додана!');
        res.redirect('/admin/dashboard');
    });

});

// GET Edit post
router.get('/post/edit-post/:id', isAdmin, async (req, res, next) => {

    Categories.find(function (err, categories) {

        Posts.findById(req.params.id, function (err, p) {
            if (err) {
                console.log(err);
                res.redirect('/admin/dashboard');
            } else {
                var galleryDir = 'public/images/' + p._id;
                var galleryImages = null;

                fs.readdir(galleryDir, function (err, files) {
                    if (err) {
                        console.log(err);
                    } else {
                        galleryImages = files;

                        res.render('admin/edit_post', {
                            title: p.title,
                            description: p.description,
                            markdown: p.markdown,
                            categories: categories,
                            image: p.image,
                            galleryImages: galleryImages,
                            id: p._id,
                            slug: p.slug,
                            catSlug: p.catSlug,
                        });
                    }
                });
            }
        });
    });
});

// POST Edit post
router.post('/post/edit-post/:id', async (req, res, next) => {

    var imageFile = typeof req.files.image !== "undefined" ? req.files.image.name : "";
    var title = req.body.title;
    var description = req.body.description;
    var markdown = req.body.markdown;
    var categories = req.body.categories;
    var pimage = req.body.pimage;
    var id = req.params.id;
    var catSlug = categories.replace(/\s+/g, '-').toLowerCase();

    Posts.findOne({title: title, _id: {'$ne': id}}, function (err, p) {
        if (err)
            console.log(err);

        if (p) {
            res.redirect('/admin/dashboard/post/edit-post/' + id);
        } else {
            Posts.findById(id, function (err, p) {
                if (err)
                    console.log(err);

                p.title = title;
                p.description = description;
                p.markdown = markdown;
                p.categories = categories;
                p.catSlug = catSlug;
                if (imageFile != "") {
                    p.image = imageFile;
                }

                p.save(function (err) {
                    if (err)
                        console.log(err);

                    if (imageFile != "") {
                        if (pimage != "") {
                            fs.remove('public/images/' + id + '/' + pimage, function (err) {
                                if (err)
                                    console.log(err);
                            });
                        }

                        var productImage = req.files.image;
                        var path = 'public/images/' + id + '/' + imageFile;

                        productImage.mv(path, function (err) {
                            return console.log(err);
                        });

                    }
                    req.flash('success', 'Новина успішно відредагована!');
                    res.redirect('/admin/dashboard/post/edit-post/' + id);
                });

            });
        }
    });
});

// Delete post
router.delete('/post/:id', async (req, res) => {

    var id = req.params.id;
    var path = 'public/images/' + id;

    fs.remove(path);
    await Posts.findByIdAndDelete(id);
    req.flash('success', 'Новина успішно видалена!');
    res.redirect('/admin/dashboard');

});

// Delete comment
router.delete('/post/:id/:id', async (req, res) => {
    var p_id = req.body.posts_id;
    var c_id = req.body.comment_id;
    var slug = req.body.posts_slug;

    await Posts.findById(p_id, function (err, posts) {
        posts.comments.id(c_id).remove();
        posts.save();
    });
    req.flash('success', 'Коментар успішно видалений!');
    res.redirect('/admin/dashboard/post/' + slug);
});

// GET delete category
router.get('/categories/delete-category/:id', isAdmin, function (req, res, next) {
    Categories.findByIdAndRemove(req.params.id, function (err) {
        if (err) return console.log(err);

        Categories.find(function (err, categories) {
            if (err) {
                console.log(err);
            } else {
                req.app.locals.categories = categories;
            }
        });

        req.flash('success', 'Категорія успішно видалена!');
        res.redirect('/admin/dashboard/categories');
    });
});

// GET Post info
router.get('/post/:slug', isAdmin, async (req, res) => {
    const posts = await Posts.findOne({slug: req.params.slug});
    if (posts == null) res.redirect('/admin/dashboard');
    res.render('admin/admin_post', {posts: posts});
});

// Comment
router.post('/post/:slug/comment', async (req, res) => {

    var comment_id = ObjectId();

    Posts.findOne({slug: req.params.slug}, (err, posts) => {
        if (err) {
            return console.log(err);
        } else {
            posts.comments.push({
                username: req.user.username,
                email: req.user.email,
                comment: req.body.comment,
                _id: comment_id
            });
            posts.save();
            req.flash('success', 'Ваш коментар успішно доданий!');
            res.redirect('/admin/dashboard/post/' + req.params.slug);
        }
    });
});


// GET gallery
router.get('/gallery', isAdmin, async (req, res) => {
    Album.find(function (err, album) {
        if (err) return console.log(err);
        res.render('admin/admin_gallery', {
            album: album
        });
    });
});

// POST new album
router.post('/gallery/add-album', async (req, res) => {

    var imageFile = typeof req.files.image !== "undefined" ? req.files.image.name : "";
    var title = req.body.title;
    var createdBy = req.user.username;
    var slug = title.replace(/\s+/g, '-').toLowerCase();

    var album = new Album({
        title: title,
        image: imageFile,
        createdBy: createdBy,
        slug: slug,
    });
    album.save(function (err) {
        if (err) return console.log(err);

        mkdirp('public/images/gallery/' + album.slug, function (err) {
            return console.log(err);
        });

        if (imageFile != "") {
            var albumImage = req.files.image;
            var path = 'public/images/gallery/' + album.slug + '/' + imageFile;

            albumImage.mv(path, function (err) {
                return console.log(err);
            });
        }
        req.flash('success', 'Новий альбом успішно доданий!');
        res.redirect('/admin/dashboard/gallery');
    });

});

// GET album
router.get('/gallery/album/:slug', isAdmin, (req, res) => {
    Album.findOne({slug: req.params.slug}, function (err, album) {
        if (err) {
            return console.log(err);
        } else {
            var galleryDir = 'public/images/gallery/' + album.slug;
            var photos = null;

            fs.readdir(galleryDir, function (err, files) {
                if (err) {
                    console.log(err);
                } else {
                    photos = files;

                    res.render('admin/admin_album', {
                        album: album,
                        photos: photos,
                    });
                }
            });

        }
    });
});

// POST album-photos
router.post('/gallery/album/album-photos/:slug', async (req, res) => {

    var photos = req.files.file;
    var slug = req.params.slug;
    var path = 'public/images/gallery/' + slug + "/" + req.files.file.name;

    photos.mv(path, function (err) {
        if (err) console.log(err);

        resizeImg(fs.readFileSync(path), {}).then(function (buf) {
            fs.writeFileSync(path, buf);
        });
    });

    Album.findOne({slug: slug}, function (err, album) {

        album.photos.push({
            image: photos.name
        });
        album.save();
    });

    res.sendStatus(200);

});

// Delete album
router.delete('/gallery/album/:slug', async (req, res) => {

    var slug = req.params.slug;
    var path = 'public/images/gallery/' + slug;

    fs.remove(path);
    await Album.findOneAndRemove({slug: slug});
    req.flash('success', 'Альбом успішно видалений!');
    res.redirect('/admin/dashboard/gallery');

});

// Remove photo from album
router.delete('/gallery/album/:slug/delete-photo/:image', async (req, res) => {

    var slug = req.body.album_slug;
    var photo_id = req.body.photo_id;
    var album_id = req.body.album_id;

    var originalImage = 'public/images/gallery/' + slug + "/" + req.params.image;

    fs.remove(originalImage, function (err) {
        if (err) {
            console.log(err);
        }

    });

    await Album.findById(album_id, function (err, album) {
        album.photos.id(photo_id).remove();
        album.save();
    });
    res.redirect('/admin/dashboard/gallery/album/' + slug);

});


// Special function
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;
