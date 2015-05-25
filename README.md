# generator-wp

WordPress generator that creates database and installed WordPress. Make sure you have `wp-cli` for the installation. This generator is opinionated workflow in for fast theme or plugins prototype.

### Getting started
- Make sure you have [yo](https://github.com/yeoman/yo) & [gulp](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md) installed:
    `npm install -g yo gulp` also `wp-cli`
- Install the generator: `npm install -g generator-wp`
- Run: `yo wp`
- Also a `gulp` command look into `gulpfile` for more info

### What does it do
- WordPress in a sub-folder
- themes & plugins folder in a content directory
- Sets up gulp with `browser-sync` for the theme
- Creates a database `CREATE DATABASE %name%`
- Installs Wordpress

### License
[MIT License](https://github.com/tikot/generator-wp/blob/master/LICENSE)