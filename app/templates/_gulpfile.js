/*global require*/
'use strict';

// Include Gulp & Tools We'll Use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync');
var reload = browserSync.reload;

var path = 'content/themes/<%= themeName %>';

// browser-sync task for starting the server.
gulp.task('browser-sync', function() {
	browserSync({
		notify: false,
		// Customize the BrowserSync console logging prefix
		logPrefix: 'wp',
		// Run as an https by uncommenting 'https: true'
		// Note: this uses an unsigned certificate which on first access
		//       will present a certificate warning in the browser.
		// https: true,
		proxy: 'http://127.0.0.1:8000',
		port: 3030,
	});
});

// Sass task, will run when any SCSS files change & BrowserSync
// will auto-update browsers
gulp.task('sass', function () {
	return gulp.src(path + '/scss/style.scss')
		.pipe($.sourcemaps.init())
		.pipe($.sass({
			errLogToConsole: true
		}))
		.pipe($.sourcemaps.write('./'))
		.pipe(gulp.dest(path))
		.pipe(reload({stream:true}));
});

gulp.task('sass:dist', function () {
	return gulp.src(path + '/scss/style.scss')
		.pipe($.sass({
			errLogToConsole: true,
			outputStyle: 'compressed',
		}))
		.pipe(gulp.dest(path));
});

gulp.task('bs-reload', function () {
  	return browserSync.reload();
});

// Default task to be run with `gulp`
gulp.task('default', ['sass', 'browser-sync'], function () {
	gulp.watch(path + '/scss/*.scss', ['sass']);
	gulp.watch(path + '/**/*.php', ['bs-reload']);
	gulp.watch(path + '/**/*.js', ['bs-reload']);
});
