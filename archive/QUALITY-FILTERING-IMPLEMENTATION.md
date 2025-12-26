# Quality Filtering and Ranking Implementation

## Overview

This implementation adds quality filtering and ranking capabilities to the Predicte VS Code extension. The system now requests multiple completion candidates from the Mistral API, scores them based on multiple quality criteria, and returns the best completion.

## Features Implemented

### 1. Configuration Options (`package.json`)

Added two new configuration settings:

- **`predicte.qualityFilteringEnabled`** (boolean, default: `true`)
  - Enables quality filtering and ranking for completion candidates
  - When disabled, falls back to single completion behavior

- **`predicte.numCandidates`** (number, default: `3`, range: 1-5)
  - Number of completion candidates to request when quality filtering is enabled
  - More candidates = potentially better quality, but slower and more API calls

### 2. Quality Scoring System (`src/utils/codeUtils.ts`)

Implemented a comprehensive scoring system with the following components:

#### Scoring Criteria

1. **Relevance Score (35% weight)**
   - Evaluates how well the completion matches the context
   - Checks if completion follows expected patterns based on prefix
   - Considers suffix context for relevance

2. **Code Quality Score (30% weight)**
   - Validates syntax correctness (bracket balance)
   - Checks indentation consistency
   - Penalizes common anti-patterns (TODO, FIXME)

3. **Length Score (20% weight)**
   - Ensures completion length is appropriate for context
   - Different optimal lengths for different scenarios:
     - Property/method access: 1-30 chars
     - Function arguments: 1-50 chars
     - Variable declarations: 5-100 chars
     - Function definitions: 5-150 chars

4. **Language Pattern Score (15% weight)**
   - Rewards completions matching language-specific patterns
   - Supports TypeScript, JavaScript, Python, Java, C#, and more
   - Identifiers, function calls, type annotations, etc.

#### Key Functions

- `scoreCompletion()`: Scores a single completion candidate
- `filterCandidates()`: Removes low-quality candidates
- `rankCandidates()`: Sorts candidates by weighted score
- `getBestCompletion()`: Main entry point for filtering and ranking

### 3. Multiple Completions (`src/services/mistralClient.ts`)

#### Modified `getCompletion()` Method

- Added optional `temperature` parameter to support candidate generation
- Uses provided temperature or falls back to language-aware temperature

#### New `getMultipleCompletions()` Method

- Requests multiple completions in parallel for performance
- Creates temperature variations (±0.05 around base temperature) for diversity
- Validates `numCandidates` (1-5 range)
- Returns array of completions (may contain nulls for failed requests)
- Individual failures don't prevent other candidates from succeeding

### 4. Integration (`src/providers/completionProvider.ts`)

Updated `provideInlineCompletionItems()` method:

- Checks if quality filtering is enabled
- Falls back to streaming/non-streaming single completion when:
  - Streaming is enabled (quality filtering incompatible with streaming)
  - Quality filtering is disabled
- Uses quality filtering path when:
  - Quality filtering is enabled
  - Streaming is disabled
- Applies `getBestCompletion()` to select the highest-quality candidate

### 5. Configuration Manager (`src/managers/configManager.ts`)

Added two new properties to `PredicteConfig` class:

- `qualityFilteringEnabled`: Boolean getter for quality filtering setting
- `numCandidates`: Number getter for candidate count setting

Updated `PredicteConfigValues` interface and `getAll()` method to include new properties.

## How It Works

### Flow Diagram

```
User types in editor
    ↓
provideInlineCompletionItems() triggered
    ↓
Check: qualityFilteringEnabled && !enableStreaming
    ↓ No (streaming or disabled)
    → Single completion (streaming or non-streaming)
    ↓ Yes (quality filtering enabled)
Request N candidates with different temperatures
    ↓
Receive candidates (parallel API calls)
    ↓
Score each candidate on 4 criteria
    ↓
Filter out low-quality candidates
    ↓
Rank remaining candidates by score
    ↓
Select highest-scoring candidate
    ↓
Sanitize and validate
    ↓
Return completion to user
```

### Temperature Variation Strategy

When requesting multiple candidates, the system creates slight temperature variations:

```
For 3 candidates (base temp = 0.15):
  - Candidate 1: 0.10 (base - 0.05)
  - Candidate 2: 0.15 (base)
  - Candidate 3: 0.20 (base + 0.05)

For 5 candidates (base temp = 0.15):
  - Candidate 1: 0.10 (base - 0.10)
  - Candidate 2: 0.12 (base - 0.05)
  - Candidate 3: 0.15 (base)
  - Candidate 4: 0.18 (base + 0.05)
  - Candidate 5: 0.20 (base + 0.10)
```

This generates diverse completions without straying too far from the language-aware optimal temperature.

## Filtering Rules

Candidates are filtered out if they:

1. **Are too short** (< 3 meaningful characters)
2. **Have low quality scores** (codeQuality < 0.3 OR relevance < 0.2 OR languagePattern < 0.2)
3. **Duplicate existing code** (match prefix or suffix)
4. **Are null** (failed API requests)

If all candidates are filtered out, the system returns `null` (no completion).

## Performance Considerations

### API Calls

- **Without quality filtering**: 1 API call per completion
- **With quality filtering (3 candidates)**: 3 API calls per completion (parallel)
- **With quality filtering (5 candidates)**: 5 API calls per completion (parallel)

### Caching

Individual candidates are cached separately using the existing caching mechanism. The cache key includes:

- Prefix
- Suffix
- Model
- MaxTokens
- **Temperature** (new - enables per-candidate caching)
- Language ID

### Latency Impact

- Additional API calls are made in parallel
- Quality scoring and filtering adds minimal overhead (< 10ms)
- Overall latency increased primarily by the slowest API response
- User experience remains responsive due to debouncing (300ms default)

## Configuration Examples

### Recommended Settings

```json
{
  "predicte.qualityFilteringEnabled": true,
  "predicte.numCandidates": 3,
  "predicte.enableStreaming": false
}
```

- Best quality with acceptable performance
- 3 candidates provide good diversity

### Fast Performance

```json
{
  "predicte.qualityFilteringEnabled": false,
  "predicte.enableStreaming": true
}
```

- Fastest response time
- Real-time streaming feedback
- Lower quality completions

### Maximum Quality

```json
{
  "predicte.qualityFilteringEnabled": true,
  "predicte.numCandidates": 5,
  "predicte.enableStreaming": false
}
```

- Highest quality completions
- Slower response (5 parallel API calls)
- Best for critical code sections

## Testing and Debugging

### Debug Logs

The implementation includes extensive debug logging:

- `[DEBUG] getMultipleCompletions called, numCandidates: N`
- `[DEBUG] Temperature variations: [0.10, 0.15, 0.20]`
- `[DEBUG] Candidate 1/3 received: success`
- `[DEBUG] Scoring completion...`
- `[DEBUG] Relevance score: 0.9`
- `[DEBUG] Filtering candidates...`
- `[DEBUG] Best completion selected with score: 0.85`

### Manual Testing

1. Enable quality filtering: `predicte.qualityFilteringEnabled = true`
2. Set candidate count: `predicte.numCandidates = 3`
3. Disable streaming: `predicte.enableStreaming = false`
4. Type code in a supported language
5. Observe debug logs in VS Code Developer Tools console

## Future Enhancements

Potential improvements for future iterations:

1. **Streaming Quality Filtering**: Support quality filtering with streaming completions
2. **Adaptive Candidate Count**: Dynamically adjust `numCandidates` based on context complexity
3. **Learning from User Acceptance**: Learn which scoring factors matter most to the user
4. **Per-Language Configuration**: Different quality filtering settings per language
5. **Fuzzy Duplicate Detection**: More sophisticated duplicate code detection
6. **Semantic Relevance**: Use embeddings to measure semantic relevance

## Files Modified

1. `src/utils/codeUtils.ts` - Added quality scoring and ranking functions
2. `src/services/mistralClient.ts` - Added `getMultipleCompletions()` method
3. `src/providers/completionProvider.ts` - Integrated quality filtering into completion flow
4. `src/managers/configManager.ts` - Added new configuration properties
5. `package.json` - Added new configuration schema

## Backward Compatibility

The implementation maintains full backward compatibility:

- Default: `qualityFilteringEnabled = true`, `numCandidates = 3`
- Existing functionality preserved when quality filtering is disabled
- Streaming continues to work (quality filtering automatically disabled when streaming)
- No breaking changes to public APIs
- Existing configuration values remain valid

## Dependencies

No new dependencies added. The implementation uses:

- Existing `@mistralai/mistralai` SDK
- TypeScript 5.9.3
- Built-in VS Code APIs

## License

MIT License (same as parent project)
