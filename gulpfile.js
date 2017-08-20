const gulp = require('gulp');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const cleanCSS = require('gulp-clean-css');
const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const uglify = require('gulp-uglify');
const size = require('gulp-size');
const gutil = require('gulp-util');

gulp.task('sass', function(){
    return gulp.src('./asset/sass/**/main.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(process.env.NODE_ENV === 'live' ? cleanCSS({compatibility: 'ie8'}) : sourcemaps.write())
        .pipe(gulp.dest('./asset/css'));
});

gulp.task('sass:watch', ['sass'], function () {
    gulp.watch('./asset/sass/**/*.scss', ['sass']);
});

gulp.task('react', function () {
    return browserify({entries: 'app.jsx', extensions: ['.jsx'], debug: true})
        .transform('babelify', {presets: ['es2015', 'react']})
        .bundle()
        .pipe(source('app.js'))
        .pipe(buffer())
        .pipe(process.env.NODE_ENV === 'live' ? uglify() : gutil.noop())
        .pipe(size())
        .pipe(gulp.dest('./'));
});

gulp.task('react:watch', ['react'], function () {
    gulp.watch('**/*.jsx', ['react']);
});

gulp.task('build', ['sass', 'react']);

gulp.task('watch', ['sass:watch', 'react:watch']);