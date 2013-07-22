'use strict'

module.exports = (grunt) ->
  
  # load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach grunt.loadNpmTasks
  
  grunt.initConfig
    watch:
      options:
        livereload: 5729,
      stylus:
        files: ['themes/<%= themeName %>/stylus/*.styl']
        tasks: ['stylus']
      livereload:
        files: [
          'themes/<%= themeName %>/*.php',
          'themes/<%= themeName %>/js/**/*.js'
          'themes/<%= themeName %>/img/*.{png,jpg,webp,svg}'
        ]

    stylus:
      compile:
        options:
          'include css': true
          urlfunc: 'embedurl'
          compress: true
          paths: ['node_modules/grunt-contrib-stylus/node_modules']
        files:
          'themes/<%= themeName %>/main.css': ['themes/<%= themeName %>/stylus/style.styl']
    php:
    	app:
        options:
          base: "."
          keeplive: true
          open: true

  grunt.registerTask 'default', ['stylus',  'watch',]