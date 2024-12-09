"use strict";
/* https://code.visualstudio.com/api/language-extensions/language-configuration-guide */

import * as vscode from "vscode";
import * as fs from "node:fs";
import * as jsonc from "jsonc-parser";
import * as path from "path";

import {Rules} from "./rules";

export class Configuration {
	/**************
	 * Properties *
	 **************/

	/**
	 * A key:value Map object of language IDs and their config file paths.
	 */
	private languageConfigFilePaths = new Map<string, string>();

	/**
	 * A key:value Map object of language IDs and their configs.
	 */
	private readonly languageConfigs = new Map<string, vscode.LanguageConfiguration>();

	/**
	 * A key:value Map object of supported language IDs and their single line style comments.
	 *
	 * @property {string} key Language ID.
	 * @property {string} value Style of line comment.
	 */
	private singleLineBlocksMap: Map<string, string> = new Map();

	/**
	 * A Map object of an array of supported language IDs for multi line block comments.
	 *
	 * @property {string} key - "languages"
	 * @property {string[]} value - Array of language IDs.
	 */
	private multiLineBlocksMap: Map<string, string[]> = new Map();

	private readonly singleLineLangDefinitionFilePath = `${__dirname}/../../auto-generated-language-definitions/single-line-languages.json`;

	private readonly multiLineLangDefinitionFilePath = `${__dirname}/../../auto-generated-language-definitions/multi-line-languages.json`;

	/***********
	 * Methods *
	 ***********/

	public constructor() {
		this.findAllLanguageConfigFilePaths();
		console.log(this.languageConfigFilePaths);
		this.setLanguageConfigDefinitions();
		console.log("language configs", this.languageConfigs);

		this.setMultiLineCommentLanguageDefinitions();
		console.log(this.multiLineBlocksMap);
		this.setSingleLineCommentLanguageDefinitions();
		console.log(this.singleLineBlocksMap);
	}

	/**
	 * Configure the comment blocks.
	 *
	 * @param {vscode.ExtensionContext} context The context of the extension.
	 * @returns {vscode.Disposable[]}
	 */
	configureCommentBlocks(context: vscode.ExtensionContext) {
		const disposables: vscode.Disposable[] = [];

		// Set language configurations
		const singleLineLangs = this.getSingleLineLanguages();
		const multiLineLangs = this.getMultiLineLanguages();

		// Setup the single line languages.
		for (let [langId, style] of this.singleLineBlocksMap) {
			// Set a bool if the single line language also supports multi line comments
			// (ie. the single line language is also present in the multi line map);
			let multiLine = multiLineLangs.includes(langId);
			disposables.push(this.setLanguageConfiguration(langId, multiLine, style));
		}

		// Setup the multi line languages.
		for (let langId of multiLineLangs) {
			// If singleLineLangs doesn't have the langId, AND
			// the langId isn't set as disabled...
			if (!this.singleLineBlocksMap.has(langId) && !this.isLangIdDisabled(langId)) {
				disposables.push(this.setLanguageConfiguration(langId, true));
			}
		}

		return disposables;
	}

	/**
	 * Register some VSCode commands.
	 *
	 * @returns {vscode.Disposable[]}
	 */
	public registerCommands() {
		const singleLineBlockCommand = vscode.commands.registerTextEditorCommand("auto-comment-blocks.singleLineBlock", (textEditor, edit, args) => {
			this.handleSingleLineBlock(textEditor, edit);
		});
		const changeBladeMultiLineBlockCommand = vscode.commands.registerTextEditorCommand(
			"auto-comment-blocks.changeBladeMultiLineBlock",
			(textEditor, edit, args) => {
				this.handleChangeBladeMultiLineBlock(textEditor);
			}
		);
		return [singleLineBlockCommand, changeBladeMultiLineBlockCommand];
	}

