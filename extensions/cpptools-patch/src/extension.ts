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

async function GetOffset(fullpath: string): Promise<number> {
	const pattern = '48 8B C4 48 89 58 08 48 89 70 18 48 89 78 20 55 41 54 41 55 41 56 41 57 48 8D A8 ? ? ? ? 48 81 EC ? ? ? ? 48 8B 05 ? ? ? ? 48 33 C4 48 89 85 ? ? ? ? 45 33 F6 4C 89 74 24 ? 4C 89 74 24 ? 45 8D 66 0F 4C 89 64 24 ? 44 88 74 24 ? 49 83 CF FF 49 8B DF 48 FF C3 44 38 34 1A 75 F7 48 8D 4C 24 ? 49 3B DC 77 14 48 89 5C 24 ? 4C 8B C3 E8 ? ? ? ? 44 88 74 1C ? EB 0C 4C 8B CA 48 8B D3 E8 ? ? ? ? 90 41 BD ? ? ? ? 48 8B 54 24 ? 48 8B 4C 24 ? 48 83 7C 24 ? ? 0F 82 ? ? ? ? 4C 89 B5 ? ? ? ? 4D 8B C6 48 8D 44 24 ? 48 83 FA 10 48 0F 43 C1';
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
	const offset = await GetOffset(path);
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