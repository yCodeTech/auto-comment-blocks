"use strict";

// INFO: How to publish extension: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publishing-extensions

import * as vscode from "vscode";

import {Configuration} from "./configuration";
import {logger} from "./logger";
import {ExtensionData} from "./extensionData";

const extensionData = new ExtensionData();
logger.setupOutputChannel();
let configuration = new Configuration();

const disposables: vscode.Disposable[] = [];

export function activate(context: vscode.ExtensionContext) {
	const configureCommentBlocksDisposable = configuration.configureCommentBlocks();
	const registerCommandsDisposable = configuration.registerCommands();

	disposables.push(...configureCommentBlocksDisposable, ...registerCommandsDisposable);

	const extensionName = extensionData.get("name");

	const extensionDisplayName = extensionData.get("displayName");

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
		 * Support Unsupported Languages
		 */
		if (event.affectsConfiguration(`${extensionName}.supportUnsupportedLanguages`)) {
			configuration.updateSingleLineCommentLanguageDefinitions();

			const configureCommentBlocksDisposable = configuration.configureCommentBlocks();

			disposables.push(...configureCommentBlocksDisposable);
		}
	});

	// An event that is emitted when a text document is opened or when the
	// language id of a text document has been changed. As described in
	// https://github.com/microsoft/vscode/blob/4e8fbaef741afebd24684b88cac47c2f44dfb8eb/src/vscode-dts/vscode.d.ts#L13716-L13728

	// Called when active editor language is changed, so re-configure the comment blocks.
	vscode.workspace.onDidOpenTextDocument(() => {
		logger.info("Active editor language changed, re-configuring comment blocks.");
		const configureCommentBlocksDisposable = configuration.configureCommentBlocks();
		disposables.push(...configureCommentBlocksDisposable);
	});

	context.subscriptions.push(...disposables);
}
export function deactivate() {
	logger.disposeLogger();
}
