export interface ExtensionMetaData {
	id: string;
	name: string;
	displayName: string;
	version: string;
	userExtensionsPath: string;
	builtInExtensionsPath: string;

	/**
	 * Only set when running in WSL.
	 */

	WindowsUserExtensionsPathFromWsl?: string;
	WindowsBuiltInExtensionsPathFromWsl?: string;
}
