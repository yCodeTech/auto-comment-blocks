import {IPackageJson} from "package-json-type";

// Utility types for cleaner Map typing
export type ExtensionMetaDataValue = ExtensionMetaData[keyof ExtensionMetaData];

/**
 * Extension metadata for a VSCode extension
 */
export interface ExtensionMetaData {
	/**
	 * The unique ID in the form of `publisher.name`.
	 */
	id: string;

	/**
	 * The name.
	 * Directly from package.json "name" key.
	 */
	name: string;

	/**
	 * The namespace for this extension's configuration settings,
	 * which is a slightly shorter version of the name.
	 */
	namespace?: string;

	/**
	 * The display name.
	 * Directly from package.json "displayName" key.
	 */
	displayName: string;

	/**
	 * The version.
	 * Directly from package.json "version" key.
	 */
	version: string;

	/**
	 * The absolute path to the extension.
	 */
	extensionPath: string;

	/**
	 * The full package.json data
	 */
	packageJSON: IPackageJson;
}

/**
 * Extension discovery paths configuration for this extension
 */
export interface ExtensionPaths {
	/**
	 * The path to the user extensions.
	 */
	userExtensionsPath: string;

	/**
	 * The path to the built-in extensions.
	 */
	builtInExtensionsPath: string;

	/**
	 * The Windows path to the user extensions when running in WSL.
	 *
	 * Only set when running in WSL.
	 */
	WindowsUserExtensionsPathFromWsl?: string;

	/**
	 * The Windows path to the built-in extensions when running in WSL.
	 *
	 * Only set when running in WSL.
	 */
	WindowsBuiltInExtensionsPathFromWsl?: string;
}
