/**
 * Updates CHANGELOG.md with merged PR information
 * Categorizes PRs based on conventional commit types
 * Used by the changelog-ci workflow
 *
 * Note: Exclusion checks (labels, commit types) are handled by check-changelog-exclusions.mjs
 * before this script is called, so we can assume the PR should be included.
 */

import {readFileSync, writeFileSync} from "fs";
import * as utils from "./utils.mjs";

/**
 * Maps conventional commit types to changelog sections
 */
const TYPE_TO_SECTION = {
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
 * Maps commit types to custom display prefixes in changelog entries.
 * When a type is listed here, its capitalised name is used as the prefix
 * instead of the section name. Add new types here to override the default.
 */
const TYPE_TO_PREFIX = {
	revert: "Reverted",
	refactor: "Refactored",
};

/**
 * Maps changelog prefixes to verb forms that should be removed from title starts
 * to avoid duplicated wording like "Added added ...".
 */
const PREFIX_TO_LEADING_VERB_REGEX = {
	added: /^(add|adds|added|adding)\b[\s:-]*/i,
	changed: /^(change|changes|changed|changing)\b[\s:-]*/i,
	deprecated: /^(deprecate|deprecates|deprecated|deprecating)\b[\s:-]*/i,
	fixed: /^(fix|fixes|fixed|fixing)\b[\s:-]*/i,
	refactored: /^(refactor|refactors|refactored|refactoring)\b[\s:-]*/i,
	removed: /^(remove|removes|removed|removing)\b[\s:-]*/i,
	reverted: /^(revert|reverts|reverted|reverting)\b[\s:-]*/i,
};

/**
 * Indentation used for PR description lines nested under a changelog list item 2 spaces.
 */
const DESCRIPTION_INDENT = "  ";

/**
 * Array of included commit types derived from the keys of TYPE_TO_SECTION object
 */
export const INCLUDED_TYPES = Object.keys(TYPE_TO_SECTION);

/**
 * Build regex pattern to match conventional commit type prefix
 * Matches: type(scope)?: or type!: with optional whitespace after colon
 */
const COMMIT_TYPE_REGEX = new RegExp(`^(${INCLUDED_TYPES.join("|")})(\\(.+?\\))?!?:\\s*`, "i");

/**
 * Main function to update the changelog
 *
 * @param {object} params An object containing the parameters for the function
 * @param {object} params.pr Pull request object from GitHub context
 * @param {import('@actions/core')} params.core GitHub Actions core module
 * @param {import('@actions/github-script').AsyncFunctionArguments["context"]} params.context GitHub Actions context
 * @param {import('@actions/github-script').AsyncFunctionArguments["github"]} params.github Octokit instance
 */
export default async function updateChangelog({pr, core, context, github}) {
	try {
		const prNumber = pr.number;
		const prTitle = pr.title;
		const prUrl = pr.html_url;
		const prAuthor = pr.user.login;
		const prBody = pr.body;

		console.log(`📝 Processing PR #${prNumber}: ${prTitle}`);

		// Extract type from PR title
		const type = extractType(prTitle);
		if (!type) {
			console.log(`⚠️  No valid conventional commit type found in PR title. Skipping changelog update.`);
			return;
		}

		const section = TYPE_TO_SECTION[type];
		console.log(`📂 Type: ${type} → Section: ${section}`);

		// Read current changelog
		const changelogPath = "CHANGELOG.md";
		let changelog = "";
		try {
			changelog = readFileSync(changelogPath, "utf8");
		} catch (error) {
			console.log("CHANGELOG.md not found, creating new one");
			changelog = "# Changelog\n\n";
		}

		// Get or create Unreleased section
		const {lines, unreleasedIndex} = findOrCreateUnreleased(changelog);

		// Check if this PR is already in the changelog
		if (isDuplicateEntry(lines, unreleasedIndex, prNumber)) {
			console.log(`ℹ️  PR #${prNumber} already exists in the changelog. Skipping.`);
			return;
		}

		// Format PR entry with cleaned title
		const cleanedTitle = cleanTitle(prTitle);
		const entry = await buildEntry(type, section, cleanedTitle, prNumber, prUrl, prAuthor, prBody, context, github);

		// Add entry to the appropriate section
		const updatedLines = addEntryToSection(lines, unreleasedIndex, section, entry);

		// Write updated changelog
		const updatedChangelog = updatedLines.join("\n");
		writeFileSync(changelogPath, updatedChangelog);

		console.log(`✅ Updated CHANGELOG.md with PR #${prNumber}`);

		// Set outputs for the workflow to use
		core.setOutput("changelog-updated", "true");
		core.setOutput("pr-number", prNumber);
		core.setOutput("pr-title", cleanedTitle);
		core.setOutput("pr-author", prAuthor);
	} catch (error) {
		console.error("❌ Error updating changelog:", error);
		core.setFailed(`Failed to update changelog: ${error.message}`);
	}
}

/**
 * Extracts the conventional commit type from a PR title
 *
 * @param {string} title PR title
 * @returns {string|null} The type or null if not found
 */
function extractType(title) {
	const match = title.match(COMMIT_TYPE_REGEX);
	return match ? match[1].toLowerCase() : null;
}

/**
 * Gets or creates the Unreleased section in the changelog
 *
 * @param {string} changelog Current changelog content
 * @returns {{ hasUnreleased: boolean, lines: string[], unreleasedIndex: number }}
 */
function findOrCreateUnreleased(changelog) {
	const lines = changelog.split("\n");
	const headerIndex = lines.findIndex((line) => line.startsWith("# Changelog"));

	// Find if Unreleased section exists
	const unreleasedIndex = lines.findIndex((line) => line.match(/^## \[?Unreleased\]?/i));

	if (unreleasedIndex !== -1) {
		return {hasUnreleased: true, lines, unreleasedIndex};
	}

	// Create Unreleased section - find first release section to insert before it
	// This handles cases where there are paragraphs after the changelog header
	let insertIndex = -1;

	// Look for the first release section (## [version])
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].match(/^## \[.+\]/)) {
			insertIndex = i;
			break;
		}
	}

	// If no release found, append to the end of the document (fallback behavior)
	if (insertIndex === -1) {
		insertIndex = lines.length;
	}

	// Insert Unreleased section
	const unreleasedSection = ["", "## [Unreleased]", ""];

	lines.splice(insertIndex, 0, ...unreleasedSection);

	return {hasUnreleased: false, lines, unreleasedIndex: insertIndex + 1};
}

/**
 * Checks if a PR entry already exists in the Unreleased section
 *
 * @param {array} lines Changelog lines
 * @param {number} unreleasedIndex Index of Unreleased header
 * @param {number} prNumber PR number to check
 * @returns {boolean} True if PR already exists
 */
function isDuplicateEntry(lines, unreleasedIndex, prNumber) {
	// Find the next version header (##) or end of file
	let nextSectionIndex = lines.length;
	for (let i = unreleasedIndex + 1; i < lines.length; i++) {
		if (lines[i].startsWith("## ")) {
			nextSectionIndex = i;
			break;
		}
	}

	// Check all lines in the Unreleased section for this PR number
	const prPattern = new RegExp(`\\[#${prNumber}\\]\\(`);
	for (let i = unreleasedIndex + 1; i < nextSectionIndex; i++) {
		if (prPattern.test(lines[i])) {
			return true;
		}
	}

	return false;
}

/**
 * Strips the conventional commit type prefix from a PR title
 *
 * @param {string} title PR title
 * @returns {string} Cleaned title
 */
function cleanTitle(title) {
	// Remove the type prefix (e.g., "feat: ", "fix(scope): ")
	const cleaned = title.replace(COMMIT_TYPE_REGEX, "");

	if (cleaned.length === 0) return title; // Fallback to original if something went wrong
	return cleaned;
}

/**
 * Builds the full changelog entry line for a PR
 *
 * @param {string} type Conventional commit type (e.g., "feat", "fix", "revert")
 * @param {string} section Section name resolved from TYPE_TO_SECTION
 * @param {string} cleanedTitle PR title with the type prefix stripped
 * @param {number} prNumber PR number
 * @param {string} prUrl PR HTML URL
 * @param {string} prAuthor PR author login
 * @param {string|null} prBody PR body/description
 * @param {import('@actions/github-script').AsyncFunctionArguments["context"]} context GitHub Actions context
 * @param {import('@actions/github-script').AsyncFunctionArguments["github"]} github Octokit instance
 * @returns {Promise<string>} Formatted entry line
 */
async function buildEntry(type, section, cleanedTitle, prNumber, prUrl, prAuthor, prBody, context, github) {
	const prefix = TYPE_TO_PREFIX[type] ?? section;
	const dedupedTitle = removeLeadingDuplicateVerb(prefix, cleanedTitle);
	const titlePart = dedupedTitle ? ` ${dedupedTitle}` : ` ${cleanedTitle.trim()}`;
	const description = await formatPRDescription(prBody, context, github);
	const prLink = `([#${prNumber}](${prUrl}))`;
	const entryEnd = `\n<!-- end -->`;

	return `- ${prefix}${titlePart} ${prLink} by @${prAuthor}${description}${entryEnd}`;
}

/**
 * Removes duplicated leading verbs based on the resolved changelog prefix.
 * Example: prefix "Added" + title "added support for x" => "support for x"
 *
 * @param {string} prefix Resolved changelog entry prefix
 * @param {string} title Cleaned PR title
 * @returns {string} Title without duplicated leading verb
 */
function removeLeadingDuplicateVerb(prefix, title) {
	const trimmedTitle = title.trim();
	if (!trimmedTitle) return "";

	const pattern = PREFIX_TO_LEADING_VERB_REGEX[prefix.toLowerCase()];
	if (!pattern) return trimmedTitle;

	return trimmedTitle.replace(pattern, "").trimStart();
}

/**
 * Formats the PR description with indentation for nesting under a list item
 *
 * @param {string|null} prBody PR description/body text
 * @param {import('@actions/github-script').AsyncFunctionArguments["context"]} context GitHub Actions context
 * @param {import('@actions/github-script').AsyncFunctionArguments["github"]} github Octokit instance
 * @returns {Promise<string>} Formatted description string (empty if no body)
 */
async function formatPRDescription(prBody, context, github) {
	if (!prBody || prBody.trim() === "") {
		return "";
	}

	// Convert markdown headings to bold text, and linkify bare issue/PR references
	const formatted = await linkifyReferences(prBody.replace(/^#{1,6}\s+(.+)$/gm, "**$1**"), context, github);

	// Indent each line with 1 tab (4 spaces) to nest under the list item
	// Skip indentation on empty lines to avoid trailing whitespace
	const indented = formatted
		.split("\n")
		.map((line) => (line ? `${DESCRIPTION_INDENT}${line}` : ""))
		.join("\n");
	// Always separate the description from the entry title with a blank line so
	// that markdown renders the description on its own line. Strip any leading
	// newlines from `indented` first to avoid double blank lines when prBody
	// itself starts with a blank line.
	return `\n\n${indented.replace(/^\n+/, "")}`;
}

/**
 * Converts bare issue/PR #NNN references in text into markdown links, since GitHub only
 * auto-links these in rendered comments/PR descriptions and never in the repo files.
 *
 * @link https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls#issues-and-pull-requests
 *
 * @param {string} text Text to linkify
 * @param {import('@actions/github-script').AsyncFunctionArguments["context"]} context GitHub Actions context
 * @param {import('@actions/github-script').AsyncFunctionArguments["github"]} github Octokit instance
 * @returns {Promise<string>} Text with #NNN references converted to markdown links
 */
async function linkifyReferences(text, context, github) {
	// Find all bare #NNN references first to ensure there are some references to resolve.
	const refNumbers = findBareReferences(text);

	// If there are no references to linkify, return the original text early
	// to avoid unnecessary API calls.
	if (refNumbers.size === 0) return text;

	// Find all closing keyword references to issues.
	const closingNumbers = utils.findClosingKeywordReferences(text);

	// Remove any closing keyword references from the bare reference set.
	for (const number of refNumbers) {
		if (closingNumbers.has(number)) {
			refNumbers.delete(number);
		}
	}

	// Store the updated text with links in a variable to avoid
	// mutating the original text during iteration.
	let textWithLinks = text;

	// For each closing keyword reference number...
	for (const number of closingNumbers) {
		// Resolve the reference to its real issue URL.
		const link = resolveClosingKeywordReferenceUrl(number, context);

		// Replace all occurrences of the bare reference with the markdown link.
		// (All references of the number are replaced, not just the closing keyword references.)
		textWithLinks = textWithLinks.replace(new RegExp(`(?<!\\w)#(${number})\\b(?!\\])`, "g"), `[#${number}](${link})`);
	}

	// For each bare reference number...
	for (const number of refNumbers) {
		// Resolve the reference to its real issue/PR URL.
		const link = await resolveBareReferenceUrl(number, context, github);

		// If the link couldn't be resolved, skip replacing it.
		if (!link) {
			continue;
		}

		// Replace all occurrences of the bare reference with the markdown link.
		textWithLinks = textWithLinks.replace(new RegExp(`(?<!\\w)#(${number})\\b(?!\\])`, "g"), `[#${number}](${link})`);
	}

	// Return the updated text.
	return textWithLinks;
}

/**
 * Finds all bare #NNN references to issues or PRs in the given text.
 * Already linked references are ignored, as they don't need to be linkified.
 * E.g., "#12" will be matched, but "[#13](...)" will not be matched.
 *
 * @param {string} text Text to search for bare references
 * @returns {Set<string>} Set of bare reference numbers
 */
function findBareReferences(text) {
	// Collect the bare reference numbers in a Set to ensure it only captures unique numbers.
	const refNumbers = new Set();
	let match;

	// The regex matches bare #NNN references. The (?!\]) negative lookahead ensures
	// it doesn't match references that are already linked (e.g., [#123](...)).
	const regex = /(?<!\w)#(\d+)\b(?!\])/g;
	while ((match = regex.exec(text)) !== null) {
		refNumbers.add(match[1]);
	}

	return refNumbers;
}

/**
 * Resolves a closing keyword reference to its real URL.
 * Closing keywords always refer to issues.
 *
 * @param {string} number Referenced number
 * @param {import('@actions/github-script').AsyncFunctionArguments["context"]} context GitHub Actions context
 * @returns {string} The GitHub URL for the issue
 */
function resolveClosingKeywordReferenceUrl(number, context) {
	const owner = context.repo.owner;
	const repo = context.repo.repo;

	return `https://github.com/${owner}/${repo}/issues/${number}`;
}

/**
 * Resolves a bare reference number to its real URL.
 * Bare references can point to either issues or pull requests,
 * so it requires an API call to determine the correct type.
 * If the reference cannot be resolved, an empty string is returned.
 *
 * @param {string} number Referenced number
 * @param {import('@actions/github-script').AsyncFunctionArguments["context"]} context GitHub Actions context
 * @param {import('@actions/github-script').AsyncFunctionArguments["github"]} github Octokit instance
 * @returns {Promise<string>} The resolved GitHub URL or an empty string if it couldn't be resolved.
 */
async function resolveBareReferenceUrl(number, context, github) {
	const owner = context.repo.owner;
	const repo = context.repo.repo;

	// Attempt to fetch the issue/PR data from GitHub API, using the reference number.
	try {
		const {data} = await github.rest.issues.get({
			owner,
			repo,
			issue_number: Number(number),
		});

		// If the data contains a pull_request field, it's a PR.
		if (data.pull_request) {
			// Return the PR URL
			return data.pull_request.html_url;
		}
		// Otherwise, it's an issue.
		else {
			// Return the issue URL.
			return data.html_url;
		}
	} catch (error) {
		// Catches any API errors and non-2xx status codes (404, 301, 410, etc.)
		// as well as network failures.

		console.log(`Could not resolve #${number}, leaving as-is. Error: ${error.message}`);
		// Couldn't resolve the reference so just return an empty string.
		return "";
	}
}

/**
 * Adds a PR entry to the appropriate section within Unreleased
 *
 * @param {array} lines Changelog lines
 * @param {number} unreleasedIndex Index of Unreleased header
 * @param {string} section Section name (Added, Fixed, etc.)
 * @param {string} entry PR entry to add
 * @returns {array} Updated lines
 */
function addEntryToSection(lines, unreleasedIndex, section, entry) {
	// Find the next version header (##) or end of file
	let nextSectionIndex = lines.length;
	for (let i = unreleasedIndex + 1; i < lines.length; i++) {
		if (lines[i].startsWith("## ")) {
			nextSectionIndex = i;
			break;
		}
	}

	// Look for the section header within Unreleased
	let sectionIndex = -1;
	for (let i = unreleasedIndex + 1; i < nextSectionIndex; i++) {
		if (lines[i].startsWith(`### ${section}`)) {
			sectionIndex = i;
			break;
		}
	}

	if (sectionIndex === -1) {
		// Section doesn't exist, create it
		// Find where to insert (after other sections or right after Unreleased header)
		let insertIndex = unreleasedIndex + 1;

		// Skip blank lines
		while (insertIndex < nextSectionIndex && lines[insertIndex].trim() === "") {
			insertIndex++;
		}

		// Skip all existing sections to add new section at the end
		while (insertIndex < nextSectionIndex && lines[insertIndex].startsWith("### ")) {
			// Skip section header
			insertIndex++;

			// Skip all content until the next section header or end of Unreleased
			while (insertIndex < nextSectionIndex && !lines[insertIndex].startsWith("### ")) {
				insertIndex++;
			}
		}

		// Insert new section
		lines.splice(insertIndex, 0, `### ${section}`, "", entry, "");
	} else {
		// Section exists, add entry to it
		let insertIndex = sectionIndex + 1;

		// Skip blank lines after section header
		while (insertIndex < nextSectionIndex && lines[insertIndex].trim() === "") {
			insertIndex++;
		}

		// Skip existing entries using <!-- end --> markers as definitive boundaries.
		// For entries without a marker (backward compatibility), stop at the next
		// entry title ("- ") or section header ("### ").
		while (insertIndex < nextSectionIndex && lines[insertIndex].startsWith("- ")) {
			insertIndex++; // skip the entry title line
			// Advance past description lines/blank lines up to the <!-- end --> marker
			while (
				insertIndex < nextSectionIndex &&
				lines[insertIndex] !== "<!-- end -->" &&
				!lines[insertIndex].startsWith("- ") &&
				!lines[insertIndex].startsWith("### ")
			) {
				insertIndex++;
			}
			// Skip the <!-- end --> marker if present
			if (insertIndex < nextSectionIndex && lines[insertIndex] === "<!-- end -->") {
				insertIndex++;
			}
			// Skip any blank lines between entries
			while (insertIndex < nextSectionIndex && lines[insertIndex] === "") {
				insertIndex++;
			}
		}

		// Insert entry
		lines.splice(insertIndex, 0, entry);
	}

	return lines;
}
