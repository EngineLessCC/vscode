/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Vccs Uwu. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import fs = require('fs');

function GetCppToolsPath() {
	let path = null;
	vscode.extensions.all.forEach(function (ex) {
		if (ex.extensionPath.includes('ms-vscode.cpptools')) {
			const fullpath = ex.extensionPath + '\\debugAdapters\\vsdbg\\bin';
			const fullpathFile = fullpath + '\\vsdbg.dll';
			if (fs.existsSync(fullpathFile)) {
				path = fullpath;
			}
		}
	});

	return path;
}

async function GetOffset(fullpath: string, pattern: string): Promise<number> {
	let matchOffset = -1;
	let idx = 0;
	let offset = 0;
	const stream = fs.createReadStream(fullpath + '\\vsdbg.dll');
	const promise = new Promise<number>(function (resolve, reject) {
		console.log('cpptools-patch: starting scan');
		stream.on('data', chunk => {
			for (let fi = 0; fi < chunk.length; fi++) {
				offset++;
				const byte = chunk[fi];
				for (let i = idx; idx < pattern.length; i++) {
					let hex = 0x00;
					let skip = false;
					if (pattern[idx] === '?') {
						skip = true;
						idx += 2;
					} else {
						hex = parseInt('0x' + pattern[idx] + pattern[idx + 1]);
						if (byte !== hex) {
							matchOffset = -1;
							idx = 0;
							break;
						}
						idx += 3;
					}
					if (matchOffset === -1) {
						matchOffset = offset;
					}
					if (idx >= pattern.length) {
						return;
					}
					break;
				}
			}
		});
		stream.on('end', () => {
			stream.close(function () {
				console.log('cpptools-patch: ended scan');
				resolve(matchOffset);
			});
		});
	});

	return await promise;
}

function ApplyPatch(fullpath: string, offset: number) {
	fs.copyFileSync(fullpath + '\\vsdbg.dll', fullpath + '\\vsdbg-patch.dll');
	fs.open(fullpath + '\\vsdbg-patch.dll', 'r+', function (err, fd) {
		if (err) {
			console.log('cpptools-patch: ' + err);
			return;
		}
		const patch = Int8Array.from([0xb0, 0x01, 0xC3]);
		fs.write(fd, patch, 0, 3, offset, function (err, written, string) {
			if (err) {
				console.log('cpptools-patch: ' + err);
				return;
			}
			fs.closeSync(fd);
			fs.renameSync(fullpath + '\\vsdbg.dll', fullpath + '\\vsdbg.dll.bkp');
			fs.renameSync(fullpath + '\\vsdbg-patch.dll', fullpath + '\\vsdbg.dll');
			console.log('cpptools-patch: success! ' + written);
		});
	});
}

async function DoTheThing() {
	const path = GetCppToolsPath();
	if (path === null) {
		console.log('cpptools-patch: path is null');
		return;
	}
	let offset = await GetOffset(path, "48 8B C4 48 89 58 08 48 89 70 18 48 89 78 20 55 41 54 41 55 41 56 41 57 48 8D A8");
	if (offset === -1) {
		offset = await GetOffset(path, "48 89 5C 24 08 48 89 74 24 18 55 57 41 54 41 55 41 56 48 8D AC 24 50 FF FF FF");
	}
	console.log('cpptools-patch: matched pattern at offset ' + offset.toString(16));
	if (offset === -1) {
		console.log('cpptools-patch: offset is -1');
		return;
	}
	ApplyPatch(path, offset);
}

export function activate(context: vscode.ExtensionContext) {
	console.log('cpptools-patch: is active!');

	DoTheThing();

	const disposable = vscode.commands.registerCommand('extension.cpptools-patch', async () => {
		DoTheThing();
	});

	context.subscriptions.push(disposable);
}