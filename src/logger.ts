import * as os from "node:os";
import {OutputChannel, window} from "vscode";
import {LogLevel, logLevels} from "./interfaces/utils";

/**
 * Logger class for the Auto Comment Blocks extension.
 * This class handles logging messages of differing log levels to the output channel.
 *
 * @class Logger
 */
class Logger {
	/**************
	 * Properties *
	 **************/

	/**
	 * VScode's OutputChannel interface for logging messages to the Output Channel.
	 *
	 * @type {OutputChannel}
	 */
	private outputChannel: OutputChannel;

	/**
	 * Current log level.
	 *
	 * @type {LogLevel}
	 */
	private logLevel: LogLevel = "debug";

	/**
	 * Whether the user has already been warned that username redaction is unavailable,
	 * so the warning is only emitted once per session.
	 *
	 * @type {boolean}
	 */
	private hasWarnedAboutRedactionFailure: boolean = false;

	/***********
	 * Methods *
	 ***********/

	/**
	 * Override the output channel
	 *
	 * @param {OutputChannel} channelOverride A vscode output channel.
	 */
	public setupOutputChannel(channelOverride?: OutputChannel): void {
		if (channelOverride) {
			this.outputChannel = channelOverride;
			return;
		}
		this.outputChannel = window.createOutputChannel("Auto Comment Blocks", "log");
	}

	/**
	 * Set the log level.
	 *
	 * @param {LogLevel} level Desired log level.
	 */
	public setLogLevel(level: LogLevel | string): void {
		// If the provided log level is not valid, default to "debug" and log an error message.
		if (!this.isValidLogLevel(level)) {
			this.logLevel = "debug";
			logger.error(`Invalid log level: "${level}". Defaulting to "debug".`);
			return;
		}

		this.logLevel = level;
	}

	/**
	 * Check if the provided log level is valid.
	 * @param level The log level to check.
	 *
	 * @returns `true` if the log level is valid, `false` otherwise.
	 */
	private isValidLogLevel(level: string): level is LogLevel {
		return (Object.values(logLevels) as string[]).includes(level);
	}

	/**
	 * Allow the extension to cleanup output channel
	 */
	public disposeLogger(): void {
		this.outputChannel.dispose();
	}

	/**
	 * Show the output channel to the user.
	 */
	public showChannel(): void {
		if (this.outputChannel) {
			this.outputChannel.show();
		}
	}

	/**
	 * Sends a basic info log to the output channel.
	 *
	 * @param {string} message The message to be logged.
	 */
	public info(message: string): void {
		if (this.shouldLog("info")) {
			this.logMessage("INFO", message);
		}
	}

	/**
	 * Sends a warning log to the output channel.
	 *
	 * @param {string} message The message to be logged.
	 */
	public warn(message: string): void {
		if (this.shouldLog("warn")) {
			this.logMessage("WARN", message);
		}
	}

	/**
	 * Sends a debug log message and data to the output channel if `debug` is enabled.
	 * This is helpful for logging objects and arrays.
	 *
	 * @param {string} message The message to be logged.
	 * @param {unknown} data [Optional] Extra data that is useful for debugging, like an object or array.
	 */
	public debug(message: string, data?: unknown): void {
		if (this.shouldLog("debug")) {
			this.logMessage("DEBUG", message, data);
		}
	}

	/**
	 * Send a error message and a stack trace if available.
	 *
	 * @param {string} message The message to be logged.
	 * @param {Error} error An Error object.
	 */
	public error(message: string, error?: Error): void {
		if (this.shouldLog("error")) {
			this.logMessage("ERROR", message, error);
		}
	}

	/**
	 * Send an important message to the output channel.
	 * This is a special log level that is always emitted regardless of the log level,
	 * and should be used sparingly.
	 *
	 * @param {string} message The message to be logged.
	 */
	public important(message: string): void {
		this.logMessage("IMPORTANT", message);
	}

	/**
	 * Determine whether debug logging is enabled.
	 * @returns `true` if debug logging is enabled, `false` otherwise.
	 */
	public isDebugEnabled(): boolean {
		return this.shouldLog("debug");
	}

