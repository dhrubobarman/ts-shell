import { readdirSync } from "fs";

type Builtins = "echo" | "exit" | "type" | "pwd" | "cd" | "history";

export const builtins = new Set<Builtins>([
	"echo",
	"exit",
	"type",
	"pwd",
	"cd",
	"history",
] as const);
export const pathDirs = process.env.PATH?.split(":") || [];

// history related
export const commandHistory: string[] = [];
export let lastAppendedIndex = 0;
export const setLastAppendedIndex = (index: number) => {
	lastAppendedIndex = index;
};
export const loadInitialHistory = (lines: string[]) => {
	commandHistory.push(...lines);
	// Ensure lastAppendedIndex starts after loaded commands
	// so 'history -a' doesn't re-append them later.
	lastAppendedIndex = commandHistory.length;
};

const getPathExecutables = (): string[] => {
	const executables = new Set<string>();

	for (const dir of pathDirs) {
		try {
			const files = readdirSync(dir);
			for (const file of files) {
				// We add to the set immediately.
				// Detailed stat/access checks can be slow,
				// so we usually just rely on readdir for the cache.
				executables.add(file);
			}
		} catch {
			// Directory doesn't exist, ignore
		}
	}
	return Array.from(executables);
};

process.on("SIGUSR1", () => {
	executableCache = getPathExecutables();
});
// Initialize the cache once
export let executableCache = getPathExecutables();

export const histFile = process.env.HISTFILE;
