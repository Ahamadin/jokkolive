import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// StrictMode retiré : en dev il monte les composants 2x et appelle le cleanup
// entre les deux mounts → disconnect() coupe la connexion LiveKit/WebSocket
// pendant qu'elle s'établit. Ce comportement n'existe PAS en production.
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);