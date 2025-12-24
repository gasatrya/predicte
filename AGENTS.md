# Agent Guidelines for predicte

## Specialist

Invoke specialist when needed:

- Use `builder` subagent to executes technical specifications or implement planned tasks/features
- Use `reviewer` subagent to review code and provide feedback immediately after the `builder` finishes, before moving to QA/Testing.
- Use `vitest-specialist` subagent to writes and commits comprehensive unit/integration tests using Vitest and TypeScript
- Use `qa-specialist` subagent to audit code, verifies file structures, and runs tests.
- Use `researcher` subagent to research and gather information. Fetches documentation, real-world code patterns,
  and latest best practices.
- Use `debugger` subagent to debug code, diagnoses runtime errors, build failures, and logical bugs. It isolates the issue, creates reproduction cases, and applies fixes.
- Use `git-committer` subagent to commit changes to git repository

## Tools

If you have access to these tools, use them to enhance your development workflow:

- Use `gh_grep` to search code examples from github.
- When you need to search docs, use `context7` tools.
- When you need to testing UI or feature use `playwright` tools.
- When you need to do a web search, use `web-search-prime` tools.
