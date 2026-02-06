import * as fs from "node:fs";
import * as path from "node:path";
import * as jsonc from "jsonc-parser";
import {logger} from "./logger";
import {window} from "vscode";
import {JsonObject, JsonValue} from "./interfaces/utils";

/**
 * Read the file and parse the JSON.
 *
 * @param {string} filepath The path of the file.
 * @param {boolean} [throwOnFileMissing=true] Whether to throw an error if the file doesn't exist.
 * If `false`, returns `null`. Default is `true`.
 *
 * @returns {T | null} The JSON file content as the passed T type (defaulting to a JSON object)
 * or `null` if file doesn't exist and `throwOnFileMissing` is `false`.
 * @throws Will throw an error if the JSON file cannot be parsed or if file doesn't exist and `throwOnFileMissing` is `true`.
 */
export function readJsonFile<T extends JsonValue = JsonObject>(filepath: string, throwOnFileMissing: boolean = true): T | null {
	// Check if file exists first.
	// If file doesn't exist...
	if (!fs.existsSync(filepath)) {
		// If throwOnFileMissing param is true, throw an error.
		if (throwOnFileMissing) {
			const error = new Error(`JSON file not found: "${filepath}"`);
			logger.error(error.stack);
			throw error;
		}
		// Otherwise just return null.
		return null;
	}

	const jsonErrors: jsonc.ParseError[] = [];

	// Read the contents of the JSON file.
	const fileContent = fs
		.readFileSync(filepath, {encoding: "utf8"})
		.toString()
		.replace(/^\uFEFF/, ""); // Remove BOM if present.

	const jsonContents = jsonc.parse(fileContent, jsonErrors, {allowEmptyContent: true}) ?? {};

	if (jsonErrors.length > 0) {
		const errorMessages = constructJsonParseErrorMsg(filepath, fileContent, jsonErrors);
		const errorMsg = "Failed to parse a required JSON file";
		const error = new Error(`${errorMsg}: "${filepath}"\n\n\tParse Errors:\n\n${errorMessages}\n\tStack Trace:`);

		logger.error(error.stack);

		window
			.showErrorMessage(
				`${errorMsg}. The extension cannot continue. Please check the "Auto Comment Blocks" Output Channel for errors.`,
				"OK",
				"Open Output Channel"
			)
			.then((selection) => {
				if (selection === "Open Output Channel") {
					logger.showChannel();
				}
			});

		throw error;
	}

	return jsonContents as T;
}

/**
 * Construct detailed JSON parse error messages with file, line, and column information.
 *
 * @param {string} filepath The path of the file.
 * @param {string} fileContent The content of the file.
 * @param {jsonc.ParseError[]} jsonErrors The JSON parse errors.
 *
 * @returns {string} The constructed error message.
 */
function constructJsonParseErrorMsg(filepath: string, fileContent: string, jsonErrors: jsonc.ParseError[]): string {
	return jsonErrors
		.map((err, i) => {
			// Get the error name from the numeric error code.
			// The name is PascalCased, so we need to format it by adding spaces
			// before capital letters for readability.
			const errorName = jsonc
				.printParseErrorCode(err.error)
				.replace(/([A-Z])/g, " $1")
				.trim();

			// Calculate line and column numbers from the error offset.
			const lineNumber = fileContent.substring(0, err.offset).split("\n").length;
			const columnNumber = err.offset - fileContent.lastIndexOf("\n", err.offset - 1);

			// Return the formatted error message.
			return `\tError ${i + 1} - ${errorName} at "${filepath}:${lineNumber}:${columnNumber}"\n`;
		})
		.join("\n");
}

/**
 * Read the file and parse the JSON.
 *
 * @param {string} filepath The path of the file.
 * @param {JsonValue} data The data to write into the file.
 */
export function writeJsonFile(filepath: string, data: JsonValue) {
	// Write the updated JSON back into the file and add tab indentation
	// to make it easier to read.
	fs.writeFileSync(filepath, JSON.stringify(data, null, "\t"));
}

/**
 * Ensure that the directory exists. If it doesn't exist, create it.
 *
 * @param {string} dir The directory path to ensure exists.
 */
export function ensureDirExists(dir: string) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
}

/**
 * Reconstruct the regex pattern because vscode doesn't like the regex pattern as a string,
 * or some patterns are not working as expected.
 *
 * @param {unknown} obj The object
 * @param {string} key The key to check in the object
 * @returns {RegExp} The reconstructed regex pattern.
 */
export function reconstructRegex(obj: unknown, key: string): RegExp {
	// If key has a "pattern" key, then it's an object...
	if (Object.hasOwn(obj[key], "pattern")) {
		return new RegExp(obj[key].pattern);
	}
	// Otherwise it's a string.
	else {
		return new RegExp(obj[key]);
	}
}

/**
 * Convert a Map to an object with it's inner Map's keys and values reversed/switched.
 *
 * Code based on this StackOverflow answer https://stackoverflow.com/a/45728850/2358222
 *
 * @param {Map<string, Map<string, string>>} m The Map to convert to an object.
 * @returns {T} The converted object.
 *
 * @example
 * reverseMapping(
 * 	Map {
 * 		"supportedLanguages" => Map {
 * 			"apacheconf" => "#",
 * 			"c" => "//",
 * 			"clojure" => ";",
 * 			"coffeescript" => "#",
 * 			"cpp" => "//",
 * 			…
 * 		}
 * 	}
 * );
 *
 * // Converts to:
 *
 * {
 * 	"supportedLanguages" => {
 * 		"#": ["apacheconf", "coffeescript"],
 * 		"//": ["c", "cpp"],
 * 		";": ["clojure"]
 * 	}
 * }
 */
