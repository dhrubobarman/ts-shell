import { spawn } from "child_process";
import {
	accessSync,
	constants,
	mkdirSync,
	openSync,
	closeSync,
	writeFileSync,
	createWriteStream,
} from "fs";
import { dirname, join } from "path";
import { createInterface } from "readline";
import {
	builtins,
	pathDirs,
	commandHistory,
	loadInitialHistory,
	histFile,
} from "./constants";
import {
	parseCommand,
	writeOutput,
	completer,
	handlePipeline,
	executeBuiltin,
} from "./utils";
import { readFileSync, existsSync } from "fs";

// load initial history
if (histFile && existsSync(histFile)) {
	try {
		const content = readFileSync(histFile, "utf-8");
		const lines = content
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		loadInitialHistory(lines);
	} catch (err) {
		// Silently fail if file is unreadable, standard shell behavior
	}
}

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: "$ ",
	completer,
});

rl.prompt();

rl.on("line", (command) => {
	const trimmedLine = command.trim();
	if (trimmedLine.length > 0) {
		commandHistory.push(command);
	}
	const rawArgs = parseCommand(trimmedLine);
	if (rawArgs.length === 0) {
		rl.prompt();
		return;
	}

	// 1. Handle Pipelines first
	if (rawArgs.includes("|")) {
		const segments: string[][] = [];
		let current: string[] = [];
		for (const token of rawArgs) {
			if (token === "|") {
				segments.push(current);
				current = [];
			} else {
				current.push(token);
			}
		}
		segments.push(current);
		handlePipeline(segments, rl);
		return;
	}

	// 2. Parse Redirections (Correctly handling multiple and filtering them out)
	let stdoutFile: string | null = null;
	let stderrFile: string | null = null;
	let isAppend = false;
	let isErrAppend = false;
	const filteredArgs: string[] = [];

	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i];
		if (arg === ">" || arg === "1>") {
			stdoutFile = rawArgs[++i];
			isAppend = false;
		} else if (arg === ">>" || arg === "1>>") {
			stdoutFile = rawArgs[++i];
			isAppend = true;
		} else if (arg === "2>") {
			stderrFile = rawArgs[++i];
			isErrAppend = false;
		} else if (arg === "2>>") {
			stderrFile = rawArgs[++i];
			isErrAppend = true;
		} else {
			filteredArgs.push(arg);
		}
	}

	const [cmd, ...args] = filteredArgs;

	// 3. Prepare Directories if redirecting
	if (stdoutFile) mkdirSync(dirname(stdoutFile), { recursive: true });
	if (stderrFile) mkdirSync(dirname(stderrFile), { recursive: true });

	// 4. Check if Builtin
	if (builtins.has(cmd as any)) {
		// Determine streams
		const outStream = stdoutFile
			? createWriteStream(stdoutFile, { flags: isAppend ? "a" : "w" })
			: process.stdout;

		const errStream = stderrFile
			? createWriteStream(stderrFile, { flags: isErrAppend ? "a" : "w" })
			: process.stderr;

		// Execute the command
		executeBuiltin(cmd, args, outStream as any, errStream as any, rl);

		// Cleanup: Only .end() streams that are actual files
		if (stdoutFile && outStream !== process.stdout) {
			(outStream as any).end();
		}
		if (stderrFile && errStream !== process.stderr) {
			(errStream as any).end();
		}

		// Always prompt immediately for builtins since they are synchronous
		rl.prompt();
		return;
	}

	// 5. External Commands
	let fullPath: string | null = null;
	for (const dir of pathDirs) {
		const candidate = join(dir, cmd);
		try {
			accessSync(candidate, constants.X_OK);
			fullPath = candidate;
			break;
		} catch {}
	}

	if (fullPath) {
		const outFd = stdoutFile
			? openSync(stdoutFile, isAppend ? "a" : "w")
			: "inherit";
		const errFd = stderrFile
			? openSync(stderrFile, isErrAppend ? "a" : "w")
			: "inherit";

		const child = spawn(fullPath, args, {
			stdio: ["inherit", outFd, errFd],
			argv0: cmd,
		});

		child.on("exit", () => {
			if (typeof outFd === "number") closeSync(outFd);
			if (typeof errFd === "number") closeSync(errFd);
			rl.prompt();
		});
	} else {
		process.stderr.write(`${cmd}: command not found\n`);
		rl.prompt();
	}
});

rl.on("close", () => {
	process.exit(0);
});
