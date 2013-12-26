'use strict';

var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');

var fs = require('fs'),
  rimraf = require('rimraf'),
  https = require('https'),
  exec   = require('child_process').exec,
  version,
  install,
  mysql = require('mysql');

var WpGenerator = module.exports = function WpGenerator(args, options, config) {
  yeoman.generators.Base.apply(this, arguments);

  this.on('end', function () {
    this.installDependencies({ skipInstall: options['skip-install'] });
  });

  this.pkg = JSON.parse(this.readFileAsString(path.join(__dirname, '../package.json')));
};

util.inherits(WpGenerator, yeoman.generators.Base);

// get the latest stable version of Wordpress
WpGenerator.prototype.getVersion = function getVersion() {
  var cb = this.async();
  var options = {
    host: 'api.github.com',
    path: '/repos/WordPress/WordPress/tags',
    headers: {'User-Agent': 'node'}
  };

  try {
    https.get(options, function (res) {
      var data = '';

      res.on('data', function (chunk) {
        data += chunk;
      });

      res.on('end', function () {
        var obj = JSON.parse(data);
        version = obj[0].name;
        cb();
      });

    }).on('error', function (e) {
      console.log('Got error: ' + e.message);
      cb();
    });
  }
  catch (e) {
    console.log('Something went wrong !!!');
    cb();
  }

};

WpGenerator.prototype.defaultConfig = function getConfig() {
  var cb = this.async();

  this.latestVersion = version;
  this.defaultAuthorName = '';
  this.defaultAuthorURI = '';
  this.defaultTheme = 'https://github.com/automattic/_s/';

  cb();
};

WpGenerator.prototype.askOptions = function askOptions() {
  var cb = this.async();

  var prompts = [{
      type: 'checkbox',
      name: 'features',
      message: 'What would you like to do?',
      choices: [{
        name: 'Create a database',
        value: 'dbCreate',
        checked: true
      },
      {
        name: 'Install Wordpress (default user:admin password:1)',
        value: 'wpInstall',
        checked: true
      },
      ]
    }];

  this.prompt(prompts, function (answers) {
    var features = answers.features;
    this.dbCreate = features.indexOf('dbCreate') !== -1;
    this.wpInstall = features.indexOf('wpInstall') !== -1;

    cb();
  }.bind(this));
};

WpGenerator.prototype.askFor = function askFor() {
  var cb = this.async();

  var prompts = [{
      type: 'input',
      name: 'wordpressVersion',
      message: 'Which version of WordPress do you want?',
      default: this.latestVersion
    },
    {
      type: 'input',
      name: 'themeName',
      message: 'Name of your theme: ',
      default: 'wpTheme'
    },
    {
      type: 'input',
      name: 'themeBoilerplate',
      message: 'Starter theme (please provide a github link): ',
      default: this.defaultTheme
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

    // this.dnHost = props.dnHost;
    this.dbName = props.dbName;

    this.dbUser = props.dbUser;
    this.dbPass = props.dbPass;

    cb();
  }.bind(this));
};

// download the framework and unzip it in the project app/
WpGenerator.prototype.createApp = function createApp() {
  var cb   = this.async();

  this.log.writeln('Downloading Wordpress ' + this.wordpressVersion);
  this.tarball('https://github.com/WordPress/WordPress/archive/' + this.wordpressVersion + '.tar.gz', 'core', cb);
};

// remove the basic theme and create a new one
WpGenerator.prototype.createTheme = function createTheme() {
  var cb   = this.async();
  var self = this;

  this.log.writeln('First let\'s remove the built-in themes we will not use');
  // remove the existing themes
  fs.readdir('core/wp-content/themes', function (err, files) {
    if (typeof files !== 'undefined' && files.length !== 0) {
      files.forEach(function (file) {
        var pathFile = fs.realpathSync('core/wp-content/themes/' + file),
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
      this.themeBoilerplate = this.themeBoilerplate + 'archive/master.tar.gz';
    }
    else {
      this.themeBoilerplate = this.themeBoilerplate + '/archive/master.tar.gz';
    }
  }

  // create the theme
  this.tarball(this.themeBoilerplate, 'themes/' + this.themeName, cb);

};

WpGenerator.prototype.createDatbase = function createDatbase() {
  var cb = this.async();

  if (this.dbCreate) {
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
        console.log('Database was not created');
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
  this.pathName = '<%= wp.theme %>';

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
  this.copy('_wp-cli.local.yml', 'wp-cli.local.yml');
};

WpGenerator.prototype.installCore = function installCore() {
  var cb = this.async();

  if (this.wpInstall) {
    this.log.writeln('');
    this.log.writeln('Installing WordPress');
    install = exec('wp core install --admin_user="admin" --admin_password="1" --admin_email=" " --title=' + this.themeName, function (error, stdout, stderr) {
      if (error !== null) {
        console.log('exec error: ' + error);
      }
      console.log(stdout);
      console.log(stderr);
      cb();
    });
  }
};
