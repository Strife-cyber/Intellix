//! Structured logging for Rust binaries.
//! Outputs JSON to STDERR following the observability contract.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Log levels following standard conventions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
    Critical,
}

/// Structured log entry for STDERR output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub level: LogLevel,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<HashMap<String, serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
}

impl LogEntry {
    /// Create a new log entry
    pub fn new(level: LogLevel, message: impl Into<String>) -> Self {
        Self {
            level,
            message: message.into(),
            context: None,
            code: None,
            command: None,
        }
    }

    /// Add context to the log entry
    pub fn with_context(mut self, context: HashMap<String, serde_json::Value>) -> Self {
        self.context = Some(context);
        self
    }

    /// Add exit code to the log entry
    pub fn with_code(mut self, code: i32) -> Self {
        self.code = Some(code);
        self
    }

    /// Add command name to the log entry
    pub fn with_command(mut self, command: impl Into<String>) -> Self {
        self.command = Some(command.into());
        self
    }

    /// Add a single context key-value pair
    pub fn with_field(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        if self.context.is_none() {
            self.context = Some(HashMap::new());
        }
        if let Some(ref mut ctx) = self.context {
            ctx.insert(key.into(), value);
        }
        self
    }

    /// Write this log entry to STDERR as JSON
    pub fn write_to_stderr(&self) {
        if let Ok(json) = serde_json::to_string(self) {
            eprintln!("{}", json);
        } else {
            // Fallback if serialization fails
            eprintln!(
                r#"{{"level":"error","message":"Failed to serialize log entry","context":{{"original_message":"{}"}}}}"#,
                self.message.replace('"', "\\\"")
            );
        }
    }

    /// Create an error log entry
    pub fn error(message: impl Into<String>) -> Self {
        Self::new(LogLevel::Error, message)
    }

    /// Create a warning log entry
    pub fn warning(message: impl Into<String>) -> Self {
        Self::new(LogLevel::Warning, message)
    }

    /// Create an info log entry
    pub fn info(message: impl Into<String>) -> Self {
        Self::new(LogLevel::Info, message)
    }

    /// Create a debug log entry
    pub fn debug(message: impl Into<String>) -> Self {
        Self::new(LogLevel::Debug, message)
    }

    /// Create a critical log entry
    pub fn critical(message: impl Into<String>) -> Self {
        Self::new(LogLevel::Critical, message)
    }
}

/// Helper function to log and exit with an error code
pub fn log_and_exit(entry: LogEntry, exit_code: i32) -> ! {
    entry.with_code(exit_code).write_to_stderr();
    std::process::exit(exit_code);
}
