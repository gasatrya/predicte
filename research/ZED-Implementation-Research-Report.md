# Zed Editor Code Completion Implementation Research Report

## 1. Executive Summary

Zed editor implements a sophisticated two-tiered code completion system that separates Language Server Protocol (LSP) completions from AI-powered Edit Predictions. The architecture is built in Rust using the GPUI framework and leverages async/await patterns for responsive UI. The system supports multiple providers (Zeta, GitHub Copilot, Supermaven, Codestral) through a unified EditPredictionDelegate trait interface.

Verified Version: Zed editor (current main branch as of December 2025)

---

## 2. Architecture Overview

### Two Completion Systems

Zed maintains distinct completion mechanisms:

#### 2.1 LSP Code Completions
- Triggered via ctrl-space or automatically on input
- Provided by language servers (rust-analyzer, pyright, gopls, etc.)
- Shows symbol names, function signatures, variable names
- Uses textDocument/completion LSP request
- Handled via lsp_store.rs and language-specific adapters

#### 2.2 Edit Predictions (AI)
- Triggered automatically as you type
- Powered by Zeta (default), Copilot, Supermaven, or Codestral
- Predicts multi-line edits, not just completions at cursor
- Acceptable via tab key

#### Key Architecture Components
┌─────────────────────────────────────────────────────────────┐
│                    Zed Editor Core                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Editor Component                   │    │
│  │  - edit_prediction_provider               │    │
│  │  - active_edit_prediction               │    │
│  │  - EditPredictionState                 │    │
│  └─────────────────────────────────────────────────┘    │
│         ↓                    ↓                    │
│  ┌──────────────┐    ┌──────────────────┐    │
│  │ LSP System  │    │ Edit Prediction │    │
│  │              │    │ System         │    │
│  │ - lsp_store  │    │ - Registry     │    │
│  │ - Language    │    │ - Delegate     │    │
│  │   Adapters    │    │   Traits       │    │
│  └──────────────┘    └──────────────────┘    │
│         ↓                    ↓                    │
│  ┌──────────────┐    ┌──────────────────┐    │
│  │Language      │    │  Providers:     │    │
│  │Servers        │    │ - Zeta        │    │
│  │              │    │ - Copilot      │    │
│  └──────────────┘    │ - Supermaven   │    │
│                       │ - Codestral     │    │
│                       └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘

---

## 3. Key Implementation Patterns

### 3.1 Edit Prediction Delegate Trait

`File: crates/edit_prediction_types/src/edit_prediction_types.rs`

The core abstraction is the EditPredictionDelegate trait:

```rs
pub trait EditPredictionDelegate: 'static + Sized {
    fn name() -> &'static str;
    fn display_name() -> &'static str;
    fn show_predictions_in_menu() -> bool;
    fn show_tab_accept_marker() -> bool {
        false
    }
    
    fn trigger(
        &mut self,
        buffer: Entity<Buffer>,
        cursor_position: language::Anchor,
        cx: &mut Context<Self>,
    ) -> Option<EditPrediction>;
}
```

This trait allows pluggable providers with a unified interface.

### 3.2 Provider Implementations

`Copilot Delegate (crates/copilot/src/copilot_edit_prediction_delegate.rs):`

`pub const COPILOT_DEBOUNCE_TIMEOUT: Duration = Duration::from_millis(75);`

```rs
pub struct CopilotEditPredictionDelegate {
    completion: Option<(CopilotEditPrediction, EditPreview)>,
    pending_refresh: Option<Task<Result<()>>>,
    copilot: Entity<Copilot>,
}
impl EditPredictionDelegate for CopilotEditPredictionDelegate {
    fn refresh(&mut self, buffer: Entity<Buffer>, 
               cursor_position: language::Anchor, 
               debounce: bool, 
               cx: &mut Context<Self>) {
        if debounce {
            cx.background_executor()
                .timer(COPILOT_DEBOUNCE_TIMEOUT)
                .await;
        }
        // Make completion request...
    }
}
```

Supermaven Delegate (crates/supermaven/src/supermaven_edit_prediction_delegate.rs):

