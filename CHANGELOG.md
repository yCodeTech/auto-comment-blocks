# Change Log
All notable changes to this extension will be documented in this file.

<!--Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.-->
## [1.0.3]
- Added support for JavaScript and TypeScript multiline block comments - a [pull request by a-stewart](https://github.com/kevb34ns/auto-comment-blocks/pull/35) for the original plugin. Fixes issue kevb34ns/auto-comment-blocks#27.
- Created a new language config file for Blade to use blade's comments as well as the multiline block comments
- Updated various language config files to reflect a [pull request by a-stewart](https://github.com/kevb34ns/auto-comment-blocks/pull/37) for the original plugin.
- Added support for protocol buffers - a [pull request by jun-sheaf](https://github.com/kevb34ns/auto-comment-blocks/pull/30) for the original plugin.
- Added support for `//!` comments - a [pull request by Lucretiel](https://github.com/kevb34ns/auto-comment-blocks/pull/29) for the original plugin and fixes the issue kevb34ns/auto-comment-blocks#25
- Added support for csharp(c#) (using the cpp(c++) config file) - Fixes the issue kevb34ns/auto-comment-blocks#41.
- Updated the support for `/*! */` comments and including the `!` on every line.

## [1.0.2]
- Added support for PHP Blade.

## [1.0.1]
- Add multi-line support for Rust, Go
- Add single-line support for YAML

## [1.0.0]
- Add multi-line comment support for Less, Objective-C/C++, and Swift.
- Add single-line comment blocks for most officially supported languages. See README for more information.

## [0.3.2]
- Fix a bug that broke the extension, caused by the previous bugfix.

## [0.3.1]
- Fix bug that that caused every language to have single-line block comments.

## [0.3.0]
- Add single-line blocks for C/C++ (disabled by default).
- Add comment completion for PHP files.

## [0.2.2]
- Add Javadoc-style comments for Groovy files.

## [0.2.1]
- Fixed misspelled filename leading to C functionality breaking.
- Change extension description to include support for new languages.

## [0.2.0]
- Added block comment completion for CSS/Sass files.

## [0.1.0]
- Add QDoc (Qt-style) comment block completion for C and C++.

## [0.0.5]
- Fix major typo that caused an asterisk to be inserted following any indented line.
- Changelog now starts with the latest update rather than the oldest.

## [0.0.4]
- Fixed an issue that caused asterisk insertion and indentation bugs when indenting using an odd number of spaces.

## [0.0.3]
- Changed `galleryBanner.theme`, again.

## [0.0.2]
- Changed `galleryBanner.theme`.

## [0.0.1]
- Initial release
