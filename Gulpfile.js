var gulp    = require('gulp'),
    gutil   = require('gulp-util'),
    plumber = require('gulp-plumber'),
    coffee  = require('gulp-coffee'),
    sass    = require('gulp-ruby-sass');

//
// Set variables where our base resources are located
//
var basePaths = {scss: 'scss/**/*.scss', coffeescript: 'coffeescripts/**/*'}

//
// CoffeeScript
//
gulp.task('compileApplicationJS', function() {
  return gulp.src(basePaths.coffeescript)
      .pipe(plumber())
      .pipe(coffee({base: true}))
      .pipe(gulp.dest('workbench/javascripts'))
      .on('error', gutil.log);
});

//
// Stylesheets
//
gulp.task('compileCSS', function() {
  return gulp.src(basePaths.scss)
    .pipe(plumber())
    .pipe(sass({ bundleExec: true }))
    .pipe(gulp.dest('workbench/stylesheets'))
    .on('error', gutil.log)
});

//
// Watching
//
gulp.task('watch', function() {
  gulp.watch(basePaths.coffeescript, ['compileApplicationJS']);
  gulp.watch(basePaths.scss, ['compileCSS']);
});

gulp.task('default', ['compileApplicationJS', 'compileCSS', 'watch']);
