# ChangeLog

All notable changes to this extension will be documented in this file.

This Changelog uses the [Keep a Changelog](http://keepachangelog.com/) structure.

## [1.1.5](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.5) - 2025-03-02

#### Fixed:

-   Fixes an `ENOENT: no such file or directory` error in [yCodeTech/auto-comment-blocks#4](https://github.com/yCodeTech/auto-comment-blocks/issues/4). When trying to find the extension's package.json. The file path used the current directory `./`, which is redundant while using `__dirname` as well, and certain OS could interpret the file path `/extensions/ycodetech.automatic-comment-blocks-1.1.4/out/src./../../package.json` differently, hence the ENOENT error. Fixed by removing the `.` before the slash.

## [1.1.4](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.4) - 2025-01-06

#### Fixed:

-   When `singleLineBlockOnEnter` setting is `true`, and when then cursor is in the middle of the text, eg. `// text | text`, the comment would not be continued on the next line when `enter` is pressed. Therefore the text after the cursor would not be a comment on the new line and be classed as code. This makes commenting tedious when keeping it clean and tidy with max line lengths.

    Fixed by adding new regex rules to identify when there is text after the cursor. The rules are now merged and duplicates removed instead of just `concat`ing.

-   Fixed the known issue: if you enable the `singleLineBlockOnEnter` setting, for some languages, including C, C++, Sass - pressing `tab` immediately after breaking out of a comment block, will insert a commented line.

    This seems to only happen in languages without `indentationRules`, so it's fixed by adding default indentation rules with empty strings.

    Note: Using empty strings shouldn't have any side effects, but please [report an issue](https://github.com/yCodeTech/auto-comment-blocks/issues/new?title=Default%20indentation%20empty%20string%20issue) if you have any problems with indentation.

-   Fixed an undocumented change that was part of commit 504ce5b, which changed some regexes within the `handleSingleLineBlock` method to use the default onEnterRules config regexes. This accessed the items using array indexes. However, adding more regex rules breaks this functionality for the `auto-comment-blocks.singleLineBlock` keybinding command and will insert the wrong comment style by accessing the wrong array index.

    Reverted back to hardcoding these regexes instead, to keep them separated.

## [1.1.3](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.3) - 2024-12-29

Fixed single-line comments onEnter not working when indented.

Single-line comments when indented didn't add new commented lines when pressing `enter`. Due to more regex patterns not been recognised by VScode internally, and therefore doesn't work properly.

Fixed by reconstructing the regexes for the `previousLineText` property. Also reconstructed regexes for the remaining config properties: `folding` and `indentationRules`.

## [1.1.1 and 1.1.2](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.2) - 2024-12-27

Fixed single-line comments were not inserting new commented lines for any languages when pressing `enter` (when `singleLineBlockOnEnter` was set to true). This is caused by an unknown bug when setting configs with `vscode.languages.setLanguageConfiguration()` and it has regexes in the configs. The regexes weren't been used. By reconstructing the regex before the config is set, it fixes the issue. This also helps when the internal config has some malformed regexes, or regex as strings.

Also, in JavaScript and TypeScript files, pressing tab on an empty line may insert a `*` on that line. Probably the same bug as above, which fixes it. The above regex fix inadvertently fixes [#2](https://github.com/yCodeTech/auto-comment-blocks/issues/2)

Note: v1.1.1 of the extension was released on the marketplace by mistake without a changelog. The official bug fix is [v1.1.2](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.2).

## [1.1.0](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.0) - 2024-12-22

A complete overhaul to enable automatic support for all languages that vscode finds internally (via built-in or 3rd party extensions) that has both a language configuration file, and a comments key in the file.

For a full changelog, view the [release PR](https://github.com/yCodeTech/auto-comment-blocks/pull/1).

#### Removed:

-   All language configuration files and package.json contribution declaration, in favour of auto-supported languages. So this extension no longer needs to keep adding language support, as the extension does it automatically.

#### Added:

-   Added 3 new settings:

    -   `multiLineStyleBlocks` to add support of multi-line block comment to the specified unsupported languages.
    -   `overrideDefaultLanguageMultiLineComments` to override the style of multi-line comments for a language for the native vscode `blockComment` command.

    -   `bladeOverrideComments`, to switch between HTML style `<!-- -->` comments, and Blade style `{{--  --}}` comments, when the file is using the Blade language.

-   Added a keyboard binding to enable/disable the `bladeOverrideComments` setting, and a user information message appears to state whether enabled or disabled.

-   Added support for `/* */`.

-   Added an event to reconfigure the comment blocks evertime a document is opened OR the document language has been changed.

-   Added a config file to define the default multi-line config comments and autoClosingPairs; and a config file to define language IDs the need to be skipped when auto finding the languages to support (because these languages are known not to have any config properties we're interested in.)

-   Added support for double semicolon `;;` and double hash `##` comments.

## [v1.0.3](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.0.3) - 2022-09-17

-   Added support for JavaScript and TypeScript multi-line block comments - a [pull request by a-stewart](https://github.com/kevb34ns/auto-comment-blocks/pull/35) for the original plugin. Fixes issue kevb34ns/auto-comment-blocks#27.
-   Created a new language config file for Blade to use blade's comments as well as the multi-line block comments
-   Updated various language config files to reflect a [pull request by a-stewart](https://github.com/kevb34ns/auto-comment-blocks/pull/37) for the original plugin.
-   Added support for protocol buffers - a [pull request by jun-sheaf](https://github.com/kevb34ns/auto-comment-blocks/pull/30) for the original plugin.
-   Added support for `//!` comments - a [pull request by Lucretiel](https://github.com/kevb34ns/auto-comment-blocks/pull/29) for the original plugin and fixes the issue kevb34ns/auto-comment-blocks#25
-   Added support for csharp(c#) (using the cpp(c++) config file) - Fixes the issue kevb34ns/auto-comment-blocks#41.
-   Updated the support for `/*! */` comments and including the `!` on every line.

## [1.0.2]

-   Added support for PHP Blade.

---

Forked by @yCodeTech from here upwards.

---

## [1.0.1]

-   Add multi-line support for Rust, Go
-   Add single-line support for YAML

## [1.0.0]

-   Add multi-line comment support for Less, Objective-C/C++, and Swift.
-   Add single-line comment blocks for most officially supported languages. See README for more information.

## [0.3.2]

-   Fix a bug that broke the extension, caused by the previous bugfix.

## [0.3.1]

-   Fix bug that that caused every language to have single-line block comments.

## [0.3.0]

-   Add single-line blocks for C/C++ (disabled by default).
-   Add comment completion for PHP files.

## [0.2.2]

-   Add Javadoc-style comments for Groovy files.

## [0.2.1]

-   Fixed misspelled filename leading to C functionality breaking.
-   Change extension description to include support for new languages.

## [0.2.0]

-   Added block comment completion for CSS/Sass files.

## [0.1.0]

-   Add QDoc (Qt-style) comment block completion for C and C++.

## [0.0.5]

-   Fix major typo that caused an asterisk to be inserted following any indented line.
-   Changelog now starts with the latest update rather than the oldest.

## [0.0.4]

-   Fixed an issue that caused asterisk insertion and indentation bugs when indenting using an odd number of spaces.

## [0.0.3]

-   Changed `galleryBanner.theme`, again.

## [0.0.2]

-   Changed `galleryBanner.theme`.

## [0.0.1]

-   Initial release
