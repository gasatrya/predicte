/**
 * Logger Utility
 *
 * This module provides a simple logging utility with different log levels.
 *
 * Features:
 * - Support different log levels (debug, info, warn, error)
 * - Add timestamp to log messages
 * - Support output channel for VS Code
 */

import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private minLevel: LogLevel;

  constructor(name: string = 'Predicte', minLevel: LogLevel = LogLevel.INFO) {
    this.outputChannel = vscode.window.createOutputChannel(name);
    this.minLevel = minLevel;
  }

  debug(message: string, ...data: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log(LogLevel.DEBUG, message, ...data);
    }
  }

  info(message: string, ...data: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log(LogLevel.INFO, message, ...data);
    }
  }

  warn(message: string, ...data: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log(LogLevel.WARN, message, ...data);
    }
  }

  error(message: string, error?: unknown, ...data: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.log(LogLevel.ERROR, message, error, ...data);
    }
  }

  private log(level: LogLevel, message: string, ...data: unknown[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    this.outputChannel.appendLine(logMessage);

    if (data.length > 0) {
      data.forEach((item) => {
        const dataStr =
          typeof item === 'object'
            ? JSON.stringify(item, null, 2)
            : String(item);
        this.outputChannel.appendLine(dataStr);
      });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  show(): void {
    this.outputChannel.show();
  }

  hide(): void {
    this.outputChannel.hide();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// Global logger instance
export const logger = new Logger('Predicte', LogLevel.INFO);
