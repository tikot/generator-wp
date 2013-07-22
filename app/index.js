'use strict';

var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');

var fs = require('fs'),
  rimraf = require('rimraf'),
  exec   = require('child_process').exec,
  mysql = require('mysql');

var WpGenerator = module.exports = function WpGenerator(args, options, config) {
  yeoman.generators.Base.apply(this, arguments);

  this.on('end', function () {
    this.installDependencies({ skipInstall: options['skip-install'] });
  });

  this.pkg = JSON.parse(this.readFileAsString(path.join(__dirname, '../package.json')));
};

util.inherits(WpGenerator, yeoman.generators.Base);

WpGenerator.prototype.defaultConfig = function getConfig() {
  var cb   = this.async();

  this.latestVersion = '3.5.2';
  this.defaultAuthorName = '';
  this.defaultAuthorURI = '';
  this.defaultTheme = 'https://github.com/automattic/_s/';

  cb();
};

WpGenerator.prototype.askFor = function askFor() {
  var cb = this.async();

  // have Yeoman greet the user.
  console.log(this.yeoman);
  
  var prompts = [{
      name: 'wordpressVersion',
      message: 'Which version of WordPress do you want?',
      default: this.latestVersion
    },
    {
      name: 'themeName',
      message: 'Name of the theme you want to use: ',
      default: '_wp'
    },
    {
      name: 'themeBoilerplate',
      message: 'Starter theme (please provide a github link): ',
      default: this.defaultTheme
    },
    {
      type: 'confirm',
      name: 'createdb',
      message: 'Would you like me to create datbase for you?',
      default: true
    },
    // {
    //   name: 'dnHost',
    //   message: 'Give me database host',
    //   default: 'localhost'
    // },
    {
      name: 'dbName',
      message: 'What database name would you like?',
      default: ''
    },
    {
      name: 'dbUser',
      message: 'Give me a database user:',
      default: 'root'
    },
    {
      name: 'dbPass',
      message: 'Give me a database password:',
      default: ''
    }];
  
  this.prompt(prompts, function (props) {
    this.wordpressVersion = props.wordpressVersion;

    this.themeName = props.themeName;
    this.themeBoilerplate = props.themeBoilerplate;

    this.createdb = props.createdb;
    // this.dnHost = props.dnHost;
    this.dbName = props.dbName;

    this.dbUser = props.dbUser;
    this.dbPass = props.dbPass;

    cb();
  }.bind(this));
};

// get the latest stable version of Wordpress
WpGenerator.prototype.getVersion = function getVersion() {
  var cb = this.async(),
    self = this;

  this.log.writeln('');
  this.log.writeln('Trying to get the latest stable version of Wordpress');

  // try to get the latest version using the git tags
  // http://wordpress.org/latest.tar.gz
  try {
    var version = exec('git ls-remote --tags git://github.com/WordPress/WordPress.git | tail -n 1', function (err, stdout, stderr) {
      if (err) {
        cb();
      }
      else {
        var pattern = /\d\.\d[\.\d]*/ig,
          match = pattern.exec(stdout);
        if (match !== null) {
          self.latestVersion = match[0];
          self.log.writeln('Latest version: ' + self.latestVersion);
        }
      }
      cb();
    });
  }
  catch (e) {
    cb();
  }
};

// download the framework and unzip it in the project app/
WpGenerator.prototype.createApp = function createApp() {
  var cb   = this.async();

  this.log.writeln('Downloading Wordpress ' + this.wordpressVersion);
  this.tarball('https://github.com/WordPress/WordPress/tarball/' + this.wordpressVersion, 'wordpress', cb);
};

// remove the basic theme and create a new one
WpGenerator.prototype.createTheme = function createTheme() {
  var cb   = this.async();
  var self = this;

  this.log.writeln('First let\'s remove the built-in themes we will not use');
  // remove the existing themes
  fs.readdir('wordpress/wp-content/themes', function (err, files) {
    if (typeof files !== 'undefined' && files.length !== 0) {
      files.forEach(function (file) {
        var pathFile = fs.realpathSync('wordpress/wp-content/themes/' + file),
          isDirectory = fs.statSync(pathFile).isDirectory();

        if (isDirectory) {
          rimraf.sync(pathFile);
          self.log.writeln('Removing ' + pathFile);
        }
      });
    }
  });
  this.log.writeln('');
  this.log.writeln('Now we download the theme');

  // check if the user only gave the repo url or the entire url with /tarball/{branch}
  var tarballLink = (/[.]*tarball\/[.]*/).test(this.themeBoilerplate);
  if (!tarballLink) {
    // if the user gave the repo url we add the end of the url. we assume he wants the master branch
    var lastChar = this.themeBoilerplate.substring(this.themeBoilerplate.length - 1);
    if (lastChar === '/') {
      this.themeBoilerplate = this.themeBoilerplate + 'tarball/master';
    }
    else {
      this.themeBoilerplate = this.themeBoilerplate + '/tarball/master';
    }
  }

  // create the theme
  this.tarball(this.themeBoilerplate, 'themes/' + this.themeName, cb);

};

WpGenerator.prototype.createDatbase = function createDatbase() {
  var cb = this.async();

  if (this.createdb) {
    var connection = mysql.createConnection({
      host     : 'localhost',
      user     : this.dbUser,
      password : this.dbPass,
    });

    this.log.writeln('Connecting to mysql Server');
    connection.connect();
    this.log.writeln('Runing SQL CREATE DATABASE ' + this.dbName);
    connection.query('CREATE DATABASE ' + this.dbName, function (err) {
      if (err) {
        throw err;
      }
    });
    this.log.writeln('Ending connection');
    this.log.writeln('');
    connection.end();

    cb();
  }
  else {
    cb();
  }
};

WpGenerator.prototype.app = function app() {
  this.mkdir('plugins');
  this.mkdir('themes');
  this.copy('index.php', 'index.php');
  this.copy('cindex.php', 'plugins/index.php');
  this.copy('cindex.php', 'themes/index.php');
  this.template('_wp-config.php', 'wp-config.php');
  this.template('_Gruntfile.coffee', 'Gruntfile.coffee');
};

WpGenerator.prototype.projectfiles = function projectfiles() {
  this.copy('_package.json', 'package.json');
  this.copy('editorconfig', '.editorconfig');
  this.copy('jshintrc', '.jshintrc');
};