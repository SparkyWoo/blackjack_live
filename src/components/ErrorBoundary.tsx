"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#061a10] text-white p-6">
                    <div className="flex flex-col items-center gap-6 max-w-md text-center">
                        {/* Error icon */}
                        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        {/* Error message */}
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-amber-400">
                                Something went wrong
                            </h1>
                            <p className="text-white/60 text-sm">
                                The game encountered an unexpected error. Please reload to continue playing.
                            </p>
                        </div>

                        {/* Reload button */}
                        <button
                            onClick={this.handleReload}
                            className="px-6 py-3 bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600
                                       text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
                        >
                            Reload Game
                        </button>

                        {/* Error details (collapsed) */}
                        {this.state.error && (
                            <details className="text-left w-full">
                                <summary className="text-white/40 text-xs cursor-pointer hover:text-white/60">
                                    Technical details
                                </summary>
                                <pre className="mt-2 p-3 bg-black/40 rounded-lg text-red-400/70 text-xs overflow-auto max-h-32">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
