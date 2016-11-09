var gulp = require('gulp'),
    watch = require('gulp-watch'),
    babel = require('gulp-babel'),
    path = require('path'),
    plumber = require('gulp-plumber'),
    sourcemaps = require('gulp-sourcemaps');

var paths = {
    src: {src: 'src/**/*.js', dest: 'dist'}
};

function isAdded(file) {
    return file.event === 'added' || file.event === 'deleted' || file.event === 'renamed';
}

function handleError(err) {
    console.log(err.toString());
    this.emit('end');
}


var escapeContent = function(content) {
    return content.replace(/"/g, '\\"').replace(/\r?\n/g, '" +\n    "');
};

var run = function (watched, babelOpts) {


    (watched ?
        watch(paths.src.src, {silent: false}) :
        gulp.src(paths.src.src))
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(babel(babelOpts))
        .pipe(sourcemaps.write('./sourcemaps', {includeContent: false, sourceRoot: '/src'}))
        .pipe(gulp.dest(paths.src.dest));

};

gulp.task('watch', function () {
    run(false);
    run(true);
});

gulp.task('default', function () {
    run(false);
});

gulp.task('frontend', function () {
    run(false, {presets: ['es2015']});
});

gulp.task('frontend-watch', function () {
    run(false, {presets: ['es2015']});
    run(true, {presets: ['es2015']});
});