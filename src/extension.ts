"use strict";

import * as vscode from "vscode";

import {Configuration} from "./configuration";
import {logger} from "./logger";
import {ExtensionData} from "./extensionData";
import {addDevEnvVariables} from "./utils";
import {LogLevel} from "./interfaces/utils";

export function activate(context: vscode.ExtensionContext) {
	// Setup logger first
	logger.setupOutputChannel();

	const initialLogLevel = vscode.workspace.getConfiguration("auto-comment-blocks").get<LogLevel>("logLevel", "debug");
	logger.setLogLevel(initialLogLevel);

	// Only load dev environment variables when not in production
	if (context.extensionMode !== vscode.ExtensionMode.Production) {
		addDevEnvVariables();
	}

	// Initialize extension data and configuration
	const extensionData = new ExtensionData(null, true);

	// Always output extension information to channel on activate.
	logger.important(`Activating ${extensionData.get("id")} v${extensionData.get("version")}`);
	logger.debug(`Extension details:`, extensionData.getAll(true));
	logger.debug(`Extension Discovery Paths:`, extensionData.getAllExtensionDiscoveryPaths());

	const configuration = new Configuration();
	const extensionName = extensionData.get("namespace");
	const extensionDisplayName = extensionData.get("displayName");

	// Store disposables for cleanup
	const disposables: vscode.Disposable[] = [];
	let commentBlocksDisposables: vscode.Disposable[] = [];

	// Initial configuration
	commentBlocksDisposables = configuration.configureCommentBlocks();
	disposables.push(...commentBlocksDisposables);

	configuration.registerCommands(context);

	// Show disabled languages message
	const disabledLangConfig: string[] = configuration.getConfigurationValue("disabledLanguages");
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

		/**
		 * Logging Level
		 */
		if (event.affectsConfiguration(`${extensionName}.logLevel`)) {
			const logLevel = configuration.getConfigurationValue("logLevel");
			logger.setLogLevel(logLevel);
		}

		/**
		 * Automatically update (without extension host reload) language definitions and
		 * reconfigure the comment blocks when any of the following settings are changed.
		 */
		const languageSettings = [
			"multiLineStyleBlocks",
			"slashStyleBlocks",
			"hashStyleBlocks",
			"semicolonStyleBlocks",
			"disabledLanguages",
			"overrideDefaultLanguageMultiLineComments",
		];

		for (const setting of languageSettings) {
			if (event.affectsConfiguration(`${extensionName}.${setting}`)) {
				logger.info(`Configuration setting ${extensionName}.${setting} has changed.`);
				// Dispose of old comment block configurations to prevent memory leaks
				commentBlocksDisposables.forEach((disposable) => disposable.dispose());
				commentBlocksDisposables = [];

				configuration.updateLanguageDefinitions();

				commentBlocksDisposables = configuration.configureCommentBlocks();
				disposables.push(...commentBlocksDisposables);

				logger.info("Comment block configurations have been updated.");

				break; // Only update once per change
			}
		}
	});

	disposables.push(configChangeDisposable);

	/**
	 * An event that is emitted when a text document is opened or when the
	 * language id of a text document has been changed. As described in
	 * https://github.com/microsoft/vscode/blob/4e8fbaef741afebd24684b88cac47c2f44dfb8eb/src/vscode-dts/vscode.d.ts#L13716-L13728
	 *
	 * Re-configuring the comment blocks here protects against other extensions activating
	 * after this extension and overriding our language configuration, which would cause our
	 * comment blocks to not work properly (e.g `/*!`).
	 */
	const documentOpenDisposable = vscode.workspace.onDidOpenTextDocument((e) => {
		// If the document is not a file or untitled scheme, then return early for
		// virtual documents (e.g. git, output, etc. panels), as we only need to
		// re-configure comment blocks for normal files.
		if (e.uri.scheme !== "file" && e.uri.scheme !== "untitled") {
			return;
		}

		logger.info(`Document opened or language changed to "${e.languageId}", re-configuring comment blocks.`);

		// Dispose of old comment block configurations to prevent memory leaks
		commentBlocksDisposables.forEach((disposable) => disposable.dispose());
		commentBlocksDisposables = [];

		// Create new comment block configurations
		commentBlocksDisposables = configuration.configureCommentBlocks();
		disposables.push(...commentBlocksDisposables);
	});

	disposables.push(documentOpenDisposable);

	context.subscriptions.push(...disposables);
}

export function deactivate() {
	logger.disposeLogger();
}
