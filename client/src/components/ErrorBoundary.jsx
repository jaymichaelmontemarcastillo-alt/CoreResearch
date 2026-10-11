// src/components/ErrorBoundary.jsx
import React from 'react';
import { HiExclamationTriangle, HiArrowPath } from 'react-icons/hi2';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#050508] text-slate-100">
          <div className="max-w-md w-full p-8 rounded-2xl bg-[#15161e] border border-[#222433] text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center border border-amber-500/20">
              <HiExclamationTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Something went wrong</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              An unexpected error occurred while rendering this page. You can reload the page or return to the sign in portal.
            </p>
            {this.state.error?.message && (
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-red-400 text-xs font-mono text-left break-words">
                {this.state.error.message}
              </div>
            )}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <HiArrowPath className="w-4 h-4" />
                Reload Page
              </button>
              <a
                href="/login"
                className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-semibold flex items-center justify-center transition border border-slate-700"
              >
                Go to Sign In
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
