"use strict";

import {IndentAction, OnEnterRule} from "vscode";

export class Rules {
	static readonly multilineEnterRules: OnEnterRule[] = [
		{
			// e.g. /* | */
			// (matches /* */ with any amount of spaces before it and any character in it.)
			beforeText: /^\s*\/\*(?!\/)([^\*!]|\*(?!\/))*$/,
			afterText: /^\s*\*\/$/,
			action: {indentAction: IndentAction.IndentOutdent, appendText: " * "},
		},
		{
			// e.g. /** | */
			// (matches /** */ with any amount of spaces before it and any character in it.)
			beforeText: /^\s*\/\*\*(?!\/)([^\*!]|\*(?!\/))*$/,
			afterText: /^\s*\*\/$/,
			action: {indentAction: IndentAction.IndentOutdent, appendText: " * "},
		},
		{
			// e.g. /**     |
			// (matches /** with any amount of spaces before or after it.)
			beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
			action: {indentAction: IndentAction.None, appendText: " * "},
		},
		{
			// e.g.     *      |
			// (matches a * with any amount of space before and any character after it.)
			beforeText: /^(\t|(\ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
			action: {indentAction: IndentAction.None, appendText: "* "},
		},
		{
			// e.g.  */|
			// (matches */ with any amount of space before it.)
			beforeText: /^(\t|(\ ))*\ \*\/\s*$/,
			action: {indentAction: IndentAction.None, removeText: 1},
		},
		{
			// e.g.   *         */|
			// (matches *  */ and any amount of spaces at the start and any
			// amount of spaces between before the */)
			beforeText: /^(\t|(\ ))*\ \*[^/]*\*\/\s*$/,
			action: {indentAction: IndentAction.None, removeText: 1},
		},
		{
			// e.g. /*! | */
			// (matches /*! */ with any amount of spaces before it and any character in it.)
			beforeText: /^\s*\/\*\!(?!\/)([^\*]|\*(?!\/))*$/,
			afterText: /^\s*\*\/$/,
			action: {indentAction: IndentAction.IndentOutdent, appendText: " *! "},
		},
		{
			// e.g. /*!    |
			// (matches /*! with any amount of spaces before it.)
			beforeText: /^\s*\/\*\!(?!\/)([^\*]|\*(?!\/))*$/,
			action: {indentAction: IndentAction.None, appendText: " *! "},
		},
		{
			// e.g.  *!  |
			// (matches *! on a new line with any amount of spaces before it.)
			beforeText: /^(\t|(\ ))*\ \*!(\ ([^\*]|\*(?!\/))*)?$/,
			action: {indentAction: IndentAction.None, appendText: "*! "},
		},
		{
			// e.g. /*  |
			// (matches /* with any amount of spaces before it and any characters after it.)
			beforeText: /^\s*\/\*(?!\/)([^\*]|\*(?!\/))*$/,
			action: {indentAction: IndentAction.None, appendText: " * "},
		},
		{
			// e.g. {{-- | --}}
			// (matches {{--  --}} with any amount of spaces before it and any
			// characters inbetween.)
			beforeText: /^\s*\{\{\-\-(?!\/)([^\-\-\}\}]|\*(?!\}))*$/,
			afterText: /^\s*\-\-\}\}$/,
			action: {indentAction: IndentAction.IndentOutdent, appendText: "  - "},
		},
		{
			// e.g. {{--    |
			// (matches {{-- with any amount of spaces before it and any characters after it.)
			beforeText: /^\s*\{\{\-\-(?!\/)([^\-\-\}\}]|\*(?!\/))*$/,
			action: {indentAction: IndentAction.None, appendText: "  - "},
		},
		{
			// e.g.  -  |
			// (matches a - with any amount of space before and any character after it.)
			beforeText: /^(\t|(\ ))*\ \-(\ ([^\-]|\-(?!\-))*)?$/,
			action: {indentAction: IndentAction.None, appendText: "- "},
		},
	];

	static readonly slashEnterRules: OnEnterRule[] = [
		{
			// e.g. //    |
			// (matched // with any amount of spaces before it.)
			beforeText: /^\s*\/\/(?!\/)/,
			action: {indentAction: IndentAction.None, appendText: "// "},
		},
		{
			// e.g. ///   |
			// (matches /// with any amount of spaces before it.)
			beforeText: /^\s*\/\/\//,
			action: {indentAction: IndentAction.None, appendText: "/// "},
		},
		{
			// e.g. //!   |
			// (matches //! with any amount of spaces before it.)
			beforeText: /^\s*\/\/!/,
			action: {indentAction: IndentAction.None, appendText: "//! "},
		},
	];

	static readonly hashEnterRules: OnEnterRule[] = [
		{
			// e.g. #   |
			// (matches # with any amount of spaces before it.)
			beforeText: /^\s*#/,
			action: {indentAction: IndentAction.None, appendText: "# "},
		},
	];

	static readonly semicolonEnterRules: OnEnterRule[] = [
		{
			// e.g. ;   |
			// (matches ; with any amount of spaces before it.)
			beforeText: /^\s*;(?!;)/,
			action: {indentAction: IndentAction.None, appendText: "; "},
		},
		{
			// e.g. ;;   |
			// (matches ;; with any amount of spaces before it.)
			beforeText: /^\s*;;/,
			action: {indentAction: IndentAction.None, appendText: ";; "},
		},
	];
}
