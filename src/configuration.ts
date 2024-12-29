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
	 * A key:value Map object of supported language IDs and their single-line style comments.
	 *
	 * @property {string} key Language ID.
	 * @property {string} value Style of line comment.
	 */
	private singleLineBlocksMap: Map<string, Map<string, string>> = new Map();

	/**
	 * A Map object of an array of supported language IDs for multi-line block comments.
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
		this.writeCommentLanguageDefinitionsToJsonFile();
	}

	/**
	 * Configure the comment blocks.
	 *
	 * @param {vscode.ExtensionContext} context The context of the extension.
	 * @returns {vscode.Disposable[]}
	 */
	public configureCommentBlocks(context: vscode.ExtensionContext) {
		const disposables: vscode.Disposable[] = [];

		/**
		 * Auto-supported languages.
		 */

		const singleLineLangs = this.getSingleLineLanguages("supportedLanguages");
		const multiLineLangs = this.getMultiLineLanguages("supportedLanguages");

		// Setup the auto-supported single-line languages.
		for (let [langId, style] of singleLineLangs) {
			if (!this.isLangIdDisabled(langId)) {
				// Set a bool if the single-line language also supports multi-line comments
				// (ie. the single-line language is also present in the multi-line map);
				let multiLine = multiLineLangs.includes(langId);
				disposables.push(this.setLanguageConfiguration(langId, multiLine, style));
			}
		}

		// Setup the auto-supported multi-line languages.
		for (let langId of multiLineLangs) {
			// If singleLineLangs doesn't have the langId, AND
			// the langId isn't set as disabled...
			if (!singleLineLangs.has(langId) && !this.isLangIdDisabled(langId)) {
				disposables.push(this.setLanguageConfiguration(langId, true));
			}
		}

		/**
		 * Custom-supported (unsupported) languages
		 */

		const customMultiLineLangs = this.getMultiLineLanguages("customSupportedLanguages");
		const customSingleLineLangs = this.getSingleLineLanguages("customSupportedLanguages");

		// Setup the custom-supported single-line languages, that are otherwise unsupported.
		for (let [langId, style] of customSingleLineLangs) {
			// Set a bool if the single-line language also supports multi-line comments
			// (ie. the single-line language is also present in the multi-line map);
			let multiLine = customMultiLineLangs.includes(langId);
			disposables.push(this.setLanguageConfiguration(langId, multiLine, style));
		}

		// Setup the custom-supported multi-line languages, that are otherwise unsupported.
		for (let langId of customMultiLineLangs) {
			// If customSingleLineLangs doesn't have the langId
			if (!customSingleLineLangs.has(langId)) {
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
	public getExtensionNames(): {id: string; name: string; displayName: string} {
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
	 * Get all the extension's configuration settings.
	 *
	 * @returns {vscode.WorkspaceConfiguration}
	 */
	public getConfiguration(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration(this.getExtensionNames().name, null);
	}

	/**
	 * Get value of the specified key from the extension's user configuration settings.
	 *
	 * @param {string} key The key of the specific setting.
	 *
	 * @returns {T} Returns the value of the `key`.
	 *
	 * NOTE: Return is typed as `T`, which is a generic type that represents the type that is declared when called (as explained in this StackOverflow answer: https://stackoverflow.com/a/49622066/2358222)
	 *
	 * @example ```ts
	 * this.getConfigurationValue<string[]>("disabledLanguages");
	 * ```
	 */
	public getConfigurationValue<T>(key: string): T {
		return this.getConfiguration().get<T>(key);
	}

	/**
	 * Update value of the specified key from the extension's user configuration settings.
	 *
	 * @param {string} key The key of the specific setting.

	 * @param {any} value The value to update the setting with.
	 *
	 * @example ```ts
	 * this.updateConfigurationValue("bladeOverrideComments", true);
	 * ```
	 */
	public updateConfigurationValue(key: string, value: any) {
		// .update(config key, new value, global)
		this.getConfiguration().update(key, value, true);
	}

	/**
	 * Is the language ID disabled?
	 * @param {string} langId Language ID
	 * @returns {boolean}
	 */
	public isLangIdDisabled(langId: string): boolean {
		return this.getConfigurationValue<string[]>("disabledLanguages").includes(langId);
	}

	/**
	 * Is the multi-line comment overridden for the specified language ID?
	 *
	 * @param {string} langId Language ID
	 * @returns {boolean}
	 */
	private isLangIdMultiLineCommentOverridden(langId: string): boolean {
		const overriddenList = this.getConfigurationValue<string[]>("overrideDefaultLanguageMultiLineComments");

		return overriddenList.hasOwnProperty(langId);
	}

	/**
	 * Get the overridden multi-line comment for the specified language ID.
	 *
	 * @param {string} langId Language ID
	 * @returns {string}
	 */
	private getOverriddenMultiLineComment(langId: string) {
		const overriddenList = this.getConfigurationValue<string[]>("overrideDefaultLanguageMultiLineComments");

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
	 * @param {"supportedLanguages" | "customSupportedLanguages"} key A stringed key, either `"supportedLanguages"` or `"customSupportedLanguages"`
	 * @returns {string[]} An array of language ID strings.
	 */
	private getMultiLineLanguages(key: "supportedLanguages" | "customSupportedLanguages"): string[] {
		return this.multiLineBlocksMap.get(key);
	}

	/**
	 * Get the single-line languages and styles.
	 *
	 * @param {"supportedLanguages" | "customSupportedLanguages"} key A stringed key, either `"supportedLanguages"` or `"customSupportedLanguages"`
	 * @returns {Map<string, string>} The Map of the languages and styles.
	 */
	private getSingleLineLanguages(key: "supportedLanguages" | "customSupportedLanguages"): Map<string, string> {
		return this.singleLineBlocksMap.get(key);
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
				// If the blockComment array includes the multi-line start of "/*"...
				if (config.comments.blockComment.includes("/*")) {
					// console.log(langId, config.comments);

					// If Language ID isn't already in the langArray...
					if (!langArray.includes(langId)) {
						langArray.push(langId);
					}
				}
			}
		});

		// Set the supportedLanguages array into the multiLineBlockMap, sorted in ascending order,
		// for sanity reasons.
		this.multiLineBlocksMap.set("supportedLanguages", langArray.sort());

		const multiLineStyleBlocksLangs = this.getConfigurationValue<string[]>("multiLineStyleBlocks");

		// Empty the langArray to reuse it.
		langArray = [];
		for (let langId of multiLineStyleBlocksLangs) {
			// If langId is exists (ie. not NULL or empty string) AND
			// the array doesn't already include langId,
			// then add it to the array.
			if (langId && !langArray.includes(langId)) {
				langArray.push(langId);
			}
		}
		// Set the customSupportedLanguages array into the multiLineBlockMap,
		// sorted in ascending order, for sanity reasons.
		this.multiLineBlocksMap.set("customSupportedLanguages", langArray.sort());
	}

	/**
	 * Set the single-line comments language definitions.
	 */
	private setSingleLineCommentLanguageDefinitions() {
		let style: string;
		const tempMap: Map<string, string> = new Map();
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

				// If style any empty string, (i.e. not an unsupported single-line
				// comment like bat's @rem)...
				if (style != "") {
					// Set the langId and it's style into the Map.
					tempMap.set(langId, style);
				}
			}
		});

		// Set the supportedLanguages tempMap into the singleLineBlocksMap,
		// sorted in ascending order, for sanity reasons.
		this.singleLineBlocksMap.set("supportedLanguages", new Map([...tempMap].sort()));

		// Empty the tempMap to reuse it.
		tempMap.clear();

		// Get user-customized langIds for the //-style and add to the map.
		let customSlashLangs = this.getConfigurationValue<string[]>("slashStyleBlocks");
		for (let langId of customSlashLangs) {
			if (langId && langId.length > 0) {
				tempMap.set(langId, "//");
			}
		}

		// Get user-customized langIds for the #-style and add to the map.
		let customHashLangs = this.getConfigurationValue<string[]>("hashStyleBlocks");
		for (let langId of customHashLangs) {
			if (langId && langId.length > 0) {
				tempMap.set(langId, "#");
			}
		}

		// Get user-customized langIds for the ;-style and add to the map.
		let customSemicolonLangs = this.getConfigurationValue<string[]>("semicolonStyleBlocks");
		for (let langId of customSemicolonLangs) {
			if (langId && langId.length > 0) {
				tempMap.set(langId, ";");
			}
		}

		// Set the customSupportedLanguages tempMap into the singleLineBlocksMap,
		// sorted in ascending order, for sanity reasons.
		this.singleLineBlocksMap.set("customSupportedLanguages", new Map([...tempMap].sort()));
	}

	/**
	 * Write Comment Language Definitions to the respective JSON file:
	 * either multi-line-languages.json, or single-line-languages.json.
	 */
	private writeCommentLanguageDefinitionsToJsonFile() {
		// Write the into the single-line-languages.json file.
		this.writeJsonFile(this.singleLineLangDefinitionFilePath, this.convertMapToReversedObject(this.singleLineBlocksMap));
		// Write the into the multi-line-languages.json file.
		this.writeJsonFile(this.multiLineLangDefinitionFilePath, Object.fromEntries(this.multiLineBlocksMap));
	}

	/**
	 * Sets the language configuration for a given language ID.
	 *
	 * @param {string} langId - The language ID for which the configuration is being set.
	 * @param {boolean} multiLine - Optional. If true, sets multi-line comment configuration.
	 * @param {string} singleLineStyle - Optional. Specifies the style of single-line comments (e.g., "//", "#", ";").
	 *
	 * @returns {vscode.Disposable}
	 *
	 * This method performs the following tasks:
	 * - Retrieves the internal language configuration for the specified language ID.
	 * - Reads the default multi-line configuration from a JSON file.
	 * - Merges the default multi-line configuration with the internal language configuration if
	 *   multiLine is `true`.
	 * - Sets the appropriate comment styles and onEnter rules.
	 * - Reconstructs regex patterns for onEnterRules, wordPattern, folding markers, and
	 *   indentation rules to ensure they are in RegExp form.
	 * - Sets the final language configuration to VScode to use.
	 *
	 * Note: This method ensures that the language configuration is correctly set and avoids issues
	 * with rogue characters being inserted on new lines.
	 */
	private setLanguageConfiguration(langId: string, multiLine?: boolean, singleLineStyle?: string): vscode.Disposable {
		const internalLangConfig: vscode.LanguageConfiguration = this.getLanguageConfig(langId);
		const defaultMultiLineConfig: any = this.readJsonFile(`${__dirname}/../../config/default-multi-line-config.json`);

		let langConfig = {...internalLangConfig};

		if (multiLine) {
			const mergedConfig = this.mergeConfig(defaultMultiLineConfig.autoClosingPairs, Rules.multilineEnterRules, internalLangConfig);

			langConfig.autoClosingPairs = mergedConfig.mergedAutoClosingPairs;

			// Add the multi-line onEnter rules to the langConfig.
			langConfig.onEnterRules = mergedConfig.mergedOnEnterRules;

			// Only assign the default config comments if it doesn't already exist.
			// (nullish assignment operator ??=)
			langConfig.comments ??= defaultMultiLineConfig.comments;

			// If the default multi-line comments has been overridden for the langId,
			// add the overridden multi-line comments to the langConfig.
			if (this.isLangIdMultiLineCommentOverridden(langId)) {
				langConfig.comments.blockComment[0] = this.getOverriddenMultiLineComment(langId);
			}

			/**
			 * Get the user settings/configuration and set the blade or html comments accordingly.
			 */
			if (langId === "blade") {
				langConfig.comments.blockComment = this.setBladeComments(this.getConfigurationValue<boolean>("bladeOverrideComments"), true);
			}
		}

		let isOnEnter = this.getConfigurationValue<boolean>("singleLineBlockOnEnter");

		// Add the single-line onEnter rules to the langConfig.
		//
		// If isOnEnter is true AND singleLineStyle isn't false, i.e. a string.
		if (isOnEnter && singleLineStyle) {
			// //-style comments
			if (singleLineStyle === "//") {
				// Make sure that langConfig has the key onEnterRules with the optional
				// chaining operator (?.) before trying to access the array method concat().
				// If it does exist, concat (combine) the new rules with the langConfig rules.
				// If it's undefined (doesn't exist), then using the nullish coalescing
				// operator (??) just assign the new rules.
				const rules = langConfig.onEnterRules?.concat(Rules.slashEnterRules) ?? Rules.slashEnterRules;

				// Set the rules.
				langConfig.onEnterRules = rules;
			}
			// #-style comments
			else if (singleLineStyle === "#") {
				const rules = langConfig.onEnterRules?.concat(Rules.hashEnterRules) ?? Rules.hashEnterRules;

				// Set the rules.
				langConfig.onEnterRules = rules;
			}
			// ;-style comments
			else if (singleLineStyle === ";") {
				const rules = langConfig.onEnterRules?.concat(Rules.semicolonEnterRules) ?? Rules.semicolonEnterRules;

				// Set the rules.
				langConfig.onEnterRules = rules;
			}
		}
		// If isOnEnter is false AND singleLineStyle isn't false, i.e. a string.
		else if (!isOnEnter && singleLineStyle) {
			// If langConfig does NOT have a comments key OR
			// the comments key exists but does NOT have the lineComment key...
			if (!Object.hasOwn(langConfig, "comments") || !Object.hasOwn(langConfig.comments, "lineComment")) {
				// Add the singleLineStyle to the lineComments key and make sure any
				// blockComments aren't overwritten.
				langConfig.comments = {...langConfig.comments, lineComment: singleLineStyle};
			}
		}

		// Reconstruct the regex patterns for the onEnterRules.
		// This is required because the onEnterRules are not working in some languages.
		// The issue is that the onEnterRules are not being set correctly, and are not
		// being used by vscode.

		// Fixes rogue * being inserted on to an empty line when pressing tab when the line
		// * above is a single-line comment. A rogue * also gets inserted when the any new line after any kind of code except multi-line comments.

		// Check if isOnEnter OR multiline is true.
		if (isOnEnter || multiLine) {
			langConfig.onEnterRules.forEach((item) => {
				// Check if the item has a "beforeText" property and reconstruct its regex pattern.
				if (Object.hasOwn(item, "beforeText")) {
					item.beforeText = this.reconstructRegex(item, "beforeText");
				}
				// Check if the item has an "afterText" property and reconstruct its regex pattern.
				if (Object.hasOwn(item, "afterText")) {
					item.afterText = this.reconstructRegex(item, "afterText");
				}
				// Check if the item has an "afterText" property and reconstruct its regex pattern.
				if (Object.hasOwn(item, "previousLineText")) {
					item.previousLineText = this.reconstructRegex(item, "previousLineText");
				}
			});
		}

		// Make sure wordPattern is in RegExp form instead of a string, otherwise vscode errors out:
		// > TypeError: e.exec is not a function
		//
		// The extension won't activate when there's a wordPattern key with a string regex in the config when using `setLanguageConfiguration()`.
		//
		// It's unknown why the allowed regex as string causes this, there seems to be a similar, related issue in https://github.com/microsoft/vscode/issues/171194 but was closed as (wrongly?) an invalid issue.
		//
		// So we're just changing the string to an actual regex pattern.

		// If langConfig has a wordPattern key...
		if (Object.hasOwn(langConfig, "wordPattern")) {
			langConfig.wordPattern = this.reconstructRegex(langConfig, "wordPattern");
		}
		// If langConfig has a folding key...
		if (Object.hasOwn(langConfig, "folding")) {
			if (Object.hasOwn(langConfig.folding, "markers")) {
				langConfig.folding.markers.start = this.reconstructRegex(langConfig.folding.markers, "start");

				langConfig.folding.markers.end = this.reconstructRegex(langConfig.folding.markers, "end");
			}
		}
		// If langConfig has a indentationRules key...
		if (Object.hasOwn(langConfig, "indentationRules")) {
			let indentationRules = langConfig.indentationRules;

			// Loop through the indentationRules object...
			for (let key in indentationRules) {
				// If the key is "increaseIndentPattern", reconstruct the regex pattern.
				if (key === "increaseIndentPattern") {
					indentationRules.increaseIndentPattern = this.reconstructRegex(indentationRules, "increaseIndentPattern");
				}
				// If the key is "decreaseIndentPattern", reconstruct the regex pattern.
				if (key === "decreaseIndentPattern") {
					indentationRules.decreaseIndentPattern = this.reconstructRegex(indentationRules, "decreaseIndentPattern");
				}
				// If the key is "indentNextLinePattern", reconstruct the regex pattern.
				if (key === "indentNextLinePattern") {
					indentationRules.indentNextLinePattern = this.reconstructRegex(indentationRules, "indentNextLinePattern");
				}
				// If the key is "unIndentedLinePattern", reconstruct the regex pattern.
				if (key === "unIndentedLinePattern") {
					indentationRules.unIndentedLinePattern = this.reconstructRegex(indentationRules, "unIndentedLinePattern");
				}
			}
		}
		// FIX: Pressing `Tab` immediately after breaking out of a comment block, will insert a commented line. - This maybe due to the language not having a proper indentation rule, at least adding indentation rules seems to fix it. More testing needed.
		// else {
		// 	langConfig.indentationRules = {
		// 		increaseIndentPattern: /(^.*\{[^}]*$)/,
		// 		decreaseIndentPattern: /^\s*\}/
		// 	}
		// }

		console.log(langId, langConfig);

		return vscode.languages.setLanguageConfiguration(langId, langConfig);
	}

	/**
	 * Merge the internal config AutoClosingPairs with the default config, removing any duplicates.
	 * And Merge the internal config onEnterRules with the default rules, removing any duplicates.
	 *
	 * @param {any} defaultLangConfig Default multi-line comments config.
	 * @param {vscode.LanguageConfiguration} internalLangConfig Internal language config from vscode extensions.
	 * @returns {{mergedOnEnterRules: any[]; mergedAutoClosingPairs: vscode.AutoClosingPair[]}} An object with the merged onEnterRules and autoClosingPairs arrays.
	 */
	private mergeConfig(
		defaultAutoClosingPairs,
		defaultOnEnterRules,
		internalLangConfig: vscode.LanguageConfiguration
	): {mergedOnEnterRules: any[]; mergedAutoClosingPairs: vscode.AutoClosingPair[]} {
		// Get the internal config properties or define an empty array.
		const internalAutoClosing = internalLangConfig?.autoClosingPairs ?? [];
		const internalOnEnterRules = internalLangConfig?.onEnterRules ?? [];

		/**
		 * Merge the arrays and remove any duplicates.
		 *
		 * Code based on "2023 update" portion of this StackOverflow answer:
		 * https://stackoverflow.com/a/1584377/2358222
		 *
		 * @param {string} key The key to check against for preventing duplicates.
		 * @param item The current item in the loop.
		 * @param merged The array to merge into.
		 */
		const merge = (key: string, item: any, merged: any) => {
			// Test all items in the merged array, and if the defaultAutoClosing item's
			// opening comment string (item.open) is not already present in one of the
			// merged array's objects then add the item to the merged array.
			merged.some((mergedItem) => item[key] === mergedItem[key]) ? null : merged.push(item);
		};

		/**
		 * Merge autoClosingPairs.
		 */

		// Copy to avoid side effects.
		const mergedAutoClosingPairs = [...internalAutoClosing];
		// Loop over the defaultLangConfig autoClosingPairs array...
		defaultAutoClosingPairs.forEach((item) => merge("open", item, mergedAutoClosingPairs));

		/**
		 * Merge onEnterRules
		 */

		// Copy to avoid side effects.
		const mergedOnEnterRules = [...defaultOnEnterRules];

		internalOnEnterRules.forEach((item) => merge("beforeText", item, mergedOnEnterRules));

		return {mergedOnEnterRules, mergedAutoClosingPairs};
	}

	/**
	 * Reconstruct the regex pattern because vscode doesn't like the regex pattern as a string,
	 * or some patterns are not working as expected.
	 *
	 * @param obj The object
	 * @param key The key to check in the object
	 * @returns {RegExp} The reconstructed regex pattern.
	 */
	private reconstructRegex(obj: any, key: string) {
		// If key has a "pattern" key, then it's an object...
		if (Object.hasOwn(obj[key], "pattern")) {
			return new RegExp(obj[key].pattern);
		}
		// Otherwise it's a string.
		else {
			return new RegExp(obj[key]);
		}
	}

	/**
	 * Convert a Map to an object with it's inner Map's keys and values reversed/switched.
	 *
	 * Code based on this StackOverflow answer https://stackoverflow.com/a/45728850/2358222
	 *
	 * @param {Map<string, Map<string, string>>} m The Map to convert to an object.
	 * @returns {object} The converted object.
	 *
	 * @example
	 * reverseMapping(
	 * 	Map {
	 * 		"supportedLanguages" => Map {
	 * 			"apacheconf" => "#",
	 * 			"c" => "//",
	 * 			"clojure" => ";",
	 * 			"coffeescript" => "#",
	 * 			"cpp" => "//",
	 * 			…
	 * 		}
	 * 	}
	 * );
	 *
	 * // Converts to:
	 *
	 * {
	 * 	"supportedLanguages" => {
	 * 		"#": [
	 * 			"apacheconf",
	 * 			"coffeescript",
	 * 			...
	 * 		],
	 * 		"//": [
	 * 			"c",
	 * 			"cpp",
	 * 			...
	 * 		],
	 * 		";": [
	 * 			"clojure",
	 * 			...
	 * 		]
	 * 	}
	 * }
	 */
	private convertMapToReversedObject(m: Map<string, Map<string, string>>): object {
		const result: any = {};

		// Convert a nested key:value Map from inside another Map into an key:array object,
		// while reversing/switching the keys and values. The Map's values are now the keys of
		// the object and the Map's keys are now added as the values of the array. The reversed
		// object is added to the key of the outerMap.

		// Loop through the outer Map...
		for (const [key, innerMap] of m.entries()) {
			// Convert the inner Map to an object
			const o = Object.fromEntries(innerMap);

			// Reverse the inner object mapping.
			//
			// Loop through the object (o) keys, assigns a new object (r) with the value of the
			// object key (k) as the new key (eg. "//") and the new value is an array of all
			// the original object keys (o[k]) (eg. "php").
			// If the key (o[k]) already exists in the new object (r), then just add the
			// original key to the array, otherwise start a new array ([]) with the original
			// key as value ( (r[o[k]] || []).concat(k) ).
			// Add this new reversed object to the result object with the outer map key
			// as the key.
			result[key] = Object.keys(o).reduce((r, k) => Object.assign(r, {[o[k]]: (r[o[k]] || []).concat(k)}), {});
		}
		return result;
	}

	/**
	 * The keyboard binding event handler for the single-line blocks on shift+enter.
	 *
	 * @param {vscode.TextEditor} textEditor The text editor.
	 * @param {vscode.TextEditorEdit} edit The text editor edits.
	 */
	private handleSingleLineBlock(textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
		let langId = textEditor.document.languageId;
		const singleLineLangs = this.getSingleLineLanguages("supportedLanguages");
		const customSingleLineLangs = this.getSingleLineLanguages("customSupportedLanguages");

		// Get the langId from the auto-supported langs. If it doesn't exist, try getting it from
		// the custom-supported langs instead.
		var style = singleLineLangs.get(langId) ?? customSingleLineLangs.get(langId);

		if (style && textEditor.selection.isEmpty) {
			let line = textEditor.document.lineAt(textEditor.selection.active);
			let isCommentLine = true;
			var indentRegex: RegExp;

			if (style === "//" && line.text.search(/^\s*\/\/\s*/) !== -1) {
				indentRegex = /\//;
				if (line.text.search(Rules.slashEnterRules[1].beforeText) !== -1) {
					style = "///";
				}
				if (line.text.search(Rules.slashEnterRules[2].beforeText) !== -1) {
					style = "//!";
				}
			} else if (style === "#" && line.text.search(/^\s*#\s*/) !== -1) {
				indentRegex = /#/;
				if (line.text.search(Rules.hashEnterRules[1].beforeText) !== -1) {
					style = "##";
				}
			} else if (style === ";" && line.text.search(/^\s*;\s*/) !== -1) {
				indentRegex = /;/;

				// If text is ;;, then change the style from single ; to double ;;.
				if (line.text.search(Rules.semicolonEnterRules[1].beforeText) !== -1) {
					style = ";;";
				}
			} else {
				isCommentLine = false;
			}

			if (!isCommentLine) {
				return;
			}

			var indentedNewLine = "\n" + line.text.substring(0, line.text.search(indentRegex));
			let isOnEnter = this.getConfigurationValue<boolean>("singleLineBlockOnEnter");
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
			// Read current value
			let isOverridden = this.getConfigurationValue<boolean>("bladeOverrideComments");

			if (isOverridden === false) {
				// Update to true
				this.updateConfigurationValue("bladeOverrideComments", true);
			} else {
				// Update to false
				this.updateConfigurationValue("bladeOverrideComments", false);
			}
			// Read new value
			let bladeOverrideComments = this.getConfigurationValue<boolean>("bladeOverrideComments");

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
