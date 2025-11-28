import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Set the browser tab title
try { document.title = 'CYCL'; } catch (e) {}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