	/**
	 * Sets the block comments for the blade language determined by the user setting.
	 *
	 * @param bladeOverrideComments A boolean indicating whether or not the user setting "Blade Override Comments" is enabled.
	 *
	 * @param [onStart=false] A boolean indicating whether or not the method was called
	 * on starting the extension.
	 * If `true`, it returns the comments, if `false` (default), it sets the comments to
	 * the language directly.
	 *
	 */
	public setBladeComments(bladeOverrideComments: boolean, onStart: boolean = false): any {
		// Is enabled AND blade langId is NOT set as disabled...
		if (bladeOverrideComments === true && !this.isLangIdDisabled("blade")) {
			if (onStart) {
				return ["{{--", "--}}"];
			} else {
				vscode.languages.setLanguageConfiguration("blade", {
					comments: {
						blockComment: ["{{--", "--}}"],
					},
				});
			}
		}
		// Is disabled OR blade langId is set as disabled...
		else if (!bladeOverrideComments || this.isLangIdDisabled("blade")) {
			if (onStart) {
				return ["<!--", "-->"];
			} else {
				vscode.languages.setLanguageConfiguration("blade", {
					comments: {
						blockComment: ["<!--", "-->"],
					},
				});
			}
		}
	}

	/**
	 * Get the names and ids of this extension from package.json.
	 *
	 * @returns {object} An object containing the extension id, name, and display name.
	 */
	public getExtensionNames() {
		const packageJSON = JSON.parse(fs.readFileSync(__dirname + "./../../package.json").toString());

		const displayName: string = packageJSON.displayName;
		const fullname: string = packageJSON.name;
		const id: string = `${packageJSON.publisher}.${fullname}`;

		let nameParts = fullname.split("-");
		nameParts[0] = "auto";
		const name = nameParts.join("-");

		return {id: id, name: name, displayName: displayName};
	}

	/**
	 * Get extension user configuration settings.
	 *
	 * @returns {vscode.WorkspaceConfiguration}
	 */
	public getConfiguration(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration(this.getExtensionNames().name, null);
	}

	/**
	 * Is the language ID disabled?
	 * @param {string} langId Language ID
	 * @returns {boolean}
	 */
	public isLangIdDisabled(langId: string): boolean {
		return this.getConfiguration().get<string[]>("disabledLanguages").includes(langId);
	}

	/**
	 * Is the multi-line comment overridden for the specified language ID?
	 *
	 * @param {string} langId Language ID
	 * @returns {boolean}
	 */
	private isLangIdMultiLineCommentOverridden(langId: string): boolean {
		const overriddenList = this.getConfiguration().get<string[]>("overrideDefaultLanguageMultiLineComments");

		return overriddenList.hasOwnProperty(langId);
	}

	/**
	 * Get the overridden multi-line comment for the specified language ID.
	 *
	 * @param {string} langId Language ID
	 * @returns {string}
	 */
	private getOverriddenMultiLineComment(langId: string) {
		const overriddenList = this.getConfiguration().get<string[]>("overrideDefaultLanguageMultiLineComments");

		return overriddenList[langId];
	}

	/**
	 * Get an array of languages to skip, like plaintext, that don't have comment syntax
	 *
	 * Idea from this StackOverflow answer https://stackoverflow.com/a/72988011/2358222
	 *
	 * @returns {string[]}
	 */
	private getLanguagesToSkip(): string[] {
		const json = this.readJsonFile(`${__dirname}/../../config/skip-languages.jsonc`);
		return json.languages;
	}

	/**
	 * Find all language config file paths from vscode installed extensions
	 * (built-in and 3rd party).
	 */
	private findAllLanguageConfigFilePaths() {
		// Loop through all installed extensions, including built-in extensions
		for (let extension of vscode.extensions.all) {
			const packageJSON = extension.packageJSON;

			// If an extension package.json has "contributes" key,
			// AND the contributes object has "languages" key...
			if (Object.hasOwn(packageJSON, "contributes") && Object.hasOwn(packageJSON.contributes, "languages")) {
				// Loop through the languages...
				for (let language of packageJSON.contributes.languages) {
					// Get the languages to skip.
					let skipLangs = this.getLanguagesToSkip();

					// If skipLangs doesn't include the language ID,
					// AND the language object has "configuration" key...
					if (!skipLangs?.includes(language.id) && Object.hasOwn(language, "configuration")) {
						// Join the extension path with the configuration path.
						let configPath = path.join(extension.extensionPath, language.configuration);
						// Set the language ID and config path into the languageConfigFilePaths Map.
						this.languageConfigFilePaths.set(language.id, configPath);
					}
				}
			}
		}

		// Set the languageConfigFilePaths to a new map with all the languages sorted in
		// ascending order,for sanity reasons.
		this.languageConfigFilePaths = new Map([...this.languageConfigFilePaths].sort());
	}

