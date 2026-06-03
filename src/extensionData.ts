import * as vscode from "vscode";
import * as path from "path";
import * as fs from "node:fs";
import isWsl from "is-wsl";
import {IPackageJson} from "package-json-type";

import {logger} from "./logger";
import {readJsonFile} from "./utils";
import {ExtensionMetaData, ExtensionPaths, ExtensionMetaDataValue} from "./interfaces/extensionMetaData";

export class ExtensionData {
	/**
	 * Cached result of resolving the Windows built-in extensions path while running in WSL.
	 *
	 * `undefined` means unresolved/not attempted yet.
	 * `null` means resolution attempted but failed.
	 * `string` means the resolved absolute path.
	 *
	 * @type {string | null | undefined}
	 */
	private static windowsBuiltInExtensionsPathFromWsl: string | null | undefined;

	/**
	 * Whether the unresolved Windows built-in path warning has already been shown.
	 * Prevents repeating the same warning message multiple times in a single session.
	 *
	 * @type {boolean}
	 */
	private static hasShownWindowsBuiltInExtensionsPathWarning = false;

	/**
	 * Whether this instance should surface discovery path failures to the user.
	 *
	 * Controlled by the constructor parameter `notifyDiscoveryPathFailures`.
	 *
	 * @type {boolean}
	 */
	private readonly shouldNotifyDiscoveryPathFailures: boolean;

	/**
	 * Extension data in the form of a key:value Map object.
	 *
	 * @type {Map<keyof ExtensionMetaData, ExtensionMetaDataValue>}
	 */
	private extensionData = new Map<keyof ExtensionMetaData, ExtensionMetaDataValue>();

	/**
	 * Extension discovery paths in the form of a key:value Map object.
	 *
	 * @type {Map<keyof ExtensionPaths, string>}
	 */
	private extensionDiscoveryPaths = new Map<keyof ExtensionPaths, string>();

	/**
	 * The absolute path of the requested extension.
	 *
	 * @type {string}
	 */
	private readonly extensionPath: string;

	/**
	 * The package.json data for this extension.
	 *
	 * @type {IPackageJson}
	 */
	private packageJsonData: IPackageJson;

	/**
	 * Create an instance of the ExtensionData class, which retrieves and stores metadata
	 * about an extension.
	 *
	 * @param extensionPath Optional absolute path to the extension. If not provided,
	 * defaults to the path of this extension.
	 * This is used to allow creating ExtensionData instances for other extensions by
	 * providing their paths.
	 *
	 * @param notifyDiscoveryPathFailures Whether this instance should notify discovery path
	 * failures to the user. This should generally only be `true` for the root extension instance
	 * to avoid duplicate warnings.
	 */
	public constructor(extensionPath: string | null = null, notifyDiscoveryPathFailures: boolean = false) {
		this.shouldNotifyDiscoveryPathFailures = notifyDiscoveryPathFailures;

		// Set the path if provided, otherwise default to this extension's path.
		//
		// For this extension's path, we use `__dirname` and go up two levels
		// (from "out/src" to the extension root). This path is also used to locate all other
		// user-installed extensions later for the `userExtensionsPath` discovery path.
		this.extensionPath = extensionPath ?? path.join(__dirname, "../../");

		this.packageJsonData = this.getExtensionPackageJsonData();

		// Only proceed with extension data setup if packageJsonData is NOT null.
		if (this.packageJsonData !== null) {
			this.setExtensionData();
		}

		this.setExtensionDiscoveryPaths();
	}

	/**
	 * Get the names, id, and version of this extension from package.json.
	 *
	 * @returns {IPackageJson | null} The package.json data for this extension, with extra custom keys.
	 */
	private getExtensionPackageJsonData(): IPackageJson | null {
		// Get the package.json file path.
		const packageJSONPath = path.join(this.extensionPath, "package.json");
		return readJsonFile<IPackageJson>(packageJSONPath, false);
	}

	/**
	 * Set the extension data into the extensionData Map.
	 */
	private setExtensionData() {
		// Create the extension ID (publisher.name).
		const id = `${this.packageJsonData.publisher}.${this.packageJsonData.name}`;

		// Set each key-value pair directly into the Map
		this.extensionData.set("id", id);
		this.extensionData.set("name", this.packageJsonData.name);

		// Only set the namespace if it dealing with this extension.
		if (this.packageJsonData.name === "automatic-comment-blocks") {
			// The configuration settings namespace is a shortened version of the extension name.
			// We just need to replace "automatic" with "auto" in the name.
			const settingsNamespace: string = this.packageJsonData.name.replace("automatic", "auto");

			this.extensionData.set("namespace", settingsNamespace);
		}

		this.extensionData.set("displayName", this.packageJsonData.displayName);
		this.extensionData.set("version", this.packageJsonData.version);
		this.extensionData.set("extensionPath", this.extensionPath);
		this.extensionData.set("packageJSON", this.packageJsonData);
	}

