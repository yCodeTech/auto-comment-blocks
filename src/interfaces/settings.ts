export interface Settings {
	singleLineBlockOnEnter: boolean;
	disabledLanguages: string[];
	slashStyleBlocks: string[];
	hashStyleBlocks: string[];
	semicolonStyleBlocks: string[];
	multiLineStyleBlocks: string[];
	overrideDefaultLanguageMultiLineComments: Record<string, string>;
	bladeOverrideComments: boolean;
}
