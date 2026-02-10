import { spawn } from "child_process";
import {
	accessSync,
	appendFileSync,
	constants,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "fs";
import { dirname, join } from "path";
import type { Interface } from "readline";
import { PassThrough, Readable, Writable } from "stream";
import {
	builtins,
	commandHistory,
	executableCache,
	pathDirs,
	lastAppendedIndex,
	setLastAppendedIndex,
	histFile,
} from "./constants";

export function parseCommand(input: string): string[] {
	const args: string[] = [];
	let current = "";
	let inSingleQuote = false;
	let inDoubleQuote = false;

	for (let i = 0; i < input.length; i++) {
		const char = input[i];

		// 1. Handle Backslashes
		if (char === "\\") {
			if (!inSingleQuote && !inDoubleQuote) {
				// Outside quotes: Always escape the next character
				i++;
				if (i < input.length) current += input[i];
				continue;
			}

			if (inDoubleQuote) {
				// Inside double quotes: Only escape specific characters
				const nextChar = input[i + 1];
				if (
					nextChar === '"' ||
					nextChar === "\\" ||
					nextChar === "$" ||
					nextChar === "`"
				) {
					i++; // Skip the backslash
					current += nextChar;
					continue;
				}
				// Otherwise, treat the backslash literally (fall through to default)
			}
		}

		// 2. Handle Single Quotes
		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote;
			continue;
		}

		// 3. Handle Double Quotes
		if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote;
			continue;
		}

		// 4. Handle Delimiters (Spaces)
		if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
			if (current.length > 0) {
				args.push(current);
				current = "";
			}
		} else {
			// 5. Append character literally
			current += char;
		}
	}

	if (current.length > 0) {
		args.push(current);
	}

	return args;
}

export const writeOutput = (
	content: string,
	outputFile: string | null,
	isError = false,
) => {
	if (outputFile) {
		// We use appendFileSync because the file is truncated/reset
		// at the start of the command logic in main.ts
		appendFileSync(outputFile, content);
	} else {
		isError ? process.stderr.write(content) : process.stdout.write(content);
	}
};

const longestCommonPrefix = (words: string[]): string => {
	if (words.length === 0) return "";

	let prefix = words[0];

	for (let i = 1; i < words.length; i++) {
		while (!words[i].startsWith(prefix)) {
			prefix = prefix.slice(0, -1);
			if (!prefix) return "";
		}
	}

	return prefix;
};

let lastLine = "";
let tabCount = 0;

export const completer = (line: string) => {
	// 1. Start with built-in commands
	const candidates = new Set<string>([...builtins, ...executableCache]);

	// 3. Filter matches based on the current input
	const hits = Array.from(candidates)
		.filter((c) => c.startsWith(line))
		.sort(); // Sorting provides a better user experience

	// reset if line changed
	if (line !== lastLine) {
		tabCount = 0;
		lastLine = line;
	}

	// no matches
	if (hits.length === 0) {
		process.stdout.write("\x07");
		return [[], line];
	}

	// single match → complete with space
	if (hits.length === 1) {
		tabCount = 0;
		return [[hits[0] + " "], line];
	}

	// 🔥 NEW: LCP completion
	const lcp = longestCommonPrefix(hits);

	if (lcp.length > line.length) {
		tabCount = 0;
		return [[lcp], line];
	}

	// no further LCP → fallback to bell/list logic
	tabCount++;

	if (tabCount === 1) {
		process.stdout.write("\x07");
		return [[], line];
	}

	process.stdout.write("\n" + hits.join("  ") + "\n$ " + line);

	tabCount = 0;
	return [[], line];
};

export function handlePipeline(allArgs: string[][], rl: Interface) {
	const processes: any[] = [];

	const getPath = (command: string) => {
		for (const dir of pathDirs) {
			const fullPath = join(dir, command);
			try {
				accessSync(fullPath, constants.X_OK);
				return fullPath;
			} catch {}
		}
		return null;
	};

	let prevStream: Readable | null = null;

	allArgs.forEach((args, index) => {
		const [cmd, ...cmdArgs] = args;
		const isLast = index === allArgs.length - 1;
		const isBuiltin = builtins.has(cmd as any);

		const stdout = isLast ? process.stdout : new PassThrough();

		// BUILTIN
		if (isBuiltin) {
			if (prevStream) {
				prevStream.on("data", () => {}); // drain stdin
			}

			if (isLast) {
				executeBuiltin(cmd, cmdArgs, process.stdout, process.stderr, rl);
				prevStream = null;
			} else {
				const pipe = new PassThrough();

				executeBuiltin(cmd, cmdArgs, pipe, process.stderr, rl);

				pipe.end(); // 🔥 CRITICAL — send EOF

				prevStream = pipe;
			}

			return;
		}

		// EXTERNAL
		const path = getPath(cmd);
		if (!path) {
			process.stderr.write(`${cmd}: command not found\n`);
			rl.prompt();
			return;
		}

		const proc = spawn(path, cmdArgs, {
			stdio: ["pipe", "pipe", "inherit"],
		});

		processes.push(proc);

		if (prevStream) {
			prevStream.pipe(proc.stdin);
		}

		if (!isLast) {
			prevStream = proc.stdout;
		} else {
			proc.stdout.pipe(process.stdout);
		}
	});

	const last = processes[processes.length - 1];

	if (last) {
		last.on("exit", () => rl.prompt());
	} else {
		// only builtins
		rl.prompt();
	}
}

