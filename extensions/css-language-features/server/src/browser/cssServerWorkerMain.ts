/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
declare let self: any;

<<<<<<<< HEAD:extensions/css-language-features/server/src/browser/cssServerWorkerMain.ts
import * as l10n from '@vscode/l10n';

let initialized = false;
self.onmessage = async (e: any) => {
	if (!initialized) {
		initialized = true;
		const i10lLocation = e.data.i10lLocation;
		if (i10lLocation) {
			await l10n.config({ uri: i10lLocation });
		}
		await import('./cssServerMain');
	}
};
========
.monaco-editor .mwh {
	position: absolute;
	color: var(--vscode-editorWhitespace-foreground) !important;
}
>>>>>>>> upstream/main:src/vs/editor/browser/viewParts/whitespace/whitespace.css
