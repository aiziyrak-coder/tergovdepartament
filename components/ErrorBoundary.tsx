import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches JavaScript errors in child tree and shows a fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-8 text-slate-800 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 text-red-600 mb-6">
              <AlertTriangle size={40} aria-hidden />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">
              {this.props.fallbackTitle ?? "Хатолик юз берди"}
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Модул ишлашда нозолик аниқланди. Саҳифани янгилаб ёки орқага қайтинг.
            </p>
            <details className="text-left mb-6 p-4 bg-slate-50 rounded-xl text-xs font-mono text-slate-600 overflow-auto max-h-32">
              <summary className="cursor-pointer font-bold text-slate-700">Техник маълумот</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
            </details>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-uzblue text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors"
            >
              <RefreshCw size={18} />
              Қайта уринаш
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
