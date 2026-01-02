#!/usr/bin/env node

/**
 * Husky commit-msg hook to validate Conventional Commit messages
 */

const fs = require('fs');
const commitMessageFile = process.argv[2];
const commitMessage = fs.readFileSync(commitMessageFile, 'utf8').trim();

// Conventional Commit pattern
// Format: <type>(<scope>): <description>
// Types: feat, fix, docs, style, refactor, test, chore, revert
const pattern =
  /^(feat|fix|docs|style|refactor|test|chore|revert)(\(.+\))?: .+$/;

if (!commitMessage) {
  console.error('Error: No commit message provided.');
  process.exit(1);
}

// Extract only the first line (subject) for validation
const firstLine = commitMessage.split('\n')[0];

if (!pattern.test(firstLine)) {
  console.error(`Error: Invalid commit message "${firstLine}"`);
  console.error('');
  console.error('Commit messages must follow Conventional Commits format:');
  console.error('  <type>(<scope>): <description>');
  console.error('');
  console.error(
    'Valid types: feat, fix, docs, style, refactor, test, chore, revert',
  );
  console.error('Example: feat(auth): add new login form');
  console.error('Example: fix: resolve token expiry issue');
  process.exit(1);
}

process.exit(0);