	/**
	 * Set the language config definitions.
	 */
	private setLanguageConfigDefinitions() {
		this.languageConfigFilePaths.forEach((filepath, langId) => {
			const config = this.readJsonFile(filepath);

			// If the config JSON has more than 0 keys (ie. not empty)
			if (Object.keys(config).length > 0) {
				/**
				 * Change all autoClosingPairs items that are using the simpler syntax
				 * (array instead of object) into the object with open and close keys.
				 * Prevents vscode from failing quietly and not changing the editor language
				 * properly, which makes the open file become unresponsive when changing tabs.
				 */

				// If config has key autoClosingPairs...
				if (Object.hasOwn(config, "autoClosingPairs")) {
					// Define a new array as the new AutoClosingPair.
					const autoClosingPairsArray: vscode.AutoClosingPair[] = [];
					// Loop through the config's autoClosingPairs...
					config.autoClosingPairs.forEach((item) => {
						// If the item is an array...
						if (Array.isArray(item)) {
							// Create a new object with the 1st array element [0] as the
							// value of the open key, and the 2nd element [1] as the value
							// of the close key.
							const autoClosingPairsObj = {open: item[0], close: item[1]};
							// Push the object into the new array.
							autoClosingPairsArray.push(autoClosingPairsObj);
						}
						// Otherwise, the item is an object, so just push it into the array.
						else {
							autoClosingPairsArray.push(item);
						}
					});

					// Add the new array to the config's autoClosingPairs key.
					config.autoClosingPairs = autoClosingPairsArray;
				}

				// Set the language configs into the Map.
				this.languageConfigs.set(langId, config);
			}
		});
	}

	/**
	 * Get the config of the specified language.
	 *
	 * @param langId Language ID
	 * @returns {vscode.LanguageConfiguration | undefined}
	 */
	private getLanguageConfig(langId: string) {
		if (this.languageConfigs.has(langId)) {
			return this.languageConfigs.get(langId);
		}
		// If no config exists for this language, back out and leave the language unsupported
		else {
			return undefined;
		}
	}

	/**
	 * Read the file and parse the JSON.
	 *
	 * @param {string} filepath The path of the file.
	 * @returns The file content.
	 */
	private readJsonFile(filepath: string): any {
		return jsonc.parse(fs.readFileSync(filepath).toString());
	}

	/**
	 * Read the file and parse the JSON.
	 *
	 * @param {string} filepath The path of the file.
	 * @param {any} data The data to write into the file.
	 * @returns The file content.
	 */
	private writeJsonFile(filepath: string, data: any): any {
		// Write the updated JSON back into the file and add tab indentation
		// to make it easier to read.
		fs.writeFileSync(filepath, JSON.stringify(data, null, "\t"));
	}

	/**
	 * Get the multi-line languages from the Map.
	 *
	 * @returns {string[]} An array of language ID strings.
	 */
	private getMultiLineLanguages(): string[] {
		return this.multiLineBlocksMap.get("languages");
	}

	/**
	 * Get the single-line languages and styles.
	 *
	 * @returns {Map<string, string>} The Map of the languages and styles.
	 */
	private getSingleLineLanguages(): Map<string, string> {
		return this.singleLineBlocksMap;
	}

