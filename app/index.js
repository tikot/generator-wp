'use strict';

var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');
var chalk = require('chalk');

var fs = require('fs'),
  rimraf = require('rimraf'),
  https = require('https'),
  version,
  mysql = require('mysql');

module.exports = yeoman.generators.Base.extend({
	initializing: function () {
		this.getVersion();
		this.defaultAuthorName = '';
		this.defaultAuthorURI = '';
		this.defaultTheme = 'https://github.com/Automattic/_s/';
	},
	getVersion: function () {
		var done = this.async();
		var options = {
			host: 'api.wordpress.org',
			path: '/core/version-check/1.7/',
			headers: {'User-Agent': 'node'}
		};
		try {
			https.get(options, function (res) {
				var data  = '';
				res.on('data', function (chunk) {
					data += chunk;
				});

				res.on('end', function () {
					version = JSON.parse(data).offers[0].current;
					done();
				});

			}).on('error', function (e) {
				throw chalk.bgRed(' Life request error: ') + e.message;
			});
		}
		catch (e) {
			this.log(e);
			done();
		}
	},
	prompting: {
		askOptions: function () {
			var done = this.async();

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
					name: 'Install Wordpress (default user:admin password:pass)',
					value: 'wpInstall',
					checked: true
				}]
			}];

			this.prompt(prompts, function (answers) {
				var features = answers.features;
				this.dbCreate = features.indexOf('dbCreate') !== -1;
				this.wpInstall = features.indexOf('wpInstall') !== -1;

				done();
			}.bind(this));
		},
		askFor: function() {
			var done = this.async();

			var prompts = [{
				type: 'input',
				name: 'wordpressVersion',
				message: 'Which version of WordPress do you want?',
				default: version
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
			// 	name: 'dnHost',
			// 	message: 'Give me database host',
			// 	default: 'localhost'
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
			if (this.wpInstall) {
				prompts.push({
					name: 'adminEmail',
					message: 'Admin email for WP install:',
					default: 'wordpress@local.dev'
				});
				prompts.push({
					name: 'adminUser',
					message: 'WP admin user name',
					default: 'admin'
				});
				prompts.push({
					name: 'adminPass',
					message: 'WP admin password',
					default: 'pass'
				});
			}

			this.prompt(prompts, function (props) {
				this.wordpressVersion = props.wordpressVersion;

				this.themeName = props.themeName;
				this.themeBoilerplate = props.themeBoilerplate;

				// this.dnHost = props.dnHost;
				this.dbName = props.dbName;

				this.dbUser = props.dbUser;
				this.dbPass = props.dbPass;

				if (this.wpInstall) {
					this.adminEmail = props.adminEmail;
					this.adminUser = props.adminUser;
					this.adminPass = props.adminPass;
				}

				done();
			}.bind(this));
		},
	},
	configuring: {
		configfiles: function() {
			this.copy('editorconfig', '.editorconfig');
			this.copy('jshintrc', '.jshintrc');
			this.copy('_package.json', 'package.json');
			this.copy('_bower.json', 'bower.json');
		},
		gitfiles: function () {
			this.copy('gitattributes', '.gitattributes');
			this.copy('gitignore', '.gitignore');
		},
	},
	writing: {

		projectfiles: function () {
			this.copy('index.php', 'index.php');
			this.copy('cindex.php', 'content/plugins/index.php');
			this.copy('cindex.php', 'content/themes/index.php');
			this.copy('_wp-cli.local.yml', 'wp-cli.local.yml');

			this.template('_wp-config.php', 'wp-config.php');
			this.template('_gulpfile.js', 'gulpfile.js');
			this.template('_readme.md', 'readme.md');
		},
		downloadWp: function () {
			var done = this.async();
			this.spawnCommand('wp', [
				'core',
				'download',
				'--version=' + this.wordpressVersion,
				'--path=core',
			]).on('close', done);
		},
		createDatabase: function () {
			var that = this;
			var done = this.async();

			if (this.dbCreate) {
				var connection = mysql.createConnection({
					host: 'localhost',
					user: this.dbUser,
					password: this.dbPass,
				});
				try {
					this.log(chalk.bgCyan(chalk.black(' Connecting to mysql Server ')));
					connection.connect();
					this.log(chalk.bgYellow( chalk.black(' Runing SQL CREATE DATABASE ' + this.dbName + ' ') ));
					connection.query('CREATE DATABASE ' + this.dbName, function (error) {
						if (error) {
							throw chalk.bgRed(chalk.white(error));
						}
						that.log(chalk.bgGreen( chalk.black(' Database created! ') ));
					});
					connection.on('error', function(error) {
						throw chalk.bgRed(chalk.white(error));
					});
					connection.end();
					done();
				}
				catch (e) {
					this.log(e);
					done();
				}
			}
			else {
				done();
			}
		},
	},
	install: {
		installWordPress: function () {
			var done = this.async();
			if (this.wpInstall) {
				this.log(chalk.bgCyan(chalk.black(' Installing WordPress ')));
				this.spawnCommand('wp', [
					'core',
					'install',
					// '--url=<url>,'
					'--title=' + this.themeName,
					'--admin_user=' + this.adminUser,
					'--admin_password=' + this.adminPass,
					'--admin_email=' + this.adminEmail,
				]).on('close', done);
			}
			else {
				done();
			}
		},
		installTheme: function () {
			var that = this;
			var done = this.async();

			this.log('First let\'s remove the built-in themes we will not use');
			// remove the existing themes
			fs.readdir('core/wp-content/themes', function (err, files) {
				if (typeof files !== 'undefined' && files.length !== 0) {
					files.forEach(function (file) {
						var pathFile = fs.realpathSync('core/wp-content/themes/' + file),
						isDirectory = fs.statSync(pathFile).isDirectory();
						if (isDirectory) {
							rimraf.sync(pathFile);
							that.log(chalk.bgCyan(chalk.black( ' Removing: ')) + pathFile );
						}
					});
				}
			});

			// check if the user only gave the repo url or the entire url with /tarball/{branch}
			var tarballLink = (/[.]*tarball\/[.]*/).test(this.themeBoilerplate);
			if (!tarballLink) {
				// if the user gave the repo url we add the end of the url. we assume user wants the master branch
				var lastChar = this.themeBoilerplate.substring(this.themeBoilerplate.length - 1);
				if (lastChar === '/') {
					this.themeBoilerplate = this.themeBoilerplate + 'archive/master.tar.gz';
				}
				else {
				this.themeBoilerplate = this.themeBoilerplate + '/archive/master.tar.gz';
				}
			}
			// create the theme
			this.tarball(this.themeBoilerplate, 'content/themes/' + this.themeName, {
				extract: true,
				mode: '755',
				strip: 1,
			}, done);

		},
		setupTheme: function () {
			var done = this.async();
			this.spawnCommand('wp', [
				'theme',
				'activate',
				this.themeName
			]).on('close', done);
		},
		installingDevDependencies: function () {
			this.npmInstall([
				'node-bourbon',
				'browser-sync',
				'gulp',
				'gulp-load-plugins',
				'gulp-sass',
				'gulp-sourcemaps'
				], { 'saveDev': true });
		}
	}
});
