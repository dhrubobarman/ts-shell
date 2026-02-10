This is a solid implementation of a POSIX-like shell. You’ve handled some of the trickiest parts of shell development, specifically **nested quoting**, **pipelining**, and **IO redirection** (including stderr, which many skip).

Here is a structured `README.md` that highlights the technical depth of your project.

---

# TS-Shell

A functional, POSIX-style shell environment built from scratch using **Node.js** and **TypeScript**. This project implements core shell mechanics, including process management, command pipelining, and a custom recursive-descent style parser for handling quotes and escapes.

## 🚀 Features

### 1. Core Shell Builtins

The shell includes native implementations of essential commands:

* `echo`: Print text to standard output.
* `pwd`: Print the current working directory.
* `cd`: Navigate directories (supports `~` for home).
* `type`: Locate a command (builtin or external disk path).
* `exit`: Gracefully shut down the shell and save history.
* `history`: Manage command history with support for flags (`-a` append, `-r` read, `-w` write).

### 2. Advanced Command Execution

* **External Commands**: Automatically searches your system `$PATH` to execute binaries (like `ls`, `grep`, or `cat`).
* **Pipelining (`|`)**: Support for chaining multiple commands together, passing the output of one as the input to the next.
* **IO Redirection**:
* `>` or `1>`: Redirect stdout (overwrite).
* `>>` or `1>>`: Redirect stdout (append).
* `2>`: Redirect stderr (overwrite).
* `2>>`: Redirect stderr (append).



### 3. Interactive UX

* **Tab Completion**: Smart completion for builtins and system executables. Includes **Longest Common Prefix (LCP)** logic and "bell" alerts for multiple matches.
* **Persistent History**: Loads previous sessions from your `HISTFILE` and saves new commands upon exit.
* **Robust Parsing**: Handles single quotes (`'`), double quotes (`"`), and backslash escapes (`\`) according to standard shell behavior.

---

## 🛠 Installation & Setup

1. **Clone the repository:**
```bash
git clone https://github.com/dhrubobarman/ts-shell.git
cd ts-shell

```


2. **Install dependencies:**
```bash
npm install

```


3. **Compile and Run:**
```bash
# To run directly using ts-node
npx ts-node main.ts

# Or build to JS
npm run build
node dist/main.js

```



---

## 📂 Project Structure

| File | Responsibility |
| --- | --- |
| **`main.ts`** | The entry point. Manages the REPL loop, signal handling, and primary execution logic. |
| **`utils.ts`** | The "engine room." Contains the command parser, pipeline handler, and builtin logic. |
| **`constants.ts`** | Centralized state and configuration, including path caching and history management. |

---

## 💡 Usage Examples

**Running a pipeline with redirection:**

```bash
$ echo "Hello World" | tr 'a-z' 'A-Z' > output.txt

```

**Checking command types:**

```bash
$ type cd
cd is a shell builtin
$ type ls
ls is /bin/ls

```

**Using history:**

```bash
$ history 5
    1  ls -la
    2  cd src
    3  cat main.ts
    4  echo "test"
    5  history 5

```

---

## 🛠 Future Roadmap

* [ ] Support for environment variable expansion (e.g., `echo $USER`).
* [ ] Logical operators (`&&` and `||`).
* [ ] Background process execution (`&`).

Would you like me to help you write a `package.json` file with the necessary scripts and dependencies to match this README?