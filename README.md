# Automatic Comment Blocks

<a href="https://marketplace.visualstudio.com/items?itemName=yCodeTech.automatic-comment-blocks"><img alt="Visual Studio Marketplace Version" src="https://img.shields.io/visual-studio-marketplace/v/yCodeTech.automatic-comment-blocks?style=for-the-badge"></a>&nbsp;&nbsp;
<a href="https://marketplace.visualstudio.com/items?itemName=yCodeTech.automatic-comment-blocks"><img alt="Visual Studio Marketplace Installs" src="https://img.shields.io/visual-studio-marketplace/i/yCodeTech.automatic-comment-blocks?style=for-the-badge">
</a>

A VScode extension that provides block comment completion for Javadoc-style multi-line comments and single-line comment blocks for most officially supported languages

This is a fork of the original by [kevb34ns](https://github.com/kevb34ns/auto-comment-blocks) with lots of additional support.

View the extension on [VScode Marketplace](https://marketplace.visualstudio.com/items?itemName=yCodeTech.automatic-comment-blocks).

---

<table>
<tr align="center">
<td>

[Major changes in v1.1.0](#major-changes-in-v110)

</td>
<td>

[Single-line Comment Blocks](#single-line-comment-blocks)

</td>
<td>

[Multi-line Comment Blocks](#multi-line-comment-blocks)

</td>
<td>

[Language Support](#language-support)

</td>
<td>

[Settings](#settings)

</td>
<td>

[Known Issues](#known-issues)

</td>
</tr>
</table>

---

### As of [v1.1.0](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.0), this extension now automatically adds language support, and no-longer keeps hardcoded language support...

Instead, the extension will automatically find all officially supported languages recognised by VScode internally which are either built-in or added via 3rd party extensions.

There are 3 conditions in which a language is officially supported:

1. The defined language also has a language config file; and
2. The language is not defined in the `skip-languages` config file; and
3. The language config has either `lineComment` or `blockComment` keys defined.

Most of the officially VScode-supported languages (as defined in the [docs](https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers)) pass these conditions.

---

## Major changes in [v1.1.0](https://github.com/yCodeTech/auto-comment-blocks/releases/tag/v1.1.0)

-   Removed hardcoded language config files and support.
-   Added automatic language support.
-   3 new user settings.
-   Support for `/* */`, `##`, `;;`, and `{{--  --}}` (blade comments).

View the [Changelog](/CHANGELOG.md) for more detailed changes/additions/removals.

## Usage

### Single-line Comment Blocks

You can insert single-line comment blocks for languages that use `//`, `#`, or `;`-styles.

Press `shift + enter` while on a commented line to insert a new commented line with the same level of indentation. See the Settings section for how to change the behaviour so that `enter` inserts a commented line while `shift + enter` breaks out of the comment block (this only works correctly for a subset of languages right now).

The Language Support section shows which languages are supported. See the Settings section for how to add single-line comment support to languages that are not officially supported.

### Multi-line Comment Blocks

![Demo](https://raw.githubusercontent.com/kevinkyang/auto-comment-blocks/master/img/demo.gif)

While inside any style of the multi-line comment blocks, when pressing `enter`, the extension will insert an asterisk (`*`) at the start of every new line, and align the comment, respecting indentation.

#### Javadoc-style comment blocks

Type `/**` to start the Javadoc-style block comment, after typing the 2nd `*`, the extension will auto-close the block.

#### QDoc-style (Qt) comment blocks

Use `/*!` in all file types that support the normal `/*` comments to start a QDoc comment block; and like the Javadoc-style, the extension will auto-close the block after the `!` is typed.

#### New: Normal comment blocks

Using the normal comment block `/* */` either typing manually or the native VScode command "Toggle Block Comment" (`editor.action.blockComment`, native keybinding `shift + alt + a`), the block will have the same on enter functionality as described above.

## Language Support

All auto-supported languages are defined in the auto-generated files found in [auto-generated-language-definitions directory](auto-generated-language-definitions) of the repo. Custom supported languages specified by user settings can also appear in these files.

These files are only for documentation purposes and are not used in the extension.

Some languages that appear in the files will have been added from 3rd party language extensions. The supported languages will be different from person to person, dependant on extensions installed/enabled.

## Settings

Reload the extension after changing any settings.

-   `auto-comment-blocks.singleLineBlockOnEnter`: If enabled, pressing `enter` inserts a new commented line at the same indentation, and pressing `shift + enter` breaks the comment block.

    If disabled (the default), a commented line is inserted when `shift + enter` is pressed, and single-line comments are broken by pressing `enter`."

    **Caution**: This feature is buggy in many languages, see [Issues section](#issues).

-   `auto-comment-blocks.disabledLanguages`: Add language IDs here to disable any comment completion for that language.

-   `auto-comment-blocks.slashStyleBlocks`: Add language IDs here to enable '//' and '///'-style single-line comment blocks for that language, allowing unsupported languages to have comment completion.

-   `auto-comment-blocks.hashStyleBlocks`: Add language IDs here to enable `#` and `##`-style single-line comment blocks for that language, allowing unsupported languages to have comment completion.

-   `auto-comment-blocks.semicolonStyleBlocks`: Add language IDs here to enable `;` and `;;`-style single-line comment blocks for that language, allowing unsupported languages to have comment completion.

-   `auto-comment-blocks.multiLineStyleBlocks`: Add language IDs here to enable multi-line comment blocks support for that language, allowing unsupported languages to have comment completion. The default is `['blade', 'html']`"

-   `auto-comment-blocks.overrideDefaultLanguageMultiLineComments`: A key : value pairing of language IDs and the beginning portion of a multi-line comment style, to override the default comment style for the vscode "Toggle Block Comment" `editor.action.blockComment` command (native Keybinding `shift + alt + a`). eg. `{'php': '/*!'}`

-   `auto-comment-blocks.bladeOverrideComments`: When enabled, Blade-style block comments will be used in Blade contexts. Ie. `{{--  --}}` comments will be used instead of the HTML `<!-- -->` comments. Keybinding to enable/disable, default `ctrl + shift + m`. If `blade` language ID is set in the disabledLanguages, then the HTML `<!-- -->` comments will be used.

## Known Issues

-   Sometimes multi-line completion/asterisk insertion doesn't work. The reason is still unknown. It may go away if you reload your workspace.

-   Currently, VS Code only allows extensions to overwrite, instead of modify, existing language configurations. This means that this extension may clash with another extension that overwrites the same language configurations, causing one or both not to work. In that case, uninstalling this extension is the only option for now.

Please create an issue in the [repository](https://github.com/kevinkyang/auto-comment-blocks/issues) if you find any bugs, or have questions or feature requests.
