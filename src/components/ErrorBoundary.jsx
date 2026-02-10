import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
                    <h1>Something went wrong.</h1>
                    <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', textAlign: 'left', background: '#fef2f2', padding: '1rem', borderRadius: '0.5rem' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Reload Page
                    </button>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                        style={{ marginTop: '1rem', marginLeft: '1rem', padding: '0.5rem 1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Hard Reset (Clear Data)
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
