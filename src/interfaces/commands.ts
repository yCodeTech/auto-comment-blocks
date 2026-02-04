import * as vscode from "vscode";

/**
 * Defines the structure for registering commands.
 */
export interface CommandRegistration {
	/**
	 * The command ID, corresponding to those defined in package.json
	 *
	 * @type {keyof Commands}
	 */
	command: keyof Commands;

	/**
	 * The command handler function.
	 *
	 * The parameters are passed to the handler automatically by VS Code when the
	 * command is executed.
	 *
	 * @param textEditor The text editor
	 * @param edit The text editor edits. Optional because some commands may not need it.
	 * @returns void
	 */
	handler: (textEditor: vscode.TextEditor, edit?: vscode.TextEditorEdit) => void;
}

/**
 * Defines command IDs without the namespace prefix.
 */
interface Commands {
	singleLineBlock: string;
	changeBladeMultiLineBlock: string;
}
