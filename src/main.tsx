import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { colorSchemeService } from './services/colorSchemeService'

// Set document title
document.title = 'X-Air Radio Control';

// Initialize color scheme on app load
colorSchemeService.getCurrentScheme();

createRoot(document.getElementById("root")!).render(<App />);
