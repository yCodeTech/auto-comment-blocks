# Automatic Comment Blocks

A VScode extension that provides block comment completion for Javadoc-style multi-line comments and single-line comment blocks for most officially supported languages.

This is a fork of the original by [kevb34ns](https://github.com/kevb34ns/auto-comment-blocks) with some additional language support.

View the [Changelog](/CHANGELOG.md) for more detailed changes/additions/removals.

View the extension on [VScode Marketplace](https://marketplace.visualstudio.com/items?itemName=yCodeTech.automatic-comment-blocks).

## MAJOR CHANGES IN 1.0.3 UPDATE (Please Read)

- Added support for JavaScript and TypeScript multiline block comments.
- Added support for Blade to use blade's handlebar comments as well as the multiline block comments.
- Added support for protocol buffers.
- Added support for `//!` comments.
- Added support for csharp.
- Updated the support for `/*! */` comments and including the `!` on every line.

## MAJOR CHANGES IN 1.0 UPDATE (Please Read)

A lot has changed in this update. Please open issues for any bugs you encounter.

### Single-line Comment Blocks
You can now use single line comment blocks for languages with `//`, `#`, or `;` style single line comments. Press `Shift+Enter` while on a commented line to insert a new commented line with the same level of indentation. See the Settings section for how to change the behavior so that `Enter` inserts a commented line while `Shift+Enter` breaks out of the comment block (this only works correctly for a subset of languages right now).

The Language Support section shows which languages are supported. See the Settings section for how to add single line comment support to languages that are not officially supported.

### Multi-line Comment Blocks
This feature has not changed, but support has now been added for Less, Objective-C/C++, and Swift.

## Usage
![Demo](https://raw.githubusercontent.com/kevinkyang/auto-comment-blocks/master/img/demo.gif)

### Javadoc-style comment blocks
Type `/**` to start a block comment, then hit the Enter key, and the extension will close the block. While inside the comment block, the extension will insert an asterisk at the start of every new line, and align the comment, respecting indentation.

### QDoc-style (Qt) comment blocks
Use `/*!` in all file types that support the normal `/*` comments to start a QDoc comment block.

### New: "single-line" block comments
You can insert single line comment blocks for languages with `//`, `#`, or `;` style single line comments. Press `Shift+Enter` while on a commented line to insert a new commented line with the same level of indentation. See the Settings section for issues and more options.

### Language Support

| Comment Style | Language Support |
| ------- | ------- |
| `/** */`, `/*! */` | Blade, C, C++, C#, CSS, Go, Groovy, Java, JavaScript, Less, Objective C/C++, PHP, Proto, Proto3, Rust, SCSS/Sass Swift, Typescript |
| `//`, `///` | Blade, C, C++, C#, F#, Go, Groovy, Java, JavaScript, Less, Objective C/C++, PHP, Rust, SCSS/Sass, Swift, TypeScript |
| `#` | CoffeeScript, Dockerfile, Makefile, Perl, PowerShell, Python, R, Ruby, YAML |
| `;` | Clojure |

## Settings

Reload the extension after changing any settings.

* `auto-comment-blocks.singleLineBlockOnEnter`: If enabled, pressing `Enter` inserts a new commented line at the same indentation, and pressing `Shift+Enter` breaks the comment block.
  + **Caution**: This feature is buggy in many languages (see Issues section), but it seems to work fine for C, C++, Go, Less, PHP, Ruby, and Sass.
* `auto-comment-blocks.disabledLanguages`: Add languageIds here to disable any comment completion for that language.
* `auto-comment-blocks.slashStyleBlocks`: Add languageIds here to enable '//' and '///'-style single line comment blocks for that language.
* `auto-comment-blocks.hashStyleBlocks`: Add languageIds here to enable '#'-style single line comment blocks for that language.
* `auto-comment-blocks.semicolonStyleBlocks`: Add languageIds here to enable ';'-style single line comment blocks for that language.

## Issues

* Single-line blocks using `Enter`: if you enable the `singleLineBlockOnEnter` setting, there are a few things to keep in mind:
  + It seems to work find for C, C++, Go, Less, PHP, Ruby, and Sass.
  + It doesn't work at all for Python, JavaScript, and TypeScript.
  + For every other language, if you press `Tab` immediately after breaking out of a comment block, it will insert a commented line, for some unknown reason.
* Sometimes multi-line completion/aseterisk insertion doesn't work. The reason is still unknown. It may go away if you reload your workspace.
* Currently, VS Code only allows extensions to overwrite, instead of modify, existing language configurations. This means that this extension may clash with another extension that overwrites the same language configurations, causing one or both not to work. In that case, uninstalling this extension is the only option for now.

Please create an issue in the [repository](https://github.com/kevinkyang/auto-comment-blocks/issues) if you find any bugs, or have questions or feature requests.

## Release Notes

### 1.0.3
- Added support for JavaScript and TypeScript multiline block comments - a pull request by a-stewart for the original plugin. Fixes issue #27.
- Created a new language config file for Blade to use blade's comments as well as the multiline block comments
- Updated various language config files to reflect a pull request by a-stewart for the original plugin.
- Added support for protocol buffers - a pull request by jun-sheaf for the original plugin.
- Added support for `//!` comments - a pull request by Lucretiel for the original plugin and fixes the issue #25
- Added support for csharp (using the cpp config file) - Fixes the issue #41.
- Updated the support for `/*! */` comments and including the `!` on every line.

### 1.0.2
- Added support for PHP Blade.

### 1.0.0
- Add multi-line comment support for Less, Objective-C/C++, and Swift.
- Add single-line comment blocks for most officially supported languages. See README for more information.
