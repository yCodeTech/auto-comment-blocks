"use strict";

import * as vscode from "vscode";

import {Configuration} from "./configuration";
import {logger} from "./logger";
import {ExtensionData} from "./extensionData";
import {addDevEnvVariables} from "./utils";

export function activate(context: vscode.ExtensionContext) {
	// Setup logger first
	logger.setupOutputChannel();

	// Only load dev environment variables when not in production
	if (context.extensionMode !== vscode.ExtensionMode.Production) {
		addDevEnvVariables();
	}

	// Initialize extension data and configuration
	const extensionData = new ExtensionData();
	const configuration = new Configuration();
	const extensionName = extensionData.get("namespace");
	const extensionDisplayName = extensionData.get("displayName");

	// Store disposables for cleanup
	const disposables: vscode.Disposable[] = [];
	const configureCommentBlocksDisposable = configuration.configureCommentBlocks();
	disposables.push(...configureCommentBlocksDisposable);

	configuration.registerCommands(context);


	let disabledLangConfig: string[] = configuration.getConfigurationValue("disabledLanguages");

	if (disabledLangConfig.length > 0) {
		vscode.window.showInformationMessage(`${disabledLangConfig.join(", ")} languages are disabled for ${extensionDisplayName}.`);
	}

	/**
	 * When the configuration/user settings are changed, set the extension
	 * to reflect the settings and output a message to the user.
	 */
	const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
		// TODO: Work on automatically updating the languages instead of making the user reload the extension.

		/**
		 * Blade Override Comments - can be updated without reload
		 */
		if (event.affectsConfiguration(`${extensionName}.bladeOverrideComments`)) {
			const bladeOverrideComments: boolean = configuration.getConfigurationValue("bladeOverrideComments");
			configuration.setBladeComments(bladeOverrideComments);

			if (!configuration.isLangIdDisabled("blade")) {
				vscode.window.showInformationMessage(`${bladeOverrideComments === false ? "Disabled" : "Enabled"} Blade Override Comments setting.`);
			}
		}

		// Settings that require an extension host reload when changed.
		const reloadRequiredSettings = [
			"disabledLanguages",
			"overrideDefaultLanguageMultiLineComments",
			"multiLineStyleBlocks",
			"slashStyleBlocks",
			"hashStyleBlocks",
			"semicolonStyleBlocks",
		];

		// Settings that require extension host reload
		for (const setting of reloadRequiredSettings) {
			if (event.affectsConfiguration(`${extensionName}.${setting}`)) {
				showReloadMessage(extensionName, setting);
				break; // Only show one reload message at a time
			}
		}
	});

	disposables.push(configChangeDisposable);

	/**
	 * An event that is emitted when a text document is opened or when the
	 * language id of a text document has been changed. As described in
	 * https://github.com/microsoft/vscode/blob/4e8fbaef741afebd24684b88cac47c2f44dfb8eb/src/vscode-dts/vscode.d.ts#L13716-L13728
	 *
	 * Called when active editor language is changed, so re-configure the comment blocks.
	 */
	const documentOpenDisposable = vscode.workspace.onDidOpenTextDocument(() => {
		logger.info("Active editor language changed, re-configuring comment blocks.");
		const configureCommentBlocksDisposable = configuration.configureCommentBlocks();
		disposables.push(...configureCommentBlocksDisposable);
	});

	disposables.push(documentOpenDisposable);

	context.subscriptions.push(...disposables);
}

export function deactivate() {
	logger.disposeLogger();
}

/**
 * Shows a message prompting the user to reload the extension host.
 * @param extensionName The namespace of the extension
 * @param settingName The name of the setting that was changed
 */
function showReloadMessage(extensionName: string, settingName: string): void {
	vscode.window
		.showInformationMessage(
			`The ${extensionName}.${settingName} setting has been changed. Please reload the Extension Host to take effect.`,
			"Reload"
		)
		.then((selection) => {
			if (selection === "Reload") {
				vscode.commands.executeCommand("workbench.action.restartExtensionHost");
			}
		});
}
