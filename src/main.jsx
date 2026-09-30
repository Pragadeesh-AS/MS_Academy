import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
// Extracted questions store maths as KaTeX HTML - every page that shows them needs its styles
import 'katex/dist/katex.min.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const root = createRoot(document.getElementById('root'));

// These used to tear down the entire app (replacing everything on screen with the error page)
// for ANY uncaught error or unhandled promise rejection anywhere - including harmless, transient
// ones from third-party libraries (Agora's WebRTC internals, a flaky network request, etc.) that
// don't actually break the page. That's why live classes in particular kept getting knocked out:
// they run the most async/WebRTC activity, so they were the most likely to trip this.
// A genuine crash inside our own React render tree is still caught by <ErrorBoundary>, which is
// the correct, narrower mechanism for that. These two just log now, so a stray rejection doesn't
// end an active class or wipe unsaved work.
window.addEventListener('error', (event) => {
  console.error("Caught global error:", event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("Caught unhandled rejection:", event.reason);
});

root.render(
  <BrowserRouter>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </BrowserRouter>
)
