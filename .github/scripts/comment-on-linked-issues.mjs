/**
 * Comments on closed issues referenced (directly, or indirectly via a linked PR)
 * in a version's changelog entry. Used by the publish workflow after a release deploy.
 */

import {readFileSync} from "fs";
import * as utils from "./utils.mjs";

/**
 * Main function to comment on closed issues referenced in a version's changelog entry.
 *
 * @param {object} params
 * @param {import('@actions/github-script').AsyncFunctionArguments["github"]} params.github Octokit instance
 * @param {import('@actions/github-script').AsyncFunctionArguments["context"]} params.context Workflow run context
 * @param {string} params.version Released version (without leading "v")
 */
export default async function commentOnLinkedIssues({github, context, version}) {
	const owner = context.repo.owner;
	const repo = context.repo.repo;
	const releaseUrl = context.payload.release.html_url;

	// Read the changelog.
	const changelog = readFileSync("CHANGELOG.md", "utf8");
	// Extract the changelog entry for the released version.
	const entry = extractChangelogEntry(changelog, version);

	// Find all closing keyword issue references.
	const issuesToComment = utils.findClosingKeywordReferences(entry, true);

	console.log("Issues to comment on:", [...issuesToComment]);

	// Loop through each issue number and comment on it with a message about the release.
	for (const issueNumber of issuesToComment) {
		const comment = `🚀 This issue has been resolved and released in [v${version}](${releaseUrl})! Please update to v${version}.`;

		// If a comment already exists for the version, skip commenting on this issue.
		if (await commentExists(github, context, issueNumber, `${comment}`)) {
			console.log(`Comment already exists on issue #${issueNumber}, skipping.`);
			continue;
		}

		// Create a comment on the issue.
		await github.rest.issues.createComment({
			owner,
			repo,
			issue_number: issueNumber,
			body: comment,
		});
		console.log(`Commented on issue #${issueNumber}`);
	}
}

/**
 * Extracts the changelog section for a given version
 *
 * @param {string} changelog Full CHANGELOG.md content
 * @param {string} version Version to find (without leading "v")
 * @returns {string} The changelog entry text for that version
 */
function extractChangelogEntry(changelog, version) {
	// Find the index of the version heading in the changelog.
	const versionHeadingIndex = changelog.indexOf(`## [${version}]`);

	// If the version heading is not found, throw an error.
	if (versionHeadingIndex === -1) {
		throw new Error(`Could not find CHANGELOG.md entry for version ${version}`);
	}

	// Find the index of the next version heading (or end of file)
	const nextHeadingIndex = changelog.indexOf("\n## [", versionHeadingIndex + 1);

	// Return the full version entry section in the changelog. The section starts with the
	// version heading and continues until the next version heading or the end of the file.
	return nextHeadingIndex === -1 ? changelog.slice(versionHeadingIndex) : changelog.slice(versionHeadingIndex, nextHeadingIndex);
}

/**
 * Checks if a comment with the given substring already exists on the issue.
 *
 * @param {import('@actions/github-script').AsyncFunctionArguments["github"]} github Octokit instance
 * @param {import('@actions/github-script').AsyncFunctionArguments["context"]} context GitHub Actions context
 * @param {number} issueNumber Issue number
 * @param {string} substring Substring to check for in the comment body
 * @returns {boolean} True if a comment containing the substring exists, false otherwise
 */
async function commentExists(github, context, issueNumber, substring) {
	// Paginate through all existing comments on the issue and
	// check if any comment contains the substring.
	const filteredArray = await github.paginate(
		github.rest.issues.listComments,
		{
			owner: context.repo.owner,
			repo: context.repo.repo,
			issue_number: issueNumber,
		},
		// A callback function is called for each page of comments and returns a
		// filtered array of comments that match the criteria.
		(response, done) => {
			// Find the comment containing the substring in the body.
			const foundComment = response.data.find((comment) => comment.body.includes(substring));

			// If a comment is found, we can stop paginating and return the comment.
			if (foundComment) {
				done();
				return foundComment;
			}

			// Otherwise, continue paginating through the comments until we find a match or
			// reach the end of the list. Return an empty array if no comment is found.
			return [];
		},
	);

	console.log("Comments found:", filteredArray);

	// If the filtered array contains any comments that
	// match the substring, return true, false otherwise.
	return filteredArray.length > 0 ? true : false;
}
