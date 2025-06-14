import {OutputChannel, window} from "vscode";

/**
 * Logger class for the Auto Comment Blocks extension.
 * This class handles logging messages of differing log levels to the output channel.
 *
 * @class Logger
 */
export class Logger {
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
	 * @param {OutputChannel} channel A vscode output channel.
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
	 * @param {unknown} data Extra data that is useful for debugging, like an object or array.
	 */
	public debug(message: string, data: unknown): void {
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
		this.outputChannel.appendLine(`["${level}" - ${time}] ${message}`);

		if (meta) {
			const message = JSON.stringify(meta, null, 4).trim();
			this.outputChannel.appendLine(message);
		}
	}
}