	/**
	 * Set the extension discovery paths into the extensionDiscoveryPaths Map.
	 */
	private setExtensionDiscoveryPaths() {
		// Get the DEV_USER_EXTENSIONS_PATH env variable if it exists.
		const devUserExtensionsPath = process.env.DEV_USER_EXTENSIONS_PATH;

		// The path to the user extensions.
		//
		// On Windows/Linux/Mac: ~/.vscode[-server|remote]/extensions
		// On WSL: ~/.vscode-[server|remote]/extensions
		//
		// Because the extensionPath is created from __dirname and retrieves where this extension
		// is located, in extension testing/development mode, this path will point to the local
		// development path, not the actual user extensions path. So we use the custom
		// DEV_USER_EXTENSIONS_PATH env variable to override it.
		const userExtensionsPath =
			devUserExtensionsPath || (isWsl ? path.join(vscode.env.appRoot, "../../", "extensions") : path.join(this.extensionPath, "../"));

		this.extensionDiscoveryPaths.set("userExtensionsPath", userExtensionsPath);
		// The path to the built-in extensions.
		// This env variable changes when on WSL to it's WSL-built-in extensions path.
		this.extensionDiscoveryPaths.set("builtInExtensionsPath", path.join(vscode.env.appRoot, "extensions"));

		// Only set these if running in WSL
		if (isWsl) {
			this.extensionDiscoveryPaths.set("WindowsUserExtensionsPathFromWsl", path.dirname(process.env.VSCODE_WSL_EXT_LOCATION!));

			const windowsBuiltInExtensionsPathFromWsl = this.resolveWindowsBuiltInExtensionsPathFromWsl();
			if (windowsBuiltInExtensionsPathFromWsl) {
				this.extensionDiscoveryPaths.set("WindowsBuiltInExtensionsPathFromWsl", windowsBuiltInExtensionsPathFromWsl);
			}
		}
	}

	/**
	 * Resolve the Windows built-in extensions path while running in WSL.
	 *
	 * VS Code now installs under a commit-hash directory (for example,
	 * `"C:\Users\Name\AppData\Local\Programs\Microsoft VS Code\[commit hash]\resources\app\extensions"`),
	 * so this checks both the old path (without a commit hash) and the new hashed path.
	 *
	 * @returns {string | undefined} The resolved Windows built-in extensions path if found.
	 */
	private resolveWindowsBuiltInExtensionsPathFromWsl(): string | undefined {
		// Reuse cached success/failure to avoid repeated disk scans.
		if (ExtensionData.windowsBuiltInExtensionsPathFromWsl !== undefined) {
			return ExtensionData.windowsBuiltInExtensionsPathFromWsl ?? undefined;
		}

		const vscodeCwd = process.env.VSCODE_CWD;
		if (!vscodeCwd) {
			this.handleWindowsBuiltInExtensionsPathResolutionFailure("The VSCODE_CWD environment variable is not set.");
			// Cache failure so later calls do not repeat warnings/log scans.
			ExtensionData.windowsBuiltInExtensionsPathFromWsl = null;
			return;
		}

		// Legacy VS Code path (without a commit hash).
		const legacyPath = path.join(vscodeCwd, "resources", "app", "extensions");

		// Check the legacy path first since it's a direct path and cheaper to check
		// than scanning directories. If it exists, return it.
		if (fs.existsSync(legacyPath)) {
			this.logWindowsBuiltInExtensionsPathResolutionSuccess(legacyPath, "legacy");
			ExtensionData.windowsBuiltInExtensionsPathFromWsl = legacyPath;
			return legacyPath;
		}

		// Current VS Code path with a commit-hash install folder.
		let entries: fs.Dirent[] = [];

		// Read the VSCODE_CWD directory.
		try {
			entries = fs.readdirSync(vscodeCwd, {withFileTypes: true});
		} catch {
			this.handleWindowsBuiltInExtensionsPathResolutionFailure(`Unable to read the VS Code install directory at "${vscodeCwd}".`);
			// Cache failure state and skip reattempts until extension host restarts.
			ExtensionData.windowsBuiltInExtensionsPathFromWsl = null;
			return;
		}

		// Loop through each entry in the VSCODE_CWD directory to find the commit-hash
		// directory containing the built-in extensions.
		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}

