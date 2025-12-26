# Predicte - Features To Implement

## Current Status

All planned features from the original research plan have been successfully implemented. The extension now includes:

- ✅ Core autocomplete functionality
- ✅ Enhanced context extraction
- ✅ Prompt engineering with system messages
- ✅ Language-aware model parameters (20+ languages)
- ✅ Quality filtering and ranking
- ✅ Streaming support
- ✅ Secure API key storage
- ✅ Comprehensive configuration options

## Issues Identified During Testing

### 1. HTML/XML Tag Completion Bug

**Problem**: No completions when cursor is inside HTML/XML tags (e.g., `<span>cursor_here</span>`)
**Root Cause**: String detection logic incorrectly blocks completions inside tags
**Impact**: HTML/XML developers cannot get completions for attributes, tag names, etc.

### 2. Tab Acceptance Blocking

**Problem**: After pressing Tab to accept a completion, pressing Space doesn't trigger new completion
**Root Cause**: 300ms debounce delay feels too long; VS Code completion lifecycle issues
**Impact**: Breaks natural coding flow; users expect continuous assistance

### 3. Partial Completion Continuation (Most Critical)

**Example**: Type `export const tag` → get partial completion ending with `getCategoryComponents({ data: tag`

- Press Tab → accepts partial completion
- Press Space → expecting completion to continue with closing braces, but nothing happens

**Root Causes**:

1. `maxTokens` default (50) may be too low for complex functions
2. No automatic continuation after accepting partial completion
3. VS Code doesn't re-trigger when cursor moves inside incomplete syntax

**Impact**: Users expect AI completions to work like conversations with follow-ups

## Priority Implementation Plan

### Phase 1 - Immediate Fixes (30 minutes)

1. **Increase `maxTokens` default from 50 → 100**
   - Allows more complete function completions
   - Better for complex code like React Query functions

2. **Reduce `debounceDelay` default from 300ms → 150ms**
   - Faster response after Tab acceptance
   - Smoother user experience

3. **Fix HTML tag completion**
   - Skip string detection for markup languages (HTML, XML, Vue, JSX, TSX, Svelte)
   - Update `shouldTrigger()` function in `contextUtils.ts`

### Phase 2 - Short-Term Improvements (1 hour)

4. **Add manual continuation shortcut (Ctrl+Space)**
   - Explicit command to request continuation
   - Useful when automatic continuation doesn't trigger

5. **Improve completion boundaries**
   - Try to complete to natural stopping points (semicolons, closing braces)
   - Better handling of partial completions

### Phase 3 - Medium-Term Enhancements

6. **Implement automatic continuation detection**
   - Detect when completion ends with incomplete syntax
   - Automatically trigger follow-up completion

7. **Multi-step completion support**
   - Track completion context across multiple steps
   - Remember what was previously suggested

## Configuration Changes Needed

### Default Value Updates:

```json
{
  "predicte.maxTokens": 100, // Was: 50
  "predicte.debounceDelay": 150 // Was: 300
}
```

### Code Changes Required:

1. **`src/managers/configManager.ts`**
   - Update default values for `maxTokens` and `debounceDelay`

2. **`src/utils/contextUtils.ts`**
   - Modify `shouldTrigger()` to skip string detection for markup languages
   - Add language detection for HTML/XML/Vue/JSX/TSX/Svelte

3. **`src/providers/completionProvider.ts`**
   - Add continuation detection logic
   - Implement manual continuation command

4. **`package.json`**
   - Update configuration schema defaults

## Testing Strategy

1. **Enable debug mode**: Set `predicte.debugMode = true` to see logs
2. **Test HTML/XML completion**: Verify completions work inside tags
3. **Test React Query flow**: Verify partial completion continuation
4. **Measure performance**: Monitor latency impact of reduced debounceDelay
5. **User experience**: Test natural coding flow with Tab and Space

## Success Criteria

- HTML/XML developers get completions inside tags
- Users can press Space after Tab and get new completions
- Complex functions get more complete suggestions
- Overall coding flow feels smoother and more natural

## Related Documentation

- See `PREDICTE USER TESTING ISSUES & SOLUTIONS.md` for detailed analysis
- Historical implementation details in `archive/` directory