	/**
	 * Set the multi-line comments language definitions.
	 */
	private setMultiLineCommentLanguageDefinitions() {
		let langArray = [];

		this.languageConfigs.forEach((config: any, langId: string) => {
			// If the config object has own property of comments AND the comments key has
			// own property of blockComment...
			if (Object.hasOwn(config, "comments") && Object.hasOwn(config.comments, "blockComment")) {
				// If the blockComment array includes the multi line start of "/*"...
				if (config.comments.blockComment.includes("/*")) {
					// console.log(langId, config.comments);

					// If Language ID isn't already in the langArray...
					if (!langArray.includes(langId)) {
						langArray.push(langId);
					}
				}
			}
		});

		const multiLineStyleBlocksLangs = this.getConfiguration().get<string[]>("multiLineStyleBlocks");

		for (let langId of multiLineStyleBlocksLangs) {
			if (langId && langId.length > 0 && !langArray.includes(langId)) {
				langArray.push(langId);
			}
		}

		// Set the language array into the multiLineBlockMap, sorted in ascending order,
		// for sanity reasons.
		this.multiLineBlocksMap.set("languages", langArray.sort());

		this.writeCommentLanguageDefinitionsToJsonFile();
	}

	/**
	 * Set the single-line comments language definitions.
	 */
	private setSingleLineCommentLanguageDefinitions() {
		let style: string;

		this.languageConfigs.forEach((config: any, langId: string) => {
			// console.log(langId, config.comments.lineComment);
			let style: string = "";

			// If the config object has own property of comments AND the comments key has
			// own property of lineComment...
			if (Object.hasOwn(config, "comments") && Object.hasOwn(config.comments, "lineComment")) {
				// If the lineComment is "//"...
				if (config.comments.lineComment === "//") {
					style = "//";
				}
				// If the lineComment is "#"...
				else if (config.comments.lineComment === "#") {
					style = "#";
				}
				// If the lineComment includes a ";" (; or ;;)...
				else if (config.comments.lineComment.includes(";")) {
					style = ";";
				}

				// If style any empty string, (i.e. not an unsupported single line
				// comment like bat's @rem)...
				if (style != "") {
					// Set the langId and it's style into the Map.
					this.singleLineBlocksMap.set(langId, style);
				}
			}
		});

		// Get user-customized langIds for the //-style and add to the map.
		let customSlashLangs = this.getConfiguration().get<string[]>("slashStyleBlocks");
		for (let langId of customSlashLangs) {
			if (langId && langId.length > 0) {
				this.singleLineBlocksMap.set(langId, "//");
			}
		}

		// Get user-customized langIds for the #-style and add to the map.
		let customHashLangs = this.getConfiguration().get<string[]>("hashStyleBlocks");
		for (let langId of customHashLangs) {
			if (langId && langId.length > 0) {
				this.singleLineBlocksMap.set(langId, "#");
			}
		}

		// Get user-customized langIds for the ;-style and add to the map.
		let customSemicolonLangs = this.getConfiguration().get<string[]>("semicolonStyleBlocks");
		for (let langId of customSemicolonLangs) {
			if (langId && langId.length > 0) {
				this.singleLineBlocksMap.set(langId, ";");
			}
		}

		// Set the singleLineBlockMap to a new map with all the languages sorted in ascending order,
		// for sanity reasons.
		this.singleLineBlocksMap = new Map([...this.singleLineBlocksMap].sort());

		this.writeCommentLanguageDefinitionsToJsonFile();
	}

	/**
	 * Write Comment Language Definitions to the respective JSON file:
	 * either multi-line-languages.json, or single-line-languages.json.
	 */
	private writeCommentLanguageDefinitionsToJsonFile() {
		// Convert a key:value Map into an key:array object, while reversing/switching the
		// keys and values. The Map's values are now the keys of the object and the Map's keys
		// are now added as the values of the array.
		// e.g. From `Map {apacheconf => #, c => //, clojure => ;, coffeescript => #, cpp => //, …}`
		// to `{"#": ["apacheconf", "coffeescript", ...], "//": ["c", "cpp", ...],
		// ";": ["clojure", ...]}`
		//
		// Code from this StackOverflow answer https://stackoverflow.com/a/45728850/2358222
		const reverseMapping = (m: Map<string, string>): object => {
			const o = Object.fromEntries(m);

			return Object.keys(o).reduce((r, k) => Object.assign(r, {[o[k]]: (r[o[k]] || []).concat(k)}), {});
		};

		// Write the into the single-line-languages.json file.
		this.writeJsonFile(this.singleLineLangDefinitionFilePath, reverseMapping(this.singleLineBlocksMap));
		// Write the into the multi-line-languages.json file.
		this.writeJsonFile(this.multiLineLangDefinitionFilePath, Object.fromEntries(this.multiLineBlocksMap));
	}

