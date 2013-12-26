'use strict'

module.exports = (grunt) ->

  # load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach grunt.loadNpmTasks

  grunt.initConfig
    pkg: grunt.file.readJSON('package.json')
    wp:
      theme: '<%= themeName %>'

    watch:
      grunt:
        files: ['Gruntfile.js']
      options:
        livereload: 5729,
      # stylus:
        # files: ['themes/<%= pathName %>/stylus/{,*/}*.styl']
        # tasks: ['stylus']
      sass:
        files: 'themes/<%= pathName %>/scss/{,*/}*.scss'
        tasks: ['sass']
      livereload:
        files: [
          'themes/<%= pathName %>/{,*/}*.php',
          'themes/<%= pathName %>/{,*/}*.js'
          'themes/<%= pathName %>/img/*.{png,jpg,webp,svg}'
        ]

    stylus:
      compile:
        options:
          'include css': true
          urlfunc: 'embedurl'
          compress: true
          paths: ['node_modules/grunt-contrib-stylus/node_modules']
        files:
          'themes/<%= pathName %>/style.css': ['themes/<%= pathName %>/stylus/style.styl']

    sass:
      dist:
        options:
          outputStyle: 'compressed'
        files:
          'themes/<%= pathName %>/style.css': 'themes/<%= pathName %>/scss/style.scss'

    php:
      app:
        options:
          base: "."
          keeplive: true
          open: true

  # grunt.registerTask('build', ['stylus']);
  grunt.registerTask('build', ['sass']);
  grunt.registerTask('default', ['build','watch']);
