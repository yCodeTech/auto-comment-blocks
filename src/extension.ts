"use strict";

import * as vscode from "vscode";

import {Configuration} from "./configuration";

let configuration = new Configuration();

const disposables: vscode.Disposable[] = [];

export function activate(context: vscode.ExtensionContext) {
	const configureCommentBlocksDisposable = configuration.configureCommentBlocks(context);
	const registerCommandsDisposable = configuration.registerCommands();

	disposables.push(...configureCommentBlocksDisposable, ...registerCommandsDisposable);

	const extensionNames = configuration.getExtensionNames();

	const extensionName = extensionNames.name;
	const extensionDisplayName = extensionNames.displayName;

	let disabledLangConfig: string[] = configuration.getConfigurationValue<string[]>("disabledLanguages");

	if (disabledLangConfig.length > 0) {
		vscode.window.showInformationMessage(`${disabledLangConfig.join(", ")} languages are disabled for ${extensionDisplayName}.`);
	}

	/**
	 * When the configuration/user settings are changed, set the extension
	 * to reflect the settings and output a message to the user.
	 */
	vscode.workspace.onDidChangeConfiguration((event: any) => {
		// TODO: Work on automatically updating the languages instead of making the user reload the extension.

		/**
		 * Blade Override Comments
		 */
		// If the affected setting is bladeOverrideComments...
		if (event.affectsConfiguration(`${extensionName}.bladeOverrideComments`)) {
			// Get the setting.
			let bladeOverrideComments: boolean = configuration.getConfigurationValue<boolean>("bladeOverrideComments");

			configuration.setBladeComments(bladeOverrideComments);

			if (!configuration.isLangIdDisabled("blade")) {
				vscode.window.showInformationMessage(`${bladeOverrideComments === false ? "Disabled" : "Enabled"} Blade Override Comments setting.`);
			}
		}

		/**
		 * Disabled Languages
		 */
		if (event.affectsConfiguration(`${extensionName}.disabledLanguages`)) {
			vscode.window
				.showInformationMessage(
					`The ${extensionName}.disabledLanguages setting has been changed. Please reload the Extension Host to take effect.`,
					"Reload"
				)
				.then((selection) => {
					if (selection === "Reload") {
						vscode.commands.executeCommand("workbench.action.restartExtensionHost");
					}
				});
		}

		/**
		 * Override Default Language Block Comments
		 */
		if (event.affectsConfiguration(`${extensionName}.overrideDefaultLanguageMultiLineComments`)) {
			vscode.window
				.showInformationMessage(
					`The ${extensionName}.overrideDefaultLanguageMultiLineComments setting has been changed. Please reload the Extension Host to take effect.`,
					"Reload"
				)
				.then((selection) => {
					if (selection === "Reload") {
						vscode.commands.executeCommand("workbench.action.restartExtensionHost");
					}
				});
		}

		/**
		 * Multi-line style Block Comments
		 */
		if (event.affectsConfiguration(`${extensionName}.multiLineStyleBlocks`)) {
			vscode.window
				.showInformationMessage(
					`The ${extensionName}.multiLineStyleBlocks setting has been changed. Please reload the Extension Host to take effect.`,
					"Reload"
				)
				.then((selection) => {
					if (selection === "Reload") {
						vscode.commands.executeCommand("workbench.action.restartExtensionHost");
					}
				});
		}

		/**
		 * //-style single-line comments
		 */
		if (event.affectsConfiguration(`${extensionName}.slashStyleBlocks`)) {
			vscode.window
				.showInformationMessage(
					`The ${extensionName}.slashStyleBlocks setting has been changed. Please reload the Extension Host to take effect.`,
					"Reload"
				)
				.then((selection) => {
					if (selection === "Reload") {
						vscode.commands.executeCommand("workbench.action.restartExtensionHost");
					}
				});
		}

		/**
		 * #-style single-line comments
		 */
		if (event.affectsConfiguration(`${extensionName}.hashStyleBlocks`)) {
			vscode.window
				.showInformationMessage(
					`The ${extensionName}.hashStyleBlocks setting has been changed. Please reload the Extension Host to take effect.`,
					"Reload"
				)
				.then((selection) => {
					if (selection === "Reload") {
						vscode.commands.executeCommand("workbench.action.restartExtensionHost");
					}
				});
		}

		/**
		 * ;-style single-line comments
		 */
		if (event.affectsConfiguration(`${extensionName}.semicolonStyleBlocks`)) {
			vscode.window
				.showInformationMessage(
					`The ${extensionName}.semicolonStyleBlocks setting has been changed. Please reload the Extension Host to take effect.`,
					"Reload"
				)
				.then((selection) => {
					if (selection === "Reload") {
						vscode.commands.executeCommand("workbench.action.restartExtensionHost");
					}
				});
		}
	});

	// Called when active editor language is changed, so re-configure the comment blocks.
	vscode.workspace.onDidChangeTextDocument(() => {
		const configureCommentBlocksDisposable = configuration.configureCommentBlocks(context);
		disposables.push(...configureCommentBlocksDisposable);
	});

	context.subscriptions.push(...disposables);
}
export function deactivate() {}
