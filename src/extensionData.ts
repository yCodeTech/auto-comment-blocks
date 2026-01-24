import * as vscode from "vscode";
import * as path from "path";
import isWsl from "is-wsl";
import {IPackageJson} from "package-json-type";

import {readJsonFile} from "./utils";
import {ExtensionMetaData, ExtensionPaths} from "./interfaces/extensionMetaData";

export class ExtensionData {
	/**
	 * This extension details in the form of a key:value Map object.
	 *
	 * @type {Map<keyof ExtensionMetaData, string>}
	 */
	private extensionData = new Map<keyof ExtensionMetaData, string>();

	/**
	 * Extension discovery paths in the form of a key:value Map object.
	 *
	 * @type {Map<keyof ExtensionPaths, string>}
	 */
	private extensionDiscoveryPaths = new Map<keyof ExtensionPaths, string>();


	/**
	 * The package.json data for this extension.
	 *
	 * @type {IPackageJson}
	 */
	private packageJsonData: IPackageJson;

	public constructor() {
		this.packageJsonData = this.getExtensionPackageJsonData();
		this.setExtensionData();
		this.setExtensionDiscoveryPaths();
	}

	/**
	 * Get the names, id, and version of this extension from package.json.
	 *
	 * @returns {IPackageJson} The package.json data for this extension, with extra custom keys.
	 */
	private getExtensionPackageJsonData(): IPackageJson {
		const extensionPath = path.join(__dirname, "../../");

		const packageJSON: IPackageJson = readJsonFile(path.join(extensionPath, "package.json"));

		// Set the id (publisher.name) into the packageJSON object as a new `id` key.
		packageJSON.id = `${packageJSON.publisher}.${packageJSON.name}`;
		packageJSON.extensionPath = extensionPath;

		// The configuration settings namespace is a shortened version of the extension name.
		// We just need to replace "automatic" with "auto" in the name.
		const settingsNamespace: string = packageJSON.name.replace("automatic", "auto");
		// Set the namespace to the packageJSON `configuration` object as a new `namespace` key.
		packageJSON.contributes.configuration.namespace = settingsNamespace;

		return packageJSON;
	}

	/**
	 * Set the extension data into the extensionData Map.
	 */
	private setExtensionData() {

		// Set each key-value pair directly into the Map
		this.extensionData.set("id", this.packageJsonData.id);
		this.extensionData.set("name", this.packageJsonData.name);
		this.extensionData.set("namespace", this.packageJsonData.contributes.configuration.namespace);
		this.extensionData.set("displayName", this.packageJsonData.displayName);
		this.extensionData.set("version", this.packageJsonData.version);
	}

	private setExtensionDiscoveryPaths() {
		// The path to the user extensions.
		// const userExtensionsPath = isWsl ? path.join(vscode.env.appRoot, "../../", "extensions") : path.join(this.extensionPath, "../");

		//TODO: REMOVE THIS BEFORE RELEASE. FOR TESTING ONLY.
		const userExtensionsPath = isWsl ? path.join(vscode.env.appRoot, "../../", "extensions") : "C:\\Users\\Stuart\\.vscode\\extensions";

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
	 * Get all extension data.
	 *
	 * @returns {ReadonlyMap<keyof ExtensionMetaData, string>} A read-only Map containing all extension details.
	 */
	public getAll(): ReadonlyMap<keyof ExtensionMetaData, string> {
		return this.extensionData;
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
