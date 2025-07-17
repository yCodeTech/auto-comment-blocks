import * as fs from "node:fs";
import * as jsonc from "jsonc-parser";

/**
 * Read the file and parse the JSON.
 *
 * @param {string} filepath The path of the file.
 *
 * @returns The file content.
 */
export function readJsonFile(filepath: string): any {
	return jsonc.parse(fs.readFileSync(filepath).toString());
}

/**
 * Read the file and parse the JSON.
 *
 * @param {string} filepath The path of the file.
 * @param {any} data The data to write into the file.
 * @returns The file content.
 */
export function writeJsonFile(filepath: string, data: any): any {
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
 * @param obj The object
 * @param key The key to check in the object
 * @returns {RegExp} The reconstructed regex pattern.
 */
export function reconstructRegex(obj: any, key: string) {
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
 * @returns {object} The converted object.
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
export function convertMapToReversedObject(m: Map<string, Map<string, string>>): object {
	const result: any = {};

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
	return result;
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

	// Add items from secondary array that don't exist in primary,
	// removing any duplicates.
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
