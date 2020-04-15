exports.isAdmin = function (req, res, next) {
    if (req.isAuthenticated() && res.locals.user.admin == 1) {
        next();
    } else {
        res.redirect('/login');
    }
};