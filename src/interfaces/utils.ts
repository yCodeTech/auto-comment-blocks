import {SingleLineCommentStyle} from "./commentStyles";

/**
 * Represents a JSON object.
 */
export interface JsonObject {
	[key: string]: JsonValue;
}

/**
 * Represents a valid JSON value.
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

/**
 * Represents a JSON array.
 */
export type JsonArray = JsonValue[] | readonly JsonValue[];

/**
 * Structure for single-line language definitions JSON file
 */
export interface SingleLineLanguageDefinitions extends JsonObject {
	supportedLanguages: Record<SingleLineCommentStyle, string[]>;
	customSupportedLanguages: Record<SingleLineCommentStyle, string[]>;
}

/**
 * Structure for multi-line language definitions JSON file
 */
export interface MultiLineLanguageDefinitions extends JsonObject {
	supportedLanguages: string[];
	customSupportedLanguages: string[];
}

/**
 * Language ID
 */
export type LanguageId = string;
