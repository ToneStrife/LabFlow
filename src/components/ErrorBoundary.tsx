"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // You could also log the error to an error reporting service here
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 p-4">
          <h1 className="text-3xl font-bold mb-4">Something went wrong.</h1>
          <p className="text-lg mb-4">We're sorry, an unexpected error occurred.</p>
          {this.props.fallback || (
            <details className="mt-4 p-2 border border-red-300 dark:border-red-700 rounded-md bg-red-100 dark:bg-red-900 text-sm max-w-lg overflow-auto">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="whitespace-pre-wrap break-words mt-2">
                {this.state.error?.message || "No error message available."}
                {this.state.error?.stack && `\n\nStack Trace:\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;