export function executeBuiltin(
	cmd: string,
	args: string[],
	stdout: Writable,
	stderr: Writable,
	rl: Interface,
): boolean {
	switch (cmd) {
		case "exit": {
			saveHistoryOnExit();
			rl.close();
			return true;
		}
		case "echo": {
			stdout.write(args.join(" ") + "\n");
			return true;
		}
		case "pwd": {
			stdout.write(process.cwd() + "\n");
			return true;
		}
		case "cd": {
			let targetDir = args[0] || "~";
			if (targetDir === "~") targetDir = process.env.HOME || process.cwd();
			try {
				process.chdir(
					targetDir.startsWith("/")
						? targetDir
						: join(process.cwd(), targetDir),
				);
			} catch {
				stderr.write(`cd: ${targetDir}: No such file or directory\n`);
			}
			return true;
		}
		case "history": {
			//append to history file
			if (args[0] === "-a" && args[1]) {
				try {
					const targetPath = args[1];
					mkdirSync(dirname(targetPath), { recursive: true });

					// Only get commands that haven't been appended yet
					const newCommands = commandHistory.slice(lastAppendedIndex);

					if (newCommands.length > 0) {
						// Join and ensure a trailing newline for the append
						const content = newCommands.join("\n") + "\n";
						appendFileSync(targetPath, content);

						// Update the pointer so we don't append these again next time
						setLastAppendedIndex(commandHistory.length);
					}
				} catch (err) {
					stderr.write(`history: ${args[1]}: Permission denied\n`);
				}
				return true;
			}
			// read history from file
			if (args[0] === "-r" && args[1]) {
				try {
					const content = readFileSync(args[1], "utf-8");
					const lines = content.split("\n");

					for (const line of lines) {
						const trimmed = line.trim();
						if (trimmed.length > 0) {
							commandHistory.push(trimmed);
						}
					}
				} catch (err) {
					stderr.write(`history: ${args[1]}: No such file or directory\n`);
				}
				return true;
			}

			// write history to file
			if (args[0] === "-w" && args[1]) {
				try {
					const targetPath = args[1];
					mkdirSync(dirname(targetPath), { recursive: true });

					const content = commandHistory.join("\n") + "\n";
					writeFileSync(targetPath, content);
				} catch (err) {
					stderr.write(
						`history: ${args[1]}: Permission denied or invalid path\n`,
					);
				}
				setLastAppendedIndex(commandHistory.length);
				return true;
			}

			const total = commandHistory.length;

			// Parse count: default to full history if args[0] is missing or invalid
			const requested = parseInt(args[0], 10);
			const count =
				!isNaN(requested) && args.length > 0
					? Math.min(total, requested)
					: total;

			// Calculate the offset so indices remain consistent
			const startIndex = total - count;

			commandHistory.slice(startIndex).forEach((line, i) => {
				// Global index = offset + current iteration index + 1
				const globalIndex = startIndex + i + 1;
				stdout.write(`${globalIndex.toString().padStart(5, " ")}  ${line}\n`);
			});
			return true;
		}
		case "type": {
			for (const arg of args) {
				if (builtins.has(arg as any)) {
					stdout.write(`${arg} is a shell builtin\n`);
				} else {
					let found = false;
					for (const dir of pathDirs) {
						const fullPath = join(dir, arg);
						try {
							accessSync(fullPath, constants.X_OK);
							stdout.write(`${arg} is ${fullPath}\n`);
							found = true;
							break;
						} catch {}
					}
					if (!found) stdout.write(`${arg}: not found\n`);
				}
			}
			return true;
		}
		default:
			return false;
	}
}

export const saveHistoryOnExit = () => {
	if (histFile && commandHistory.length > 0) {
		try {
			mkdirSync(dirname(histFile), { recursive: true });
			// Join with newlines and ensure the trailing newline
			const content = commandHistory.join("\n") + "\n";
			writeFileSync(histFile, content);
		} catch (err) {
			// Fail silently as per standard shell behavior
		}
	}
};
