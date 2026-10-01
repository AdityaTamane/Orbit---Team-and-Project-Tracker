import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Orbit crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-[60dvh] place-items-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-rose-500/12 text-rose-500">
            <Icon name="alert-triangle" size={22} />
          </div>
          <h1 className="text-lg font-bold text-ink">Something broke on this screen</h1>
          <p className="mt-1.5 text-sm text-muted">
            The rest of the app is fine — your data is stored locally and untouched.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-sunken p-3 text-left font-mono text-2xs text-muted">
            {this.state.error.message}
          </pre>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="secondary" icon="rotate-ccw" onClick={() => this.setState({ error: null })}>Try again</Button>
            <Button variant="primary" icon="home" onClick={() => { window.location.hash = ''; window.location.reload() }}>Reload app</Button>
          </div>
        </div>
      </div>
    )
  }
}
