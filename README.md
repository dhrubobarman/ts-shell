This is a robust, POSIX-like shell implementation built with **TypeScript** and powered by the **Bun** runtime. It handles everything from complex quote parsing and command history to multi-stage pipelining and file redirection.

---

# BunShell

A high-performance, feature-complete shell written in TypeScript. BunShell provides a familiar terminal experience with support for standard POSIX syntax, including pipes, redirections, and tab-completion.

## 🚀 Features

### 1. Robust Command Parsing

The shell includes a custom tokenizer that handles the nuances of shell input:

* **Single Quotes (`'`)**: Preserves the literal value of every character within the quotes.
* **Double Quotes (`"`)**: Preserves literal values but allows for specific escapes (`\"`, `\\`, etc.).
* **Backslash Escaping (`\`)**: Supports escaping special characters outside of quotes.
* **Argument Splitting**: Correctly handles whitespace-delimited arguments.

### 2. Advanced Redirection

Supports standard output and error redirection with both overwrite and append modes:

* **`>` or `1>**`: Redirect standard output (overwrite).
* **`>>` or `1>>**`: Redirect standard output (append).
* **`2>`**: Redirect standard error (overwrite).
* **`2>>`**: Redirect standard error (append).

### 3. Pipelining (`|`)

You can chain multiple commands together. The shell manages the data flow between processes, allowing you to mix and match **external commands** (like `grep` or `ls`) and **shell builtins** (like `echo` or `history`) within the same pipeline.

### 4. Smart Tab Completion

* **Builtins & PATH**: Completes command names from shell builtins and every executable found in your `$PATH`.
* **LCP (Longest Common Prefix)**: Automatically completes the shared portion of multiple matches.
* **Visual Feedback**:
* Single Tab: Completes the command or sounds a system bell if ambiguous.
* Double Tab: Lists all possible matches (standard bash/zsh behavior).



### 5. Persistent Command History

* **Automatic Loading**: Reads previous history from your `$HISTFILE` on startup.
* **Session History**: Keeps track of all commands entered during the session.
* **Manual Management**:
* `history`: View recent commands.
* `history -a <file>`: Append new session entries to a file.
* `history -r <file>`: Read history from a file into the current session.
* `history -w <file>`: Write the current session history to a file.



### 6. Built-in Commands

Includes native implementations of:

* `echo`: Print arguments to stdout.
* `pwd`: Print current working directory.
* `cd`: Change directory (supports `~` for home).
* `type`: Locate a command (identifies builtins vs. external binaries).
* `history`: Manage command history.
* `exit`: Gracefully close the shell and save history.

---

## 🛠 Installation & Usage

### Prerequisites

* [Bun](https://bun.sh/) installed on your system.

### Running the Shell

1. Clone the repository.
2. Install dependencies:
```bash
bun install

```


3. Start the shell:
```bash
bun start

```



### Development Mode

To run with hot-reloading (the shell will restart when you save changes):

```bash
bun dev

```

### Building

To compile the shell into a standalone binary:

```bash
bun run build

```

---

## 📂 Project Structure

* **`main.ts`**: The entry point. Contains the REPL loop, redirection logic, and external process spawning.
* **`utils.ts`**: The "brains" of the operation. Contains the parser, pipeline handler, tab-completion logic, and builtin implementations.
* **`constants.ts`**: Manages shared state like the command history, executable cache (from PATH), and environment variables.

---

## 📝 Example Usage

**Piping and Redirection:**

```bash
$ echo "hello world" | type cat > output.txt
$ cat < output.txt
cat is /usr/bin/cat

```

**Complex Quoting:**

```bash
$ echo "It's a \"beautiful\" day"
It's a "beautiful" day

```

**Navigating & Locating:**

```bash
$ cd /usr/bin
$ type ls
ls is /usr/bin/ls

```

Would you like me to add a specific section for **Contribution Guidelines** or expand on the **Pipeline implementation** details?