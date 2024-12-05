"use strict";

import {Disposable, ExtensionContext, LanguageConfiguration, TextEditor, TextEditorEdit, commands, languages, workspace} from "vscode";
import * as vscode from "vscode";
import * as fs from "node:fs";

import {Rules} from "./rules";
import {config as singleLineConfig} from "./single-line-configuration";
import {config as multiLineConfig} from "./multi-line-configuration";

export class Configuration {
	/**************
	 * Properties *
	 **************/
	private readonly singleLineBlockCommand: string = "auto-comment-blocks.singleLineBlock";
	private readonly changeBladeMultiLineBlockCommand: string = "auto-comment-blocks.changeBladeMultiLineBlock";

	private readonly singleLineBlockOnEnter: string = "singleLineBlockOnEnter";
	private readonly slashStyleBlocks: string = "slashStyleBlocks";
	private readonly hashStyleBlocks: string = "hashStyleBlocks";
	private readonly semicolonStyleBlocks: string = "semicolonStyleBlocks";
	private readonly disabledLanguages: string = "disabledLanguages";

	private disabledLanguageList: string[] = this.getConfiguration().get<string[]>(this.disabledLanguages);

	/**
	 * A key:value Map object of supported language IDs and their single line style comments.
	 *
	 * @property {string} key Language ID.
	 * @property {string} value Style of line comment.
	 */
	private singleLineBlocksMap: Map<string, string> = new Map();

	/***********
	 * Methods *
	 ***********/

	configureCommentBlocks(context: ExtensionContext) {
		const disposables: vscode.Disposable[] = [];

		// Set language configurations
		this.getSingleLineLanguages();
		let multiLineLangs = this.getMultiLineLanguages();

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
	 */
	public registerCommands() {
		const singleLineBlockCommand = vscode.commands.registerTextEditorCommand(this.singleLineBlockCommand, (textEditor, edit, args) => {
			this.handleSingleLineBlock(textEditor, edit);
		});
		const changeBladeMultiLineBlockCommand = vscode.commands.registerTextEditorCommand(
			this.changeBladeMultiLineBlockCommand,
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
	 * Get extension configuration.
	 */
	public getConfiguration(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration(this.getExtensionNames().name, null);
	}

	public isLangIdDisabled(langId: string): boolean {
		return this.disabledLanguageList.includes(langId);
	}

	private getMultiLineLanguages(): Array<string> {
		return multiLineConfig["languages"];
	}

	private getSingleLineLanguages() {
		let commentStyles = Object.keys(singleLineConfig);
		for (let key of commentStyles) {
			for (let langId of singleLineConfig[key]) {
				if (!this.isLangIdDisabled(langId)) {
					this.singleLineBlocksMap.set(langId, key);
				}
			}
		}

		// get user-customized langIds for this key and add to the map
		let customSlashLangs = this.getConfiguration().get<string[]>(this.slashStyleBlocks);
		for (let langId of customSlashLangs) {
			if (langId && langId.length > 0) {
				this.singleLineBlocksMap.set(langId, "//");
			}
		}

		let customHashLangs = this.getConfiguration().get<string[]>(this.hashStyleBlocks);
		for (let langId of customHashLangs) {
			if (langId && langId.length > 0) {
				this.singleLineBlocksMap.set(langId, "#");
			}
		}

		let customSemicolonLangs = this.getConfiguration().get<string[]>(this.semicolonStyleBlocks);
		for (let langId of customSemicolonLangs) {
			if (langId && langId.length > 0) {
				this.singleLineBlocksMap.set(langId, ";");
			}
		}
	}

	private setLanguageConfiguration(langId: string, multiLine?: boolean, singleLineStyle?: string): Disposable {
		var langConfig: LanguageConfiguration = {
			onEnterRules: [],
		};

		if (multiLine) {
			langConfig.onEnterRules = langConfig.onEnterRules.concat(Rules.multilineEnterRules);
		}

		let isOnEnter = this.getConfiguration().get<boolean>(this.singleLineBlockOnEnter);
		if (isOnEnter && singleLineStyle) {
			if (singleLineStyle === "//") {
				langConfig.onEnterRules = langConfig.onEnterRules.concat(Rules.slashEnterRules);
			} else if (singleLineStyle === "#") {
				langConfig.onEnterRules = langConfig.onEnterRules.concat(Rules.hashEnterRules);
			} else if (singleLineStyle === ";") {
				langConfig.onEnterRules = langConfig.onEnterRules.concat(Rules.semicolonEnterRules);
			}
		}

		return languages.setLanguageConfiguration(langId, langConfig);
	}

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
			let isOnEnter = this.getConfiguration().get<boolean>(this.singleLineBlockOnEnter);
			if (!isOnEnter) {
				indentedNewLine += style + " ";
			}

			edit.insert(textEditor.selection.active, indentedNewLine);
		}
	}

	/**
	 * The keyboard binding handler to change between the multi-line block comments for
	 * blade `{{--  --}}` and normal `<!-- -->`
	 * @param textEditor The editor
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
