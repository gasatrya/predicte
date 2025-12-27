# PREDICTE USER TESTING ISSUES & SOLUTIONS

## Overview

This document summarizes the issues found during real-world testing of the Predicte extension and proposes prioritized solutions for implementation.

## Issues Found

### 1. HTML/XML Tag Completion Not Working

- **Problem:** No completions when cursor is inside HTML/XML tags (e.g., `<spa>cursor_here</span>`)
- **Root Cause:** String detection logic incorrectly blocks completions inside tags
- **Impact:** HTML/XML developers cannot get completions for attributes, tag names, etc.

### 2. Tab Acceptance Blocks Subsequent Completions

- **Problem:** After pressing Tab to accept a completion, pressing Space doesn't trigger new completion
- **Root Cause:** 300ms debounce delay feels too long; VS Code completion lifecycle issues
- **Impact:** Breaks natural coding flow; users expect continuous assistance

### 3. React Query Partial Completion (Most Critical)

- **Example:** Type `export const tag` → get partial completion ending with `getCategoryComponents({ data: tag`
- Press Tab → accepts partial completion
- Press Space → expecting completion to continue with closing braces, but nothing happens
- **Root Causes:**
  a) `maxTokens` default (50) may be too low for complex functions
  b) No automatic continuation after accepting partial completion
  c) VS Code doesn't re-trigger when cursor moves inside incomplete syntax
- **Impact:** Users expect AI completions to work like conversations with follow-ups

## Technical Analysis

- **Default `debounceDelay`:** 300ms (`configManager.ts` line 143)
- **Default `maxTokens`:** 50 (`configManager.ts` line 127)
- **String detection in `shouldTrigger()`:** Blocks HTML/XML completions
- **VS Code trigger kinds:** Automatic (typing) vs Invoke (Tab/shortcut)
- **Quality filtering:** Already handles unbalanced brackets but no continuation logic
- **Note:** The `apiKey` property in `configManager.ts` is deprecated and should not be used. API keys should be stored in SecretStorage for security.

## Proposed Solutions (Prioritized)

### Phase 1 - Immediate Fixes (30 minutes)

1. **Increase `maxTokens` default from 50 → 100**
2. **Reduce `debounceDelay` default from 300ms → 150ms**
3. **Fix HTML tag completion (skip string detection for markup languages)**
4. **Remove deprecated `apiKey` property from `configManager.ts`**

### Phase 2 - Short-Term Improvements (1 hour)

5. **Add manual continuation shortcut (Ctrl+Space)**
6. **Improve completion boundaries (complete to natural stopping points)**

### Phase 3 - Medium-Term Enhancements

7. **Implement automatic continuation detection**
8. **Multi-step completion support**

## Recommended Testing

1. **Enable `debugMode: true` to see logs**
2. **Test with `maxTokens: 150` and `debounceDelay: 150`**
3. **Monitor token usage and trigger timing**

## Implementation Notes

- Ensure all changes are tested with real-world code examples
- Monitor performance impact of increased `maxTokens`
- Validate HTML/XML completion behavior across different file types
- Test continuation behavior with complex code structures
- Remove deprecated `apiKey` property and update documentation to use `PredicteSecretStorage.getApiKey()`

## Expected Outcomes

- Improved user experience with smoother completion flow
- Better support for HTML/XML development
- More reliable multi-step completions
- Enhanced debugging capabilities for future testing
- Improved security by removing deprecated API key storage method