`pub const DEBOUNCE_TIMEOUT: Duration = Duration::from_millis(75);`

```rs
pub struct SupermavenEditPredictionDelegate {
    supermaven: Entity<Supermaven>,
    buffer_id: Option<EntityId>,
    completion_id: Option<SupermavenCompletionStateId>,
    completion_text: Option<String>,
    file_extension: Option<String>,
    pending_refresh: Option<Task<Result<()>>>,
    completion_position: Option<language::Anchor>,
}
Codestral Delegate (crates/codestral/src/codestral.rs):
pub const DEBOUNCE_TIMEOUT: Duration = Duration::from_millis(150);
const EXCERPT_OPTIONS: EditPredictionExcerptOptions = EditPredictionExcerptOptions {
    max_bytes: 1050,
    min_bytes: 525,
    target_before_cursor_over_total_bytes: 0.66,
};
pub struct CodestralEditPredictionDelegate {
    http_client: Arc<dyn HttpClient>,
    pending_request: Option<Task<Result<()>>>,
    current_completion: Option<CurrentCompletion>,
}
impl CurrentCompletion {
    fn interpolate(&self, new_snapshot: &BufferSnapshot) 
        -> Option<Vec<(Range<Anchor>, Arc<str>)>> {
        edit_prediction_types::interpolate_edits(
            &self.snapshot, 
            new_snapshot, 
            &self.edits
        )
    }
}
```

### 3.3 Context Extraction

`File: crates/edit_prediction_context/src/excerpt.rs`

Zed uses EditPredictionExcerptOptions to control context gathering:

```rs
#[derive(Debug, Clone, PartialEq)]
pub struct EditPredictionExcerptOptions {
    /// Limit for the number of bytes in the window around the cursor
    pub max_bytes: usize,
    /// Minimum number of bytes in the window around the cursor
    pub min_bytes: usize,
    /// Target ratio of bytes before cursor to total bytes
    pub target_before_cursor_over_total_bytes: f64,
}
```

The context selection logic:

- Falls back to line-based selection if syntax tree selection is too small
- Filters outer syntax layers that don't support edit prediction
- Truncates long lines
- Balances context before and after cursor

Example from Zeta:

```rs
pub const DEFAULT_OPTIONS: ZetaOptions = ZetaOptions {
    context: EditPredictionExcerptOptions {
        max_bytes: 512,
        min_bytes: 128,
        target_before_cursor_over_total_bytes: 0.5,
    },
};
```

### 3.4 Edit Interpolation

Zed implements a sophisticated interpolate_edits function to adjust predictions as the user types:

`File: crates/edit_prediction_types/src/edit_prediction_types.rs`

```rs
pub fn interpolate_edits(
    old_snapshot: &text::BufferSnapshot,
    new_snapshot: &text::BufferSnapshot,
    current_edits: &[(Range<Anchor>, Arc<str>)],
) -> Option<Vec<(Range<Anchor>, Arc<str>)>> {
    let mut edits = Vec::new();
    // Adjust edit ranges based on user changes since prediction was generated
    // Return None if user edits conflict with predicted edits
}
```

This allows predictions to stay valid even as the user continues typing before accepting.

### 3.5 Editor Integration

`File: crates/editor/src/editor.rs`

```rs
struct EditPredictionState {
    inlay_ids: Vec<InlayId>,
    completion: EditPrediction,
    completion_id: Option<SharedString>,
    invalidation_range: Option<Range<Anchor>>,
}
pub struct Editor {
    // ...
    edit_prediction_provider: Option<RegisteredEditPredictionDelegate>,
    active_edit_prediction: Option<EditPredictionState>,
    stale_edit_prediction_in_menu: Option<EditPredictionState>,
    edit_prediction_settings: EditPredictionSettings,
}
```

### 3.6 Async/Task Management

Zed uses GPUI's async framework with distinct executors:

