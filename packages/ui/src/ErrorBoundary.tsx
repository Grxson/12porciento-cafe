import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">☕</p>
            <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">Algo salió mal</h2>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">Ocurrió un error inesperado.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-primary"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