	/**
	 * Merge the internal configs with the default multi-line config if required, and
	 * set vscode to use the language configuration.
	 *
	 * @param {string} langId Language ID
	 * @param {boolean} multiLine Determine's whether to set the language for multi-line comments.
	 * @param {string} singleLineStyle The style of the single-line comment.
	 * @returns {vscode.Disposable}
	 */
	private setLanguageConfiguration(langId: string, multiLine?: boolean, singleLineStyle?: string): vscode.Disposable {
		const internalLangConfig: vscode.LanguageConfiguration = this.getLanguageConfig(langId);
		const defaultMultiLineConfig: any = this.readJsonFile(`${__dirname}/../../config/default-multi-line-config.json`);
		console.log(typeof defaultMultiLineConfig);

		let langConfig = {...internalLangConfig};

		if (multiLine) {
			langConfig.autoClosingPairs = this.mergeConfigAutoClosingPairs(defaultMultiLineConfig, internalLangConfig);

			// Add the multi-line onEnter rules to the langConfig.
			langConfig.onEnterRules = this.mergeConfigOnEnterRules(Rules.multilineEnterRules, internalLangConfig);

			/**
			 * Get the user settings/configuration and set the blade or html comments accordingly.
			 */
			if (langId === "blade") {
				langConfig.comments.blockComment = this.setBladeComments(this.getConfiguration().get("bladeOverrideComments"), true);
			}
		}

		let isOnEnter = this.getConfiguration().get<boolean>("singleLineBlockOnEnter");

		if (isOnEnter && singleLineStyle) {
			if (singleLineStyle === "//") {
				langConfig.onEnterRules = langConfig.onEnterRules.concat(Rules.slashEnterRules);
			} else if (singleLineStyle === "#") {
				langConfig.onEnterRules = langConfig.onEnterRules.concat(Rules.hashEnterRules);
			} else if (singleLineStyle === ";") {
				langConfig.onEnterRules = langConfig.onEnterRules.concat(Rules.semicolonEnterRules);
			}
		}

		console.log(langId, langConfig);

		return vscode.languages.setLanguageConfiguration(langId, langConfig);
	}

	/**
	 * Merge the internal config AutoClosingPairs with the default config, removing any duplicates.
	 *
	 * @param {any} defaultLangConfig Default multi-line comments config.
	 * @param {vscode.LanguageConfiguration} internalLangConfig Internal language config from vscode extensions.
	 * @returns {vscode.AutoClosingPair[]}
	 */
	private mergeConfigAutoClosingPairs(defaultLangConfig, internalLangConfig: vscode.LanguageConfiguration) {
		const defaultAutoClosing = defaultLangConfig.autoClosingPairs;
		const internalAutoClosing = internalLangConfig?.autoClosingPairs ?? [];

		// Code based on "2023 update" portion of this StackOverflow answer:
		// https://stackoverflow.com/a/1584377/2358222

		// Copy to avoid side effects.
		const merged = [...internalAutoClosing];
		// Loop over the defaultLangConfig autoClosingPairs array...
		defaultAutoClosing.forEach((item) => {
			// Test all items in the merged array, and if the defaultAutoClosing item's
			// opening comment string (item.open) is not already present in one of the
			// merged array's objects then add the item to the merged array.
			merged.some((mergedItem) => item.open === mergedItem.open) ? null : merged.push(item);
		});

		return merged;
	}