			// Examine each child directory for the new hashed install path and check if the
			// full extensions path exists within it. If it does, return it.
			const candidatePath = path.join(vscodeCwd, entry.name, "resources", "app", "extensions");
			if (fs.existsSync(candidatePath)) {
				this.logWindowsBuiltInExtensionsPathResolutionSuccess(candidatePath, `hashed (${entry.name})`);
				ExtensionData.windowsBuiltInExtensionsPathFromWsl = candidatePath;
				return candidatePath;
			}
		}

		this.handleWindowsBuiltInExtensionsPathResolutionFailure(
			`Could not resolve the Windows built-in extensions path from VSCODE_CWD "${vscodeCwd}".`
		);
		// Cache failure state (null) so subsequent calls skip re-resolution.
		ExtensionData.windowsBuiltInExtensionsPathFromWsl = null;
	}

	/**
	 * Log successful Windows built-in extension path resolution for WSL.
	 *
	 * @param {string} resolvedPath The resolved path.
	 * @param {string} resolvedPathType The detected VS Code install path type,
	 * either "legacy" or "hashed ([commit-hash])".
	 */
	private logWindowsBuiltInExtensionsPathResolutionSuccess(resolvedPath: string, resolvedPathType: string): void {
		if (!this.shouldNotifyDiscoveryPathFailures) {
			return;
		}

		logger.debug("Resolved Windows built-in extensions path from WSL:", {
			resolvedPathType,
			resolvedPath,
			VSCODE_CWD: process.env.VSCODE_CWD,
		});
	}

	/**
	 * Log and optionally show a warning if the Windows built-in extension path cannot be resolved.
	 *
	 * @param {string} message The failure reason to log.
	 */
	private handleWindowsBuiltInExtensionsPathResolutionFailure(message: string): void {
		if (!this.shouldNotifyDiscoveryPathFailures) {
			return;
		}

		logger.error(message);
		logger.debug("Windows built-in extensions path resolution context:", {
			VSCODE_CWD: process.env.VSCODE_CWD,
			VSCODE_WSL_EXT_LOCATION: process.env.VSCODE_WSL_EXT_LOCATION,
		});

		if (ExtensionData.hasShownWindowsBuiltInExtensionsPathWarning) {
			return;
		}

		ExtensionData.hasShownWindowsBuiltInExtensionsPathWarning = true;

		vscode.window
			.showWarningMessage(
				"Auto Comment Blocks could not resolve VS Code's Windows built-in extensions path while running in WSL. Some built-in language configurations may be unavailable. Check the output channel for details.",
				"Open Output Channel"
			)
			.then((selection) => {
				if (selection === "Open Output Channel") {
					logger.showChannel();
				}
			});
	}

	/**
	 * Get the extension's data by a specified key.
	 *
	 * @param {K} key The key of the extension detail to get.
	 *
	 * @returns {ExtensionMetaData[K] | undefined} The value of the extension detail, or undefined if the key does not exist.
	 */
	public get<K extends keyof ExtensionMetaData>(key: K): ExtensionMetaData[K] | undefined {
		return this.extensionData.get(key) as ExtensionMetaData[K] | undefined;
	}

	/**
	 * Get all extension data as a plain object.
	 *
	 * @returns {ExtensionMetaData} A plain object containing all extension details.
	 */
	public getAll(): ExtensionMetaData | null {
		// If no data, return null
		if (this.extensionData.size === 0) {
			return null;
		}

		return Object.fromEntries(this.extensionData) as unknown as ExtensionMetaData;
	}

	/**
	 * Get the extension discovery paths by a specified key.
	 *
	 * @param {K} key The key of the specific path to get.
	 *
	 * @returns {ExtensionPaths[K] | undefined} The value of the extension detail, or undefined if the key does not exist.
	 */
	public getExtensionDiscoveryPath<K extends keyof ExtensionPaths>(key: K): ExtensionPaths[K] | undefined {
		return this.extensionDiscoveryPaths.get(key) as ExtensionPaths[K] | undefined;
	}

	/**
	 * Get all extension discovery paths.
	 *
	 * @returns {ReadonlyMap<keyof ExtensionPaths, string>} A read-only Map containing all extension discovery paths.
	 */
	public getAllExtensionDiscoveryPaths(): ReadonlyMap<keyof ExtensionPaths, string> {
		return this.extensionDiscoveryPaths;
	}
}
