import * as vscode from "vscode";
import * as path from "path";
import isWsl from "is-wsl";
import {IPackageJson} from "package-json-type";

import {readJsonFile} from "./utils";

export class ExtensionData {
	/**
	 * This extension details in the form of a key:value Map object.
	 *
	 * @type {Map<string, string>}
	 */
	private extensionData = new Map<string, string>();

	/**
	 * The package.json data for this extension.
	 *
	 * @type {IPackageJson}
	 */
	private packageJsonData: IPackageJson;

	public constructor() {
		this.packageJsonData = this.getExtensionPackageJsonData();
		this.setExtensionData();
	}

	/**
	 * Get the names, id, and version of this extension from package.json.
	 *
	 * @returns {IPackageJson} The package.json data for this extension, plus the new `id`, and `contributes.configuration.namespace` keys.
	 */
	private getExtensionPackageJsonData(): IPackageJson {
		const packageJSON: IPackageJson = readJsonFile(__dirname + "/../../package.json");

		// Set the id (publisher.name) into the packageJSON object as a new `id` key.
		packageJSON.id = `${packageJSON.publisher}.${packageJSON.name}`;

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
		// Set all entries in the extensionData Map.
		Object.entries(this.createExtensionData()).forEach(([key, value]) => {
			this.extensionData.set(key, value);
		});
	}

	/**
	 * Create the extension data object for the extensionData Map.
	 * It also helps for type inference intellisense in the get method.
	 *
	 * @returns The extension data object with keys and values.
	 */
	private createExtensionData() {
		// The path to the user extensions.
		const userExtensionsPath = isWsl
			? path.join(vscode.env.appRoot, "../../", "extensions")
			: path.join(vscode.extensions.getExtension(id).extensionPath, "../");


		// Set the keys and values for the Map.
		// The keys will also be used for type inference in VSCode intellisense.
		return {
			id: this.packageJsonData.id,
			name: this.packageJsonData.contributes.configuration.namespace,
			displayName: this.packageJsonData.displayName,
			version: this.packageJsonData.version,
			userExtensionsPath: userExtensionsPath,
			// The path to the built-in extensions.
			// This env variable changes when on WSL to it's WSL-built-in extensions path.
			builtInExtensionsPath: path.join(vscode.env.appRoot, "extensions"),

			// Only set these if running in WSL.
			...(isWsl && {
				WindowsUserExtensionsPathFromWsl: path.dirname(process.env.VSCODE_WSL_EXT_LOCATION!),
				WindowsBuiltInExtensionsPathFromWsl: path.join(process.env.VSCODE_CWD!, "resources/app/extensions"),
			}),
		} as const;
	}

	/**
	 * Get the extension's data by a specified key.
	 *
	 * @param {K} key The key of the extension detail to get.
	 *
	 * @returns {ReturnType<typeof this.createExtensionData>[K] | undefined} The value of the extension detail, or undefined if the key does not exist.
	 */
	public get<K extends keyof ReturnType<typeof this.createExtensionData>>(key: K): ReturnType<typeof this.createExtensionData>[K] | undefined {
		return this.extensionData.get(key) as ReturnType<typeof this.createExtensionData>[K] | undefined;
	}

	/**
	 * Get all extension data.
	 *
	 * @returns {ReadonlyMap<string, string>} A read-only Map containing all extension details.
	 */
	public getAll(): ReadonlyMap<string, string> {
		return this.extensionData;
	}
}
