import {OutputChannel, window} from "vscode";

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
	 * Whether to log `debug` level messages or not.
	 * Set to `true` by default.
	 *
	 * @type {boolean}
	 */
	private debugMode = true;

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
	 * Turn debug mode on or off. Off will disable debug messages.
	 *
	 * TODO: Possibly add a toggle setting in the extension user settings.
	 *
	 * @param {boolean} debug Whether to enable or disable debug mode.
	 */
	public setDebugMode(debug: boolean): void {
		this.debugMode = debug;
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
		this.logMessage("INFO", message);
	}

	/**
	 * Sends a debug log message and data to the output channel if `debug` is enabled.
	 * This is helpful for logging objects and arrays.
	 *
	 * @param {string} message The message to be logged.
	 * @param {unknown} data [Optional] Extra data that is useful for debugging, like an object or array.
	 */
	public debug(message: string, data?: unknown): void {
		if (this.debugMode) {
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
		this.logMessage("ERROR", message, error);
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
		this.outputChannel.appendLine(`["${level}" - ${time}] ${message}`);

		if (meta) {
			const data: string = this.formatMeta(message, meta);

			// Output the meta data to the output channel.
			this.outputChannel.appendLine(data);
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

		return data;
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
}

export const logger = new Logger();
