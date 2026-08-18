/**
 * Finds all closing keyword references from a given text. These are always issues.
 * Already linked references are ignored, as they don't need to be linkified.
 * E.g., "Closes #12", "Fixes #45", "Resolves #77" will all be matched,
 * but "[#13](...)" will not be matched.
 *
 * @param {string} text Text to search for closing keyword references
 * @returns {Set<string>} Set of referenced issue numbers
 */
function findClosingKeywordReferences(text) {
	// Collect the bare reference numbers in a Set to ensure it only captures unique numbers.
	const closingNumbers = new Set();
	let match;

	// Regex to match issue-closing keyword references. The (?!\]) negative lookahead ensures
	// it doesn't match references that are already linked (e.g., [#123](...)).
	const regex = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s*#(\d+)\b(?!\])/gi;

	while ((match = regex.exec(text)) !== null) {
		closingNumbers.add(match[1]);
	}

	return closingNumbers;
}