export function convertMapToReversedObject<T extends JsonValue = JsonObject>(m: Map<string, Map<string, string>>): T {
	const result = {};

	// Convert a nested key:value Map from inside another Map into an key:array object,
	// while reversing/switching the keys and values. The Map's values are now the keys of
	// the object and the Map's keys are now added as the values of the array. The reversed
	// object is added to the key of the outerMap.

	// Loop through the outer Map...
	for (const [key, innerMap] of m.entries()) {
		// Convert the inner Map to an object
		const o = Object.fromEntries(innerMap);

		// Reverse the inner object mapping.
		//
		// Loop through the object (o) keys, assigns a new object (r) with the value of the
		// object key (k) as the new key (eg. "//") and the new value is an array of all
		// the original object keys (o[k]) (eg. "php").
		// If the key (o[k]) already exists in the new object (r), then just add the
		// original key to the array, otherwise start a new array ([]) with the original
		// key as value ( (r[o[k]] || []).concat(k) ).
		// Add this new reversed object to the result object with the outer map key
		// as the key.
		result[key] = Object.keys(o).reduce((r, k) => Object.assign(r, {[o[k]]: (r[o[k]] || []).concat(k)}), {});
	}
	return result as T;
}

/**
 * Merges two arrays of objects, removing duplicates based on a specified property.
 *
 * Code based on "2023 update" portion of this StackOverflow answer:
 * https://stackoverflow.com/a/1584377/2358222
 *
 * @param {T[]} primaryArray The primary array of objects (takes precedence).
 * @param {T[]} secondaryArray The secondary array of objects to merge in.
 * @param {keyof T} key The property key to check for duplicates.
 *
 * @returns {T[]} The merged array without duplicates
 *
 * @example
 * const users1 = [{id: 1, name: 'John'}, {id: 2, name: 'Jane'}];
 * const users2 = [{id: 2, name: 'Jane'}, {id: 3, name: 'Jane Doe'}];
 * const merged = mergeArraysBy(users1, users2, 'name');
 * // Result: [{id: 1, name: 'John'}, {id: 2, name: 'Jane'}, {id: 3, name: 'Jane Doe'}]
 */
export function mergeArraysBy<T>(primaryArray: T[], secondaryArray: T[], key: keyof T): T[] {
	// Handle undefined/null arrays
	const primary = primaryArray || [];
	const secondary = secondaryArray || [];

	// Start with primary array (avoids side effects)
	const merged = [...primary];

	// Add items from secondary array that don't exist in primary, removing any duplicates.
	secondary.forEach((item) => {
		// Test all items in the merged array to check if the value of the key
		// already exists in the merged array.
		const exists: boolean = merged.some((existingItem) => item[key] === existingItem[key]);

		// If the value of the key does not exist in the merged array,
		// then add the item, which prevents duplicates.
		if (!exists) {
			merged.push(item);
		}
	});

	return merged;
}

/**
 * Add development environment variables from a local .env file located in the project root.
 */
export function addDevEnvVariables() {
	// Try to load the local .env file from the project root.
	try {
		process.loadEnvFile(path.join(__dirname, "../../.env"));
	} catch (error) {
		// Ignore errors if the .env file doesn't exist
	}

	// Validate the loaded environment variables
	validateDevEnvVariables();
}

/**
 * Validate and sanitize the `DEV_USER_EXTENSIONS_PATH` environment variable.
 * Removes invalid paths from the environment with logged errors.
 */
function validateDevEnvVariables() {
	// Validate DEV_USER_EXTENSIONS_PATH if it was loaded
	if (process.env.DEV_USER_EXTENSIONS_PATH) {
		// Trim whitespace and resolve the path to an absolute path
		let devPath = path.resolve(process.env.DEV_USER_EXTENSIONS_PATH.trim());

		let stats: fs.Stats;
		let errorMsg: string = "";
		let errorData: Error;

		// Get the file system stats for the path to check if it exists.
		// statSync throws an exception if the no file system data exists for the path,
		// so we catch it to handle errors gracefully.
		try {
			stats = fs.statSync(devPath);
		} catch (error) {
			const nodeError = error as NodeJS.ErrnoException;
			const errorCode = nodeError.code || "UNKNOWN";

			// Handle specific file system errors with user-friendly messages.
			const errorMessages = {
				ENOENT: "Path from env variable 'DEV_USER_EXTENSIONS_PATH' does not exist",
				EACCES: "Permission denied accessing path from env variable 'DEV_USER_EXTENSIONS_PATH'",
				UNKNOWN: "Unknown error accessing the path from env variable 'DEV_USER_EXTENSIONS_PATH'",
			};

			errorMsg = `${errorCode}: ${errorMessages[errorCode]}: "${devPath}". Removing from environment.`;

			errorData = error as Error;

			delete process.env.DEV_USER_EXTENSIONS_PATH;
		}

		// If stats has data AND the path is NOT a directory
		if (stats && !stats.isDirectory()) {
			errorMsg = `DEV_USER_EXTENSIONS_PATH is not a directory: "${devPath}". Removing from environment.`;
		}

		// If there was an error...
		if (errorMsg.length > 0) {
			// Delete the environment variable to prevent issues later on and log the error.
			delete process.env.DEV_USER_EXTENSIONS_PATH;
			logger.error(errorMsg, errorData);
		}
		// Otherwise, if there are no errors...
		else {
			// Update the environment variable with the sanitized path and log a success message.
			process.env.DEV_USER_EXTENSIONS_PATH = devPath;
			logger.info(`Loaded DEV_USER_EXTENSIONS_PATH: "${devPath}"`);
		}
	}
}