	/**
	 * Determine whether a log should be emitted for the current level.
	 *
	 * @param {LogLevel} requiredLevel The minimum level required to emit the log.
	 *
	 * @returns {boolean} Whether the log should be emitted.
	 */
	private shouldLog(requiredLevel: LogLevel): boolean {
		// Numeric weights used for level comparison.
		const levelWeight: Record<LogLevel, number> = {
			debug: 4, // Emits debug, info, warn, and error logs - the most verbose level.
			info: 3, // Emits info, warn, and error logs.
			warn: 2, // Emits warn and error logs.
			error: 1, // Emits error logs only.
			off: 0, // Disables all logs, except for the special "important" logs that are always emitted.
		};

		// Emit when the configured level is at least as verbose as the requested level.
		return levelWeight[this.logLevel] >= levelWeight[requiredLevel];
	}

	/**
	 * Format the message and send to output channel.
	 *
	 * @param {string} level Log level of message.
	 * @param {string} message The message to be logged.
	 * @param {unknown} meta Extra data as needed.
	 */
	private logMessage(level: string, message: string, meta?: unknown): void {
		if (!this.outputChannel) {
			this.setupOutputChannel();
		}
		const time = new Date().toLocaleTimeString();

		// Output the log message to the output channel.
		this.outputChannel.append(`["${level}" - ${time}] ${message}`);

		if (meta) {
			const data: string = this.formatMeta(message, meta);

			// Output the meta data to the output channel with a leading space.
			this.outputChannel.appendLine(` ${data}`);
		} else {
			// Output a new line to the output channel.
			this.outputChannel.appendLine("");
		}
	}

	/**
	 * Formats the meta data for logging.
	 * This method converts the meta data to a JSON string with indentation for readability.
	 *
	 * @param {string} message The message to use for checking what the meta data is related to.
	 * @param {unknown} meta The meta data to be logged, usually an object or array.
	 *
	 * @returns {string} The formatted meta data as a string.
	 */
	private formatMeta(message: string, meta: unknown): string {
		let data: string = "";
		// Convert the meta data to a JSON string with indentation for readability.
		data = JSON.stringify(meta, this.metaReplacer, "\t").trim();

		// If the message contains "filepaths", eg. "language config filepaths"...
		if (message.includes("filepaths")) {
			// Split the meta data by commas and join them with newlines for better readability.
			const lines = data.split(",");
			data = lines.join(",\n");
		}

		return this.redactUsername(data);
	}

	/**
	 * A replacer function to handle special cases in `JSON.stringify`.
	 *
	 * @param _key The key is never used, but is required by the replacer function signature.
	 * @param value The value of the property being stringified.
	 *
	 * @returns The value to be stringified.
	 */
	private metaReplacer(_key: string, value: unknown): unknown {
		// Replace RegExp objects with their string representation, to allow for
		// JSON.stringify to work properly and prevent it outputting empty objects.
		if (value instanceof RegExp) {
			return value.toString();
		}
		// Convert Map objects to plain objects to allow them to be outputted.
		else if (value instanceof Map) {
			return Object.fromEntries(value);
		}

		return value;
	}

	/**
	 * Redact the OS username from a string, replacing it with `<redacted>`, to avoid leaking
	 * it into debug logs that could be shared.
	 *
	 * @param {string} text The text to redact.
	 * @returns {string} The text with OS username replaced with `<redacted>`.
	 */
	private redactUsername(text: string): string {
		let username: string;

		// Get the current OS username using Node's userInfo() method which is
		// cross-platform compatible. It can throw an error in sandboxed/remote environments where
		// the username can't be determined. So catch any errors and return the original text
		// if we can't get the username.
		try {
			username = os.userInfo().username;
		} catch {
			this.warnOnRedactionFailure();
			return text;
		}

		// If the username is empty, return the original text.
		if (!username) {
			this.warnOnRedactionFailure();
			return text;
		}

		// Escape special characters in the username.
		const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		// Replace any occurrence of the username in the text with "<redacted>", case-insensitively, and return it.
		return text.replace(new RegExp(escapedUsername, "gi"), "<redacted>");
	}

	/**
	 * Warn once per session that debug logs may not have the username redacted,
	 * so users don't unknowingly share it in a bug report.
	 */
	private warnOnRedactionFailure(): void {
		if (this.hasWarnedAboutRedactionFailure) {
			return;
		}
		this.hasWarnedAboutRedactionFailure = true;
		this.warn("Could not determine OS username; debug logs may not be redacted before sharing.");
	}
}

export const logger = new Logger();
