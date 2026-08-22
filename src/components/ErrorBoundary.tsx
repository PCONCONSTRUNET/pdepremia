import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#131829', color: '#f87171', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Ocorreu um erro no sistema (Tela Azul)</h1>
          <p style={{ marginBottom: '20px', color: '#94a3b8' }}>Por favor, tire um print dessa tela e envie para o desenvolvedor.</p>
          <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', overflow: 'auto' }}>
            <h2 style={{ fontSize: '18px', color: '#e2e8f0', marginBottom: '10px' }}>{this.state.error && this.state.error.toString()}</h2>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#cbd5e1' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