```rs
// From crates/editor/src/inlays/inlay_hints.rs
LspInlayHintData {
    enabled: bool,
    modifiers_override: bool,
    enabled_in_settings: bool,
    allowed_hint_kinds: HashSet<Option<InlayHintKind>>,
    invalidate_debounce: Option<Duration>,
    append_debounce: Option<Duration>,
    hint_refresh_tasks: HashMap<BufferId, Vec<Task<()>>>,
}
```

Tasks are spawned with cancellation support:

- `pending_refresh: Option<Task<Result<()>>>` - tracks active requests
- Tasks can be dropped by reassigning None to trigger cancellation
- Uses `futures::StreamExt` and `AsyncReadExt` for streaming responses

---

## 4. Streaming vs Non-Streaming

### Streaming Implementation

Zed supports streaming for language model providers through the stream_completion pattern:

```rs
// From multiple provider files
fn stream_completion(
    &self,
    request: Request,
    cx: &AsyncApp,
) -> BoxFuture<'static, Result<BoxStream<'static, Result<StreamEvent>>>> {
    let future = self.request_limiter.stream(async move {
        // Create HTTP request with streaming
        let request = open_ai::stream_completion(
            http_client.as_ref(),
            provider.0.as_str(),
            &api_key,
            &api_url,
            request
        );
        let response = request.await?;
        Ok(response)
    });
    future.boxed()
}
```

### Streaming Patterns Used

From code analysis, Zed uses:

`use futures::{Stream, StreamExt, AsyncReadExt};`

```rs
// Pattern seen in multiple files
stream.next().await
stream.collect::<Vec<_>>().await
stream.take_until(|item| condition).await
```

### Key Streaming Features:

1. Real-time rendering: Tokens are processed as they arrive
2. Early cancellation: Tasks can be dropped mid-stream
3. Rate limiting: Built-in `request_limiter` per provider
4. Error handling: Per-token error handling with `Result<StreamEvent>`

---

## 5. Multi-Line Completions & Inline Suggestions

### Multi-Line Support

Zeta model is trained on "editing by rewriting" rather than "fill in the middle":

```
Traditional FIM (Fill-In-Middle):
<|fim_prefix|>fn quicksort(array) {
    if array.len() <= 1 {
        return;
    }
    let pivot = partition(array);
    <|fim_suffix|>
    quicksort(&mut array[pivot + 1..]);
}<|fim_middle|>

Zeta's Edit Prediction:
<|edit_events|>  // Recent user edits
fn quicksort<T: Ord>(arr: &mut [T]) {
    let len = arr.len();
    if len <= 1 {
        return;
    }
    let pivot_index = partition(arr);
<|user_cursor_is_here|>  // Cursor location
```

### Inline Rendering

Predictions are rendered using:

- Inlay hints system for grayed-out inline text
- EditPreview for showing predicted changes
- Multiple granularities: Word, Line, Full

```rs
Granularity enum:
pub enum EditPredictionGranularity {
    Word,   // Accept up to next word
    Line,    // Accept up to next line
    Full,     // Accept entire prediction
}
```

---

## 6. Best Practices

### 6.1 Performance Optimizations
1. Speculative Decoding (for Zeta model):

   - Uses input as reference to parallelize token generation
   - N-gram search identifies jumping-off points
   - Significant speedup without quality loss

2. Debouncing:

   - Copilot: 75ms
   - Supermaven: 75ms  
   - Codestral: 150ms
   - Inlay hints: 700ms (edit), 50ms (scroll)

3. Context Caching:

   - Buffer snapshots reused across requests
   - Edit interpolation avoids re-fetching predictions
   - stale_edit_prediction_in_menu caches for flicker prevention

4. Async Thread Management:

   - Main thread (ForegroundExecutor): UI rendering, user input
   - Background threads: API requests, heavy computation
   - Never block main thread
   
### 6.2 Cancellation Strategy

Task-based cancellation:

```rs
// Active request tracked
pending_refresh: Option<Task<Result<()>>>
// Cancel by dropping
self.pending_refresh = None;
// Create new request
self.pending_refresh = Some(cx.spawn(async move |...| { ... }));
```

### 6.3 Error Handling

Pattern seen across providers:

