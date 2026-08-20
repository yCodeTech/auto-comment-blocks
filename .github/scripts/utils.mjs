/**
 * Maps conventional commit types to changelog sections
 */
export const TYPE_TO_SECTION = {
	feat: "Added",
	fix: "Fixed",
	refactor: "Changed",
	perf: "Changed",
	revert: "Changed",
	remove: "Removed",
	security: "Security",
	change: "Changed",
	deprecate: "Deprecated",
};

/**
 * Array of included commit types derived from the keys of TYPE_TO_SECTION object
 * @see {@link TYPE_TO_SECTION}
 */
export const INCLUDED_TYPES = Object.keys(TYPE_TO_SECTION);

/**
 * Finds all closing keyword references from a given text. These are always issues.
 *
 * If `matchMarkdownLinks` is `true`, then it will match already linked references via
 * Markdown links e.g., `[#123](...)`, otherwise it will ignore them.
 *
 * Example:
 * - `matchMarkdownLinks=false`: `"Closes #12"` will be matched, but `"Closes [#13](...)"`
 * will not be matched.
 * - `matchMarkdownLinks=true`: `"Closes [#13](...)"` will be matched, but `"Closes #12"`
 * will not be matched.
 *
 * @param {string} text Text to search for closing keyword references
 *
 * @param {boolean} [matchMarkdownLinks=false] Whether to match already linked references via Markdown links e.g., `[#123](...)`. If `false` (default), it won't match Markdown links.
 * @returns {Set<string>} Set of referenced issue numbers
 */
export function findClosingKeywordReferences(text, matchMarkdownLinks = false) {
	// Collect the bare reference numbers in a Set to ensure it only captures unique numbers.
	const closingNumbers = new Set();
	let match;
	// 1st part of the regex to match issue-closing keyword references.
	let regex = "\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s*:?\\s*";

	// If matchMarkdownLinks is false, DON'T match already linked references.
	if (!matchMarkdownLinks) {
		// The (?!\]) negative lookahead ensures it DOESN'T match references
		// that are already linked (e.g., closes #12).
		regex = new RegExp(regex + "#(\\d+)\\b(?!\\])", "gi");
	}
	// Otherwise, match references that are already linked.
	else {
		// Matches already linked references (e.g., closes [#12](...)).
		regex = new RegExp(regex + "\\[#(\\d+)\\]\\(.*?\\)", "gi");
	}

	// While there are matching issue-closing keyword references in the text,
	// add the reference numbers to the Set.
	while ((match = regex.exec(text)) !== null) {
		closingNumbers.add(match[1]);
	}

	return closingNumbers;
}