	/**
	 * Merge the internal config onEnterRules with the default config, removing any duplicates.
	 *
	 * @param {any} defaultOnEnterRules Default onEnterRules.
	 * @param {vscode.LanguageConfiguration} internalLangConfig Internal language config from vscode extensions.
	 * @returns {vscode.OnEnterRule[]}
	 */
	private mergeConfigOnEnterRules(defaultOnEnterRules, internalLangConfig) {
		const internalOnEnterRules = internalLangConfig?.onEnterRules ?? [];

		// Code based on "2023 update" portion of this StackOverflow answer:
		// https://stackoverflow.com/a/1584377/2358222

		// Copy to avoid side effects.
		const merged = [...defaultOnEnterRules];
		// Loop over the defaultLangConfig autoClosingPairs array...
		internalOnEnterRules.forEach((item) => {
			// Test all items in the merged array, and if the defaultAutoClosing item's
			// opening comment string (item.open) is not already present in one of the
			// merged array's objects then add the item to the merged array.
			merged.some((mergedItem) => item.beforeText === mergedItem.beforeText) ? null : merged.push(item);
		});

		return merged;
	}

	/**
	 * The keyboard binding event handler for the single line blocks on shift+enter.
	 *
	 * @param {vscode.TextEditor} textEditor The text editor.
	 * @param {vscode.TextEditorEdit} edit The text editor edits.
	 */
	private handleSingleLineBlock(textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
		let langId = textEditor.document.languageId;
		var style = this.singleLineBlocksMap.get(langId);
		if (style && textEditor.selection.isEmpty) {
			let line = textEditor.document.lineAt(textEditor.selection.active);
			let isCommentLine = true;
			var indentRegex: RegExp;
			if (style === "//" && line.text.search(/^\s*\/\/\s*/) !== -1) {
				indentRegex = /\//;
				if (line.text.search(/^\s*\/\/\/\s*/) !== -1) {
					style = "///";
				}
				if (line.text.search(/^\s*\/\/!\s*/) !== -1) {
					style = "//!";
				}
			} else if (style === "#" && line.text.search(/^\s*#\s*/) !== -1) {
				indentRegex = /#/;
			} else if (style === ";" && line.text.search(/^\s*;\s*/) !== -1) {
				indentRegex = /;/;

				// If text is ;;, then change the style from single ; to double ;;.
				if (line.text.search(/^\s*;;\s*/) !== -1) {
					style = ";;";
				}
			} else {
				isCommentLine = false;
			}

			if (!isCommentLine) {
				return;
			}

			var indentedNewLine = "\n" + line.text.substring(0, line.text.search(indentRegex));
			let isOnEnter = this.getConfiguration().get<boolean>("singleLineBlockOnEnter");
			if (!isOnEnter) {
				indentedNewLine += style + " ";
			}

			edit.insert(textEditor.selection.active, indentedNewLine);
		}
	}

	/**
	 * The keyboard binding event handler to change between the multi-line block comments for
	 * blade `{{--  --}}` and normal `<!-- -->`
	 *
	 * @param {vscode.TextEditor} textEditor The text editor.
	 */
	private handleChangeBladeMultiLineBlock(textEditor: vscode.TextEditor) {
		let langId = textEditor.document.languageId;
		const extensionNames = this.getExtensionNames();

		// Only carry out function if languageId is blade.
		if (langId === "blade" && !this.isLangIdDisabled(langId)) {
			let config = this.getConfiguration();
			// Read current value
			let isOverridden = config.get<boolean>("bladeOverrideComments");

			if (isOverridden === false) {
				// Update to true, globally
				// [command, new value, global]
				config.update("bladeOverrideComments", true, true);
			} else {
				// Update to false, globally
				// [command, new value, global]
				config.update("bladeOverrideComments", false, true);
			}
			// Read new value
			let bladeOverrideComments = config.get<boolean>("bladeOverrideComments");

			// Set the comments for blade language.
			this.setBladeComments(bladeOverrideComments);
		}
		// If langId is blade AND Blade is set as disabled in the settings,
		// then output a message to the user.
		else if (langId == "blade" && this.isLangIdDisabled(langId)) {
			vscode.window.showInformationMessage(
				`Blade is set as disabled in the "${extensionNames.name}.disabledLanguages" setting. The "${extensionNames.name}.bladeOverrideComments" setting will have no affect.`,
				"OK"
			);

			// Set the comments for blade language.
			this.setBladeComments(false);
		}
	}
}