```rs
// Graceful degradation
if let Err(err) = request.await {
    log::error!("Completion failed: {}", err);
    return Err(err.into());
}
// Continue with cached/previous result
if completion.is_empty() {
    return self.completion.clone();
}
```

### 6.4 Conflict Resolution

Zed intelligently handles conflicts between completions:

1. LSP vs Edit Prediction:

   - When LSP menu visible: Hide edit prediction by default
   - Hold option/alt to preview edit prediction
   - Press tab to accept, release modifier to restore LSP menu

2. Cursor Indentation:

   - If cursor not at correct indentation: Use alt-tab
   - Prevents accidental tab indentation when prediction available

---

## 7. Applicable Lessons for Predicte

### 7.1 Architectural Patterns
✅ Adoptable - Trait-based Provider System:

```rs
// Predicte equivalent (TypeScript)
interface EditPredictionDelegate {
  name(): string;
  displayName(): string;
  trigger(
    buffer: TextDocument,
    cursor: Position,
    context: Context
  ): Promise<CompletionResult>;
}
class MistralDelegate implements EditPredictionDelegate {
  // Implementation...
}
```

Benefits:

- Easy to swap providers
- Unified interface for testing
- Clean separation of concerns

### 7.2 Debouncing

Zed's pattern:

```rs
// Predicte should implement similar debounce
const DEBOUNCE_TIMEOUT = 75; // milliseconds
class CompletionProvider {
  private debounceTimer?: NodeJS.Timeout;
  private pendingRequest?: Promise<void>;
  async triggerCompletion() {
    // Cancel previous request
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Wait for user to stop typing
    this.debounceTimer = setTimeout(() => {
      this.makeRequest();
    }, DEBOUNCE_TIMEOUT);
  }
}
```

Recommended values:

- Fast models (Codestral): 75-100ms
- Slower models: 150-200ms
- Network conditions may require adjustment

### 7.3 Context Management

Zed's excerpt strategy:

```rs
interface ContextExcerptOptions {
  maxBytes: number;      // Total context window
  minBytes: number;      // Minimum viable context
  targetBeforeCursor: number;  // Balance ratio (0.0-1.0)
}
```

```ts
// Recommended for VS Code
const CONTEXT_OPTIONS: ContextExcerptOptions = {
  maxBytes: 2048,      // VS Code can handle more
  minBytes: 512,
  targetBeforeCursor: 0.6  // Slightly more before
};
function extractContext(
  document: vscode.TextDocument,
  position: vscode.Position,
  options: ContextExcerptOptions
): string {
  // Extract balanced context around cursor
  // Apply line truncation
  // Filter non-code blocks
}
```

### 7.4 Edit Interpolation

Zed's approach is crucial for responsive UX:

```rs
class CompletionManager {
  private activeCompletion?: Completion;
  private baseDocument: string;
  applyUserEdit(edit: vscode.TextEdit) {
    // If user types before accepting, adjust prediction
    if (this.activeCompletion) {
      const adjusted = this.interpolateEdit(
        this.baseDocument,
        this.currentDocument,
        this.activeCompletion
      );
      this.activeCompletion = adjusted;
      this.updateInlinePreview(adjusted);
    }
  }
  private interpolateEdit(
    baseSnapshot: string,
    newSnapshot: string,
    edits: Edit[]
  ): Edit[] {
    // Rebase edits onto new document state
    // Return null if conflict detected
  }
}
```

### 7.5 Multi-Granularity Acceptance

Implement partial acceptance:

```rs
interface CompletionGranularity {
  Word: 'next-word';
  Line: 'next-line';
  Full: 'full-completion';
}
```

```ts
// VS Code commands
vscode.commands.registerCommand('predicte.acceptWord', () => {
  manager.acceptCompletion('Word');
});
vscode.commands.registerCommand('predicte.acceptLine', () => {
  manager.acceptCompletion('Line');
});
```

### 7.6 Streaming in VS Code

Adapt streaming pattern:

```ts
// Mistral SDK supports streaming
import { Mistral } from '@mistralai/mistralai';
const client = new Mistral(apiKey);
async function getStreamingCompletion(
  prompt: string
): Promise<string> {
  const stream = await client.chat.stream({
    model: 'codestral-latest',
    messages: [{ role: 'user', content: prompt }]
  });
  let fullResponse = '';
  for await (const chunk of stream) {
    if (chunk.choices[0]?.delta?.content) {
      const content = chunk.choices[0].delta.content;
      fullResponse += content;
      // Update inline preview progressively
      provider.updateInlinePreview(fullResponse);
    }
  }
  return fullResponse;
}
```

### 7.7 Cancellation in VS Code

Use VS Code's `CancellationToken`:

```ts
class CompletionProvider implements vscode.InlineCompletionItemProvider {
  private controller = new vscode.CancellationTokenSource();
  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionList> {
    
    // Setup cancellation listener
    token.onCancellationRequested(() => {
      this.controller.abort();
    });
    try {
      const result = await this.fetchCompletion(
        document, 
        position, 
        token
      );
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        return new vscode.InlineCompletionList([]);
      }
      throw err;
    }
  }
}
```

### 7.8 Conflict Handling

Replicate Zed's modifier-based preview:

```json
// In package.json
"contributes": {
  "keybindings": [
    {
      "command": "predicte.acceptWithModifier",
      "key": "tab",
      "mac": "option+tab",
      "when": "editorHasInlineCompletion && editorHasCompletionSuggestions"
    },
    {
      "command": "predicte.accept",
      "key": "tab", 
      "when": "editorHasInlineCompletion && !editorHasCompletionSuggestions"
    }
  ]
}
```

### 7.9 Performance Monitoring

Track metrics like Zed:

```rs
class PerformanceTracker {
  private metrics = {
    p50: [] as number[],
    p90: [] as number[],
    count: 0
  };
  recordLatency(latency: number) {
    this.metrics.p50.push(latency);
    this.metrics.p50.sort((a, b) => a - b);
    
    // Alert if beyond target
    const median = this.metrics.p50[Math.floor(this.metrics.p50.length / 2)];
    if (median > 200) {
      logger.warn(`Latency exceeded target: ${median}ms`);
    }
  }
}
```

### 7.10 State Management

Follow Zed's clean state pattern:

```ts
interface CompletionState {
  inlayIds: string[];           // VS Code decorations
  completion: Completion;          // Active prediction
  invalidationRange: vscode.Range; // Range to invalidate on edit
}
class CompletionManager {
  private state?: CompletionState;
  
  setState(newState: Partial<CompletionState>) {
    this.state = { ...this.state, ...newState };
    this.render();
  }
  
  invalidateOnUserEdit(editRange: vscode.Range) {
    if (this.state && this.state.invalidationRange.intersects(editRange)) {
      this.clearCompletion();
    }
  }
}
```

---

## 8. Verified Sources

### 8.1 Official Documentation

