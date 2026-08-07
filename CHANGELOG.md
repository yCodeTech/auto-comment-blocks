# ChangeLog

All notable changes to this extension will be documented in this file.

This Changelog uses the [Keep a Changelog](http://keepachangelog.com/) structure.

## [Unreleased]

### Added

- Added introduce new icon artwork and differentiate the extension from the original ([#40](https://github.com/yCodeTech/auto-comment-blocks/pull/40)) by @yCodeTech

    This pull request introduces a new and improved icon artwork with an update to the marketplace banner colour, and updates the extension description. These changes tries to prevent further confusion between the original and forked extensions, as demonstrated in #36 and https://github.com/kevb34ns/auto-comment-blocks/issues/47, by establishing differentiating factors in the marketplace.

    **Visual changes:**

    - Replaced the old flat icon with an improved 3D icon artwork to differentiate the extension from the original (and it's other forked extensions), ensuring it's distinctive but also familiar.
    - Changed the `galleryBanner.color` in `package.json` to use the dark blue `#01092d` from the new icon for improved appearance in the marketplace.

    **Other changes:**

    - Updated the `description` field in `package.json` to clarify that block comment completion is now available for all auto-supported languages, not just officially supported ones.
    - Added `.env` to `.vscodeignore` to ensure environment files are excluded from VS Code extension packaging during testing.
    - Added `icon.psd` to `.gitignore` to prevent committing the Photoshop file of the icon.

    **Documentation changes:**

    - Added the new icon into the `README.md` title so the new logo/icon is visible on the docs too which creates a better distinction in the repo.
    - Updated the fork info to specify who publishes/maintains the extension, so that it's explicit that this extension is owned by me.

<!-- end -->

- Added logging levels ([#42](https://github.com/yCodeTech/auto-comment-blocks/pull/42)) by @yCodeTech

    This pull request introduces a configurable logging level to the extension, allowing users to control the verbosity of log output. It also improves logging practices by redacting sensitive or irrelevant information from logs, restructures some logging logic for clarity and safety, and enhances the handling of document events and JSON parsing. The most important changes are:

    **Logging Level Configuration and Handling:**

    - Added a new `auto-comment-blocks.logLevel` setting to `package.json`, allowing users to set the logging level (`debug`, `info`, `error`, `off`) for the extension.
    - Refactored the `Logger` class in `src/logger.ts` to support log levels, including methods to set the log level, check if a message should be logged, and always emit "important" messages regardless of log level (ie. the extension name and version).
    - Updated extension activation logic in `src/extension.ts` to initialize and update the logger's log level based on user configuration, and to log extension metadata on activation.

    **Configuration and Settings Integration:**

    - Extended the `Settings` interface and related types to include the new `logLevel` property, ensuring the log level is accessible throughout the extension.

    **Logging Data Redaction:**

    - Enhanced the `ExtensionData` class to redact irrelevant or sensitive information (like `packageJSON`) from logs, ensuring only necessary details are logged.

    **Event Handling Improvements:**

    - Improved the logic for handling document open events to avoid unnecessary reconfiguration for virtual documents and clarified logging messages.

    **Utility and Error Handling Enhancements:**

    - Refactored JSON file reading and parsing in `src/utils.ts` to separate parsing logic and improve error handling, making it easier to maintain and debug.

<!-- end -->

- Added redact username in logging paths ([#45](https://github.com/yCodeTech/auto-comment-blocks/pull/45)) by @yCodeTech

    This pull request introduces a new warning log level and improves logging safety by redacting OS usernames in paths from log output. It also refines the handling of extension discovery paths and updates log level descriptions for clarity.

    **Logging improvements:**

    - Added a new `warn` log level, including support in the logger, log level comparisons, and the `logLevels` utils constant.
    - Implemented automatic redaction of the current OS username from all log messages and data to prevent accidental leaking of sensitive information. If the username cannot be determined, a warning is logged once per session while avoiding infinite recursion, and further redaction attempts are skipped.

    **Configuration and API updates:**

    - Updated log level descriptions in `package.json` to reflect the new `warn` level and clarify which messages are included at each level.
    - The `getAllExtensionDiscoveryPaths` method now returns a new `Map` to prevent external mutation of internal state.

    **Other changes:**

    - Minor code formatting and comments for clarity in configuration and extension data classes.

<!-- end -->

### Changed

- Refactored logging environment variables ([#43](https://github.com/yCodeTech/auto-comment-blocks/pull/43)) by @yCodeTech

    This pull request updates the way environment and extension path information is logged in the `Configuration` class, streamlining the debug output and focusing on relevant environment variables. The most important changes are:

    **Environment and Extension Path Logging:**

    - Removed the logging of the extension discovery paths from the `logDebugInfo` method as these are also logged in `extension.ts`, so they're technically redundant in the method.
    - Added logging of the `App Root` and filtered environment variables (only those starting with `VSCODE_`) under `Env Vars` in the environment details, making the debug output more focused and relevant in `logDebugInfo` method.

    **Removal of dumping system environment variables into the logs**

    - Removed logging of the dumped system environment variables as they could potentially have some sensitive information like environment passwords, auth keys, etc. Majority of it wasn't relevant to debugging anyway.

<!-- end -->

## [1.1.17](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.17) - 2026-07-25

### Fixed

- Fixed JSON parsing with trailing commas enabled ([#37](https://github.com/yCodeTech/auto-comment-blocks/pull/37)) by @yCodeTech

    Fixes #36.

    **The issue**

    This extension uses [jsonc-parser](https://github.com/microsoft/node-jsonc-parser) to make sure the syntax of the JSON is correct and not malformed. During parsing of JSON files, the parser will throw a `ValueExpected` error when it reaches a comma and unexpectedly encounters a closing bracket straight after. Trailing commas are disabled in the parser by default as it's not standard in JSON or JSONC. So it expects some kind of value after all commas.

    **The fix**

    Luckily, the parser has an option to enable trailing commas. So the fix is to just pass the `allowTrailingComma: true` option to the parser in the `readJsonFile` util function. This will then skip over and prevent the `ValueExpected` error for trailing commas.

    ***

    **Copilot Summary**

    This pull request improves the robustness and clarity of JSON file parsing in the `src/utils.ts` utility functions. The key changes enhance error handling and allow for more flexible JSON syntax.

    **JSON parsing improvements:**

    - The `readJsonFile` function now allows trailing commas in JSON files by setting the `allowTrailingComma: true` option in the `jsonc.parse` call. This makes the parser more permissive and user-friendly.

    **Error reporting enhancements:**

    - The `constructJsonParseErrorMsg` function now includes both the raw error code (in brackets) and a more readable, space-separated error name in its output. This provides clearer and more informative error messages for debugging JSON parsing issues.

<!-- end -->

## [1.1.16](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.16) - 2026-06-03

### Fixed

- Fixed ENOENT error with the new VScode commit hash directory for Windows built in extensions in WSL ([#33](https://github.com/yCodeTech/auto-comment-blocks/pull/33)) by @yCodeTech

    This pull request improves the way the extension discovers and handles the Windows built-in extensions path when running inside WSL (Windows Subsystem for Linux). It introduces robust detection logic to support both legacy and new VS Code installation paths, adds error handling and user notifications for failures, and ensures that discovery failures are only surfaced once per session/activation.

    Fixes #32.

    **Windows built-in extensions path resolution improvements:**

    - Added logic in `ExtensionData` to detect both the legacy and new hashed commit-based install paths for built-in extensions under WSL, including directory scanning and caching of results to avoid repeated disk access.
    - Added error handling and user notification for failures to resolve the built-in extensions path, including logging and a one-time warning message with an option to open the output channel.
    - Introduced new constructor options and internal flags in `ExtensionData` to control whether discovery path failures should notify the user, preventing duplicate warnings from multiple instances.

    **Integration and usage updates:**

    - Updated the extension activation in `extension.ts` to pass the new constructor parameter, enabling user notification for the main extension instance only.
    - Updated `Configuration` logic to handle cases where the Windows extensions paths are not resolved, preventing errors by falling back to empty arrays.

          <!-- end -->

## [1.1.15](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.15) - 2026-04-19

### Fixed

- Fixed update vscode types package and clean up now unused line comment types ([#26](https://github.com/yCodeTech/auto-comment-blocks/pull/26)) by @yCodeTech

    VScode updated their types to include the LineComment typings and released 1.110 of @types/vscode package. So our temporary custom `LineComment` type and `LineCommentConfig` interface is now redundant.
    - Updated @types/vscode package to 1.110.
    - Removed the temporary `LineComment` type and `LineCommentConfig` interface, and removed the references in configuration file.
        <!-- end -->

### Changed

- Refactored extension activation and performance improvements ([#29](https://github.com/yCodeTech/auto-comment-blocks/pull/29)) by @yCodeTech
    - Refactored the `activate` function to set up the logger first, initialize extension data and configuration.

    - Ensured that development environment variables are only loaded when not in production mode, i.e. in development or testing modes.

    - Consolidated multiple configuration change handlers into a single handler that checks for a list of settings requiring extension reload. If any are changed, a single reload prompt is shown using the new `showReloadMessage` helper function, reducing code duplication.

    - Improved performance and event handling to prevent memory leaks by properly disposing of old comment configurations.
      <!-- end -->

- Refactored configuration class ([#30](https://github.com/yCodeTech/auto-comment-blocks/pull/30)) by @yCodeTech
    - Extracted the logic for determining the appropriate Blade or HTML comment style into a new private method `getBladeOrHtmlComments`, simplifying the public API and improving clarity. The `setBladeComments` method now only sets the configuration and no longer returns values based on an `onStart` flag (the flag was removed in favour using the new private method directly).

    - Replaced repetitive code for adding custom single-line comment languages with a new private method `addCustomSingleLineLanguages`, reducing duplication and improving maintainability.

    - Replaced `var` with `let` for variable declarations in several places to align with modern best practices.
          <!-- end -->

## [1.1.14](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.14) - 2026-02-23

This release focuses on improving the code quality, maintainability and readability of the code. There are no new features or breaking changes in this release, but it includes various fixes from the previous pre-release.

View the [full changelog](https://github.com/yCodeTech/auto-comment-blocks/compare/v1.1.12...v1.1.14).

#### Fixed:

- See fixes from [1.1.13 Pre-release 1](#1113-pre-release-1---2025-12-08)

- Fix typings and introduce interfaces to improve type safety, code maintainability and readability via PR [#20](https://github.com/yCodeTech/auto-comment-blocks/pull/20).

## [1.1.13 Pre-release 1](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.13-prerelease.1) - 2025-12-08

#### Fixed:

- Fixes various errors brought up in comments in [#14](https://github.com/yCodeTech/auto-comment-blocks/issues/14) via PR [#17](https://github.com/yCodeTech/auto-comment-blocks/pull/17)
    - Fixes `Invalid Symbol` parsing error due to the file being encoded with a Byte Order Mark (BOM). Removed the BOM and explicitly read files as UTF-8 encoding.
    - Fixes `Value Expected` parsing error due to the parser erroring on empty files. Added an extra option to prevent erroring and allow empty files.

## [1.1.12](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.12) - 2025-12-05

#### Fixed:

- Fixes [#14](https://github.com/yCodeTech/auto-comment-blocks/issues/14) via PR [#15](https://github.com/yCodeTech/auto-comment-blocks/pull/15)

    The extension crashes on startup with the `Cannot convert undefined or null to object` error. This is caused by the `Object.keys` in `Configuration::setLanguageConfigDefinitions` method because the config JSON file failed to parse in the `readJsonFile` util function which made the config `null`.

    When the "jsonc-parser" package encounters a problem parsing the JSON via its `parse` function, it just returns `null` instead of erroring.
    - Fixed by adding proper error handling, logging and showing a user error dialog when parse errors occur, directly from `readJsonFile` function.

        If errors occur, the error will be thrown from `readJsonFile` which will fail extension startup and crash, this is to provide easier debugging, instead of waiting for subsequent code that relies on the function from crashing the extension with an unrelated error.

## [1.1.11](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.11) - 2025-10-17

#### Fixed:

- Fixes [yCodeTech/auto-comment-blocks#13](https://github.com/yCodeTech/auto-comment-blocks/issues/13)

    VScode has inconsistencies between it's API and the language configuration JSON files. In the onEnter rules, JSON files have the property `action.indent` whereas the API has `action.indentAction`. When merging the auto-found language config files and the extension's onEnter comment rules, VScode couldn't handle the mixed formats properly, causing the braces to not expand correctly as documented in the issue.

    Fixed by normalizing the property to the API format and converting it's values.

## [1.1.10](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.10) - 2025-07-21

#### Fixed:

- Fixes yCodeTech/auto-comment-blocks#6 and indirectly yCodeTech/auto-comment-blocks#7

    VS Code's `vscode.extensions.all` API doesn't find any built-in extensions on the Windows-side when running in WSL. It only gets the WSL-installed extensions, which causes the extension not to work at all because the language configuration file is not found.

    The workaround fix is to manually read the Windows extensions directories when running in WSL and merge them with the WSL-installed extensions.

- Fixed language support detection to properly respect disabled language settings.

    Custom language configurations now correctly check if a language is disabled before applying support, preventing unwanted language activation.

- Fixed support for languages with multiple extension configuration files by merging their configurations instead of overwriting them, ensuring complete language support. Also improved language configuration merging by properly handling comment configurations.

#### Added:

- Added the ability to get the all extensions directly from the directory on non-WSL systems (eg. Windows) because VS Code's `extensions.all` API only gets enabled extensions and doesn't include disabled ones, which could prevent language configs being found.
    - Removed `vscode.extensions.all` API call from `findAllLanguageConfigFilePaths` method in favour of getting the extensions directly from the directories.

- Added new dependencies:
    - `is-wsl` for detecting WSL environments.
    - `package-json-type` for TypeScript type definitions of package.json.

- Added macOS keybinding support (`cmd+shift+m`) for the Blade override comments command.

#### Changed:

- Refactored extension architecture with improved separation of concerns.

    Major code reorganisation including extraction of utility functions, centralised extension data management, and improved debugging capabilities.
    - Added new `ExtensionData` class to centralize extension metadata management.

        This new class provides a clean interface for accessing extension details like ID, name, version, and various system paths, improving code organisation and maintainability.

    - Added new `utils.ts` file with shared utility functions.

        Extracted common functionality into reusable utility functions including JSON file operations, regex reconstruction, array merging, and data conversion utilities.

- Updated debug logging to provide more comprehensive environment and configuration information. Enhanced diagnostic output now includes detailed extension paths for both WSL and native environments, making troubleshooting easier.

## [1.1.9](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.9) - 2025-07-12

#### Fixed:

- Fixes yCodeTech/auto-comment-blocks#10

    The `lineComment` language config key has changed to be either a string or an object. With the object having `comment` and `noIndent` keys, which was introduced in VS Code's June 2025 release. This breaks the extension when encountering the `makefile` language, and an error occurs:

    > lineComment.includes is not a function

    To fix:
    - Added a check to see if the `lineComment` is an object with a `comment` key inside, if it does then use the string value of the `comment` key. Otherwise, it will use the string value of the `lineComment`.

## [1.1.8](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.8) - 2025-06-19

#### Fixed:

- Fixed `Logger::logMessage` not logging regex meta data. When a log's extra `debug` data contains a `RegExp` object, `JSON.stringify` can not convert it to a string, so it just outputs an empty object `{}` in the Output channel. This is useless for debugging.

    Fixed by adding a new `Logger::metaReplacer` method to use as a replacer function in the `JSON.stringify` method's replacer arg. This new method will convert all instances of `RegExp` to it's string representation ready for output in the channel.

#### Changed:

- Refactor `Logger::logMessage` by moving the `JSON.stringify` call to a new `formatMeta` method.

- Refactored the logging of `debug` meta data objects in the `Configuration::constructor` method:
    - Removed all `Object.fromEntries` calls from the debug logging in the `Configuration::constructor` method.

    - Added a new `if` condition in the `Logger::metaReplacer` method, to allow all `Map` objects to be converted to plain objects via `Object.fromEntries`.

    This prevents having to wrap multiple variables evaluating to `Map` objects inside `Object.fromEntries` themselves, like it was done previously.

#### Added:

- Added the logging of:
    - The extension's user config settings.
    - Various VS Code environment info.
    - Various System environment info.

    This allows for a more complete debugging diagnostic report.

## [1.1.7](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.7) - 2025-06-13

#### Added:

- Added the ability to log debug information to a dedicated `Auto Comment Blocks` channel in the Output panel. This is to help diagnose issues quicker.
    - Added new `Logger` class to implement the functionality of the logging info to the Output panel.

        Uses VScode's `OutputChannel` interface under the hood for logging, and creating the dedicated `Auto Comment Blocks` Output channel.

        Using this class we can log `info`, `debug`, and `error` messages to the channel. The `debug` method can output objects and arrays.

    - Added a call to the new Logger class in the main `extension` file to initialise the logger, and setup the channel.

    - Added a `info` logger to the `onDidOpenTextDocument` event in the main `extension` file, to make sure we can identify in the Output when the active language has changed before any other debug info is logged.

    - Added the Logger's `disposeLogger` method call to the `deactivate` method in the main `extension` file.

    - Added a new private property and a new param in the `constructor` method of the `Configuration` class, to allow the instance of the logger created in the main `extension` file to be carried over without being re-initialised.

    - Added `info` logs for the extension id and version to the `constructor` method of the `Configuration` class.

    - Changed all `console.log` to use the new logger.

## [1.1.6](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.6) - 2025-05-01

#### Added:

- Added the ability to auto-publish to Open VSX Registry as well as VS Code Marketplace upon release (via GitHub Action) as requested in [yCodeTech/auto-comment-blocks#5](https://github.com/yCodeTech/auto-comment-blocks/issues/5).

- Added the ability for the extension to automatically create the `auto-generated-language-definitions` directory if it doesn't exist.

    This is because the auto-generated files will no longer be packaged into the .vsix file, therefore the directory won't exist either.
    - Added new `autoGeneratedDir` property in `Configuration` class to define the `auto-generated-language-definitions` directory.

    - Changed both `singleLineLangDefinitionFilePath` and `multiLineLangDefinitionFilePath` properties in `Configuration` class to use the new `autoGeneratedDir` property.

    - Changed `writeJsonFile` method in `Configuration` class to check if the `auto-generated-language-definitions` directory exists, and to create it if it doesn't. This uses the new `autoGeneratedDir` property.

## [1.1.5](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.5) - 2025-03-02

#### Fixed:

- Fixes an `ENOENT: no such file or directory` error in [yCodeTech/auto-comment-blocks#4](https://github.com/yCodeTech/auto-comment-blocks/issues/4). When trying to find the extension's package.json. The file path used the current directory `./`, which is redundant while using `__dirname` as well, and certain OS could interpret the file path `/extensions/ycodetech.automatic-comment-blocks-1.1.4/out/src./../../package.json` differently, hence the ENOENT error. Fixed by removing the `.` before the slash.

## [1.1.4](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.4) - 2025-01-06

#### Fixed:

- When `singleLineBlockOnEnter` setting is `true`, and when then cursor is in the middle of the text, eg. `// text | text`, the comment would not be continued on the next line when `enter` is pressed. Therefore the text after the cursor would not be a comment on the new line and be classed as code. This makes commenting tedious when keeping it clean and tidy with max line lengths.

    Fixed by adding new regex rules to identify when there is text after the cursor. The rules are now merged and duplicates removed instead of just `concat`ing.

- Fixed the known issue: if you enable the `singleLineBlockOnEnter` setting, for some languages, including C, C++, Sass - pressing `tab` immediately after breaking out of a comment block, will insert a commented line.

    This seems to only happen in languages without `indentationRules`, so it's fixed by adding default indentation rules with empty strings.

    Note: Using empty strings shouldn't have any side effects, but please [report an issue](https://github.com/yCodeTech/auto-comment-blocks/issues/new?title=Default%20indentation%20empty%20string%20issue) if you have any problems with indentation.

- Fixed an undocumented change that was part of commit 504ce5b, which changed some regexes within the `handleSingleLineBlock` method to use the default onEnterRules config regexes. This accessed the items using array indexes. However, adding more regex rules breaks this functionality for the `auto-comment-blocks.singleLineBlock` keybinding command and will insert the wrong comment style by accessing the wrong array index.

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

- All language configuration files and package.json contribution declaration, in favour of auto-supported languages. So this extension no longer needs to keep adding language support, as the extension does it automatically.

#### Added:

- Added 3 new settings:
    - `multiLineStyleBlocks` to add support of multi-line block comment to the specified unsupported languages.
    - `overrideDefaultLanguageMultiLineComments` to override the style of multi-line comments for a language for the native vscode `blockComment` command.

    - `bladeOverrideComments`, to switch between HTML style `<!-- -->` comments, and Blade style `{{--  --}}` comments, when the file is using the Blade language.

- Added a keyboard binding to enable/disable the `bladeOverrideComments` setting, and a user information message appears to state whether enabled or disabled.

- Added support for `/* */`.

- Added an event to reconfigure the comment blocks everytime a document is opened OR the document language has been changed, so that other extensions (that are activated after this one) don't override the language configurations which could disable some of the custom comment blocks (e.g `/*! */`).

- Added a config file to define the default multi-line config comments and autoClosingPairs; and a config file to define language IDs the need to be skipped when auto finding the languages to support (because these languages are known not to have any config properties we're interested in.)

- Added support for double semicolon `;;` and double hash `##` comments.

## [v1.0.3](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.0.3) - 2022-09-17

- Added support for JavaScript and TypeScript multi-line block comments - a [pull request by a-stewart](https://github.com/kevb34ns/auto-comment-blocks/pull/35) for the original plugin. Fixes issue kevb34ns/auto-comment-blocks#27.
- Created a new language config file for Blade to use blade's comments as well as the multi-line block comments
- Updated various language config files to reflect a [pull request by a-stewart](https://github.com/kevb34ns/auto-comment-blocks/pull/37) for the original plugin.
- Added support for protocol buffers - a [pull request by jun-sheaf](https://github.com/kevb34ns/auto-comment-blocks/pull/30) for the original plugin.
- Added support for `//!` comments - a [pull request by Lucretiel](https://github.com/kevb34ns/auto-comment-blocks/pull/29) for the original plugin and fixes the issue kevb34ns/auto-comment-blocks#25
- Added support for csharp(c#) (using the cpp(c++) config file) - Fixes the issue kevb34ns/auto-comment-blocks#41.
- Updated the support for `/*! */` comments and including the `!` on every line.

## [1.0.2]

- Added support for PHP Blade.

---

Forked by @yCodeTech from here upwards.

---

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
