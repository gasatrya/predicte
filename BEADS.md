# Beads Issue Tracker

Beads is a command-line issue tracker that persists project work across sessions. Use it for all multi-session tasks, dependencies, and discovered work that needs follow-up.

## When to Use Beads

**ALWAYS use beads (`bd` commands) for:**

- Multi-session work that spans multiple conversations
- Tasks with dependencies that block other work
- Discovered issues or refactoring opportunities
- Feature planning and tracking
- Bug reports and fixes
- Any work that might be resumed later

**Use TodoWrite for:**

- Simple single-session tasks that will be completed immediately
- Temporary tracking of immediate work steps
- Non-persistent checklists

**Use beads instead of TodoWrite when:**

- You're unsure if work will complete in this session
- Work has dependencies or blocks other tasks
- You want to track progress across multiple sessions
- Work involves strategic planning or discoveries

## Quick Reference

```bash
# Find ready work (no blockers)
bd ready --json

# Find ready work including future deferred issues
bd ready --include-deferred --json

# Create new issue
bd create "Issue title" -t bug|feature|task -p 0-4 -d "Description" --json

# Create issue with due date and defer (GH#820)
bd create "Task" --due=+6h              # Due in 6 hours
bd create "Task" --defer=tomorrow       # Hidden from bd ready until tomorrow
bd create "Task" --due="next monday" --defer=+1h  # Both

# Update issue status
bd update <id> --status in_progress --json

# Update issue with due/defer dates
bd update <id> --due=+2d                # Set due date
bd update <id> --defer=""               # Clear defer (show immediately)

# Link discovered work
bd dep add <discovered-id> <parent-id> --type discovered-from

# Complete work
bd close <id> --reason "Done" --json

# Show dependency tree
bd dep tree <id>

# Get issue details
bd show <id> --json

# Query issues by time-based scheduling (GH#820)
bd list --deferred              # Show issues with defer_until set
bd list --defer-before=tomorrow # Deferred before tomorrow
bd list --defer-after=+1w       # Deferred after one week from now
bd list --due-before=+2d        # Due within 2 days
bd list --due-after="next monday" # Due after next Monday
bd list --overdue               # Due date in past (not closed)
```

## Core Workflow

### Starting Work

```bash
bd ready                     # Show issues ready to work
bd show <id>                 # Review issue details
bd update <id> --status=in_progress  # Claim work
```

### Creating Issues

```bash
bd create "Title" -t <type> -p <priority>

Types: task, bug, feature
Priorities: 0-4 (0=critical, 2=medium, 4=backlog)
```

### Completing Work

```bash
bd close <id>                # Close single issue
bd close <id1> <id2> <id3>   # Close multiple issues efficiently
bd sync                      # Sync to remote
```

### Dependencies

```bash
bd dep add <issue> <depends-on>     # Add dependency
bd blocked                    # Show all blocked issues
bd show <id>                  # See what's blocking/blocked by
```

## Session End Protocol

**MANDATORY** - Before saying "done" or "complete":

```bash
# 1. File issues for remaining work
bd create "Any discovered issues or follow-up work" -t task -p 2

# 2. Update issue status
bd close <completed-issue-ids>
bd update <in-progress> --status=in_progress  # Keep working on these

# 3. Sync beads
bd sync

# 4. Commit and push code
git add <files>
git commit -m "message"
git push

# 5. Final beads sync
bd sync

# 6. Verify
git status  # Should show "up to date with origin"
```

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded
- If push fails, resolve and retry until it succeeds
- Always run `bd sync` at session end

## Essential Commands Reference

### Finding Work

- `bd ready` - Issues ready to work (no blockers)
- `bd list --status=open` - All open issues
- `bd list --status=in_progress` - Active work
- `bd blocked` - Show blocked issues
- `bd show <id>` - Detailed issue view with dependencies

### Creating & Updating

- `bd create "title" -t task|bug|feature -p 0-4` - Create issue
- `bd update <id> --status=in_progress` - Update status
- `bd update <id> --assignee=username` - Assign work
- `bd close <id> --reason="explanation"` - Close with reason

### Dependencies

- `bd dep add <issue> <depends-on>` - Add dependency
- `bd dep add <issue> <depends-on> --type=discovered-from` - Link discovered work
- `bd show <id>` - See dependencies

### Sync & Stats

- `bd sync` - Sync with git remote (run at session end)
- `bd stats` - Project statistics (open/closed/blocked counts)
- `bd doctor` - Check for issues (sync problems, missing hooks)

## Best Practices

### Issue Creation

- Use descriptive, actionable titles
- Include detailed descriptions for complex tasks
- Set appropriate priorities (0=blocking, 1=high, 2=medium, 3=low, 4=backlog)
- Link dependencies using `bd dep add`
- Create multiple issues efficiently when needed

### Dependency Management

- Create blocking dependencies: `bd dep add <feature> <test>` (feature blocks test)
- Create discovered dependencies: `bd dep add <issue> <parent> --type=discovered-from`
- Check `bd blocked` before starting work to identify blockers
- Use `bd ready` to find work that can proceed immediately

### Session Management

- Run `bd ready` at session start to see available work
- Check `bd list --status=in_progress` for ongoing work
- Always run `bd sync` before `git commit` to capture issue updates
- Verify `git status` shows clean working tree after sync

### Agent Delegation

- Use `beads-task-agent` subagent for multi-command beads operations
- Delegate when: exploring issue graph, finding/completing ready work, working through multiple issues
- Use `bd` CLI directly for single atomic operations (create, close, update)

### Issue Types

- `bug` - Something broken that needs fixing
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature composed of multiple issues
- `chore` - Maintenance work (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (nice-to-have features, minor bugs)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Dependency Types

- `blocks` - Hard dependency (issue X blocks issue Y)
- `related` - Soft relationship (issues are connected)
- `parent-child` - Epic/subtask relationship
- `discovered-from` - Track issues discovered during work

Only `blocks` dependencies affect the ready work queue.

## Project-Specific Context

This project uses beads as the primary issue tracking system. Key workflows:

- **Feature Development**: Create feature issue, create dependent task issues (tests, docs), use dependencies
- **Bug Fixes**: Create bug issue with priority based on severity, link to affected code
- **Refactoring**: Create refactoring issue, link discovered work with `--type=discovered-from`
- **Session Handoff**: Create issues for discovered work, update in-progress items, sync before pushing

## Common Patterns

**Breaking Down Features:**

```bash
# Create main feature
bd create "Implement user authentication" -t feature -p 1

# Create dependent tasks
bd create "Design auth database schema" -t task -p 1
bd create "Implement login API endpoint" -t task -p 2
bd create "Write auth unit tests" -t task -p 2

# Link dependencies
bd dep add <login-api> <schema>      # login-api depends on schema
bd dep add <tests> <login-api>      # tests depend on login-api
bd dep add <login-api> <feature>     # login-api is part of feature
```

**Handling Discovered Work:**

```bash
# While working on feature, discover refactoring need
bd create "Refactor payment processing" -t task -p 3

# Link to original work
bd dep add <refactor> <feature-id> --type=discovered-from

# This tracks that refactor was discovered while working on feature
```

## Monitoring & Health

Run regularly to ensure system health:

- `bd doctor` - Check beads installation and configuration
- `bd stats` - Review project metrics
- `bd blocked` - Identify issues waiting on dependencies
- `bd sync --status` - Check if sync is needed

Remember: **Persistence beats lost context.** When in doubt, create an issue in beads rather than relying on TodoWrite or in-session tracking.
