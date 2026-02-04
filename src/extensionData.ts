import * as vscode from "vscode";
import * as path from "path";
import isWsl from "is-wsl";
import {IPackageJson} from "package-json-type";

import {readJsonFile} from "./utils";
import {ExtensionMetaData, ExtensionPaths, ExtensionMetaDataValue} from "./interfaces/extensionMetaData";

export class ExtensionData {
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

	public constructor(extensionPath: string | null = null) {
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
		// The path to the user extensions.
		//
		// On Windows/Linux/Mac: ~/.vscode[-server|remote]/extensions
		// On WSL: ~/.vscode-[server|remote]/extensions
		const userExtensionsPath = isWsl ? path.join(vscode.env.appRoot, "../../", "extensions") : path.join(this.extensionPath, "../");

		this.extensionDiscoveryPaths.set("userExtensionsPath", userExtensionsPath);
		// The path to the built-in extensions.
		// This env variable changes when on WSL to it's WSL-built-in extensions path.
		this.extensionDiscoveryPaths.set("builtInExtensionsPath", path.join(vscode.env.appRoot, "extensions"));

		// Only set these if running in WSL
		if (isWsl) {
			this.extensionDiscoveryPaths.set("WindowsUserExtensionsPathFromWsl", path.dirname(process.env.VSCODE_WSL_EXT_LOCATION!));
			this.extensionDiscoveryPaths.set("WindowsBuiltInExtensionsPathFromWsl", path.join(process.env.VSCODE_CWD!, "resources/app/extensions"));
		}
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