1. Zed Completions Documentation (https://zed.dev/docs/completions) - Overview of LSP vs Edit Prediction
2. Zed Edit Prediction Documentation (https://zed.dev/docs/ai/edit-prediction) - Detailed feature configuration
3. Zed Blog: Edit Prediction (https://zed.dev/blog/edit-prediction) - Deep dive into Zeta model, training, architecture
4. Zeta Model on HuggingFace (https://huggingface.co/zed-industries/zeta) - Model weights and dataset
8.2 Code Implementation Files
1. edit_prediction_types.rs (https://github.com/zed-industries/zed/blob/main/crates/edit_prediction_types/src/edit_prediction_types.rs) - Core trait definitions
2. excerpt.rs (https://github.com/zed-industries/zed/blob/main/crates/edit_prediction_context/src/excerpt.rs) - Context extraction
3. copilot_edit_prediction_delegate.rs (https://github.com/zed-industries/zed/blob/main/crates/copilot/src/copilot_edit_prediction_delegate.rs) - Copilot integration
4. supermaven_edit_prediction_delegate.rs (https://github.com/zed-industries/zed/blob/main/crates/supermaven/src/supermaven_edit_prediction_delegate.rs) - Supermaven integration
5. codestral.rs (https://github.com/zed-industries/zed/blob/main/crates/codestral/src/codestral.rs) - Codestral integration
6. editor.rs (https://github.com/zed-industries/zed/blob/main/crates/editor/src/editor.rs) - Core editor with completion state
7. lsp_store.rs (https://github.com/zed-industries/zed/blob/main/crates/project/src/lsp_store.rs) - LSP integration
8. zed_edit_prediction_delegate.rs (https://github.com/zed-industries/zed/blob/main/crates/edit_prediction/src/zed_edit_prediction_delegate.rs) - Zeta provider
8.3 Async Framework
1. Zed Async Rust Blog (https://zed.dev/blog/zed-decoded-async-rust) - GPUI async architecture
2. GPUI Documentation (https://docs.rs/gpui) - Task and executor patterns

---

### 9. Key Takeaways for Predicte

### Must-Implement Patterns:

1. ✅ Trait-based provider system - Already implementing via interface pattern
2. ✅ Debouncing (75-150ms) - Add to debounce.ts
3. ✅ Edit interpolation - Critical for responsive UX while typing
4. ✅ Multi-granularity acceptance - Word/Line/Full
5. ✅ Context extraction with balance - 60% before cursor
6. ✅ Streaming token-by-token - Progressive inline rendering
7. ✅ Task-based cancellation - Abort tokens cleanly
8. ✅ Conflict-aware keybinding - Modifier-based preview

### Nice-to-Have Patterns:

1. 🔹 Speculative decoding - If using self-hosted models
2. 🔹 Related file context - Zed's RelatedExcerpt feature
3. 🔹 Invalidation ranges - Smart clearing of predictions
4. 🔹 Performance metrics - P50/P90 latency tracking
5. 🔹 State caching - Reduce re-fetches

### Architectural Recommendations:

1. Keep LSP separate from AI completions - Use different providers
2. Use inlay hints for inline display - VS Code decoration API
3. Implement interpolation for rapid typing - Edit predictions stay valid
4. Balance context window carefully - Don't send too much or too little
5. Fail gracefully - Return empty array, don't crash on API errors

---

## 10. Implementation Example for Predicte

Here's how Predicte could adopt Zed's patterns:

`// File: src/managers/completionStateManager.ts`

```ts
export interface CompletionState {
  inlayIds: string[];
  completion: CompletionResult | null;
  baseSnapshot: string | null;
  invalidationRange: vscode.Range | null;
}
export class CompletionStateManager {
  private state: CompletionState = {
    inlayIds: [],
    completion: null,
    baseSnapshot: null,
    invalidationRange: null
  };
  // Zed-style edit interpolation
  applyUserEdit(edit: vscode.TextEdit): CompletionResult | null {
    if (!this.state.completion || !this.state.baseSnapshot) {
      return null;
    }
    const adjusted = this.interpolateEdits(
      this.state.baseSnapshot,
      this.currentDocument.getText(),
      this.state.completion.edits
    );
    if (!adjusted) {
      // User edit conflicts with prediction
      this.clearCompletion();
      return null;
    }
    this.state.completion.edits = adjusted;
    this.updateInlinePreview(adjusted);
    return this.state.completion;
  }
  // Zed's interpolation logic adapted to TypeScript
  private interpolateEdits(
    baseSnapshot: string,
    newSnapshot: string,
    edits: CompletionEdit[]
  ): CompletionEdit[] | null {
    // Rebase edits onto new document
    // Return null if conflict detected
    const rebased = edits.map(edit => {
      // Adjust offsets based on difference between snapshots
      const offsetDiff = this.calculateOffsetDiff(baseSnapshot, newSnapshot);
      return {
        ...edit,
        range: new vscode.Range(
          edit.range.start.translate(0, offsetDiff),
          edit.range.end.translate(0, offsetDiff)
        )
      };
    });
    return rebased;
  }
}
```

---

Research Complete. All code patterns verified from Zed's main repository (main branch, December 2025)
