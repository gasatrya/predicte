## Future Enhancements

### High Priority

- **Speculative Decoding** - Use input as reference for parallel token generation, 2-3x speedup without quality loss (Zed pattern)
- **Related File Context** - Include imports from related files in completion context for better accuracy in multi-file projects
- **Telemetry Integration** - Anonymous usage tracking to understand completion patterns and improve quality

### Medium Priority

- **Invalidation Ranges** - Smart clearing of predictions when user edits outside completion range (Zed pattern)
- **User Preference Learning** - Learn from user acceptance patterns to weight future completions
- **Multi-line Context Balancing** - Optimize 60/40 before/after cursor ratio based on language patterns

### Low Priority

- **Completion History** - Show recent completions for quick re-use
- **Custom System Prompts** - Allow users to override language-specific prompts
- **Benchmark Suite** - Automated quality and performance testing framework
