import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ServerError500 from './components/ServerError500.jsx'

const root = createRoot(document.getElementById('root'));

window.addEventListener('error', (event) => {
  console.error("Caught global error:", event.error);
  root.render(
    <div className="min-h-screen bg-[#fafafa] text-slate-900 flex flex-col">
      <ServerError500 />
    </div>
  );
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("Caught unhandled rejection:", event.reason);
  root.render(
    <div className="min-h-screen bg-[#fafafa] text-slate-900 flex flex-col">
      <ServerError500 />
    </div>
  );
});

root.render(
  <BrowserRouter>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </BrowserRouter>
)
