/**
 * Define the single-line comment styles.
 */
export type SingleLineCommentStyle = "//" | "#" | ";";

/**
 * Define the extra single-line comment styles, like `///`, etc.
 */
export type ExtraSingleLineCommentStyles = "##" | ";;" | "///" | "//!";

/**
 * Line Comments
 *
 * Taken directly from VScode's commit in June 2025 that changed the line comment config.
 * https://github.com/microsoft/vscode/commit/d9145a291dcef0bad3ace81a3d55727ca294c122#diff-0dfa7db579eface8250affb76bc88717725a121401d4d8598bc36b92b0b6ef62
 *
 * The @types/vscode package does not yet have these changes.
 * So until they're added, we define them manually.
 */

/**
 * The line comment token, like `// this is a comment`.
 * Can be a string, an object with comment and optional noIndent properties, or null.
 */
export type LineComment = string | LineCommentConfig | null;

/**
 * Configuration for line comments.
 */
export interface LineCommentConfig {
	/**
	 * The line comment token, like `//`
	 */
	comment: string;

	/**
	 * Whether the comment token should not be indented and placed at the first column.
	 * Defaults to false.
	 */
	noIndent?: boolean;
}
