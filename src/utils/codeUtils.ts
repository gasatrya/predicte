/**
 * Code Utilities
 *
 * This module provides general utility functions for code manipulation.
 *
 * TODO: Implement code utilities
 * - sanitizeCompletion() - Clean up completion text
 * - getStopSequences() - Get language-specific stop sequences
 * - isInsideComment() - Check if position is in comment
 * - isInsideString() - Check if position is in string
 */

export function sanitizeCompletion(text: string): string {
    // TODO: Implement completion sanitization
    // Remove common artifacts like "```", extra newlines, etc.
    return text.trim();
}

export function getStopSequences(languageId: string): string[] {
    // TODO: Implement language-specific stop sequences
    const sequences: Record<string, string[]> = {
        javascript: ['\n\n', '```', '"', "'"],
        typescript: ['\n\n', '```', '"', "'"],
        python: ['\n\n', '"""', "'''", '```'],
        java: ['\n\n', '```', '*/'],
        go: ['\n\n', '```', '/*'],
        rust: ['\n\n', '```', '/*'],
        cpp: ['\n\n', '```', '/*'],
        html: ['\n\n', '```', '</'],
        css: ['\n\n', '```', '}'],
    };

    return sequences[languageId] || ['\n\n', '```'];
}

export function isInsideComment(_line: string, _position: number): boolean {
    // TODO: Implement comment detection
    return false;
}

export function isInsideString(line: string, position: number): boolean {
    // TODO: Implement string detection
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let escaped = false;

    for (let i = 0; i < position; i++) {
        const char = line[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            continue;
        }

        if (char === '"' && !inBacktick && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
        } else if (char === "'" && !inBacktick && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
        } else if (char === '`' && !inDoubleQuote && !inSingleQuote) {
            inBacktick = !inBacktick;
        }
    }

    return inSingleQuote || inDoubleQuote || inBacktick;
}
