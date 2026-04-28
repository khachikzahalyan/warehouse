import React from 'react';
import ReactDOM from 'react-dom/client';

// Inter (self-hosted via @fontsource) — load BEFORE index.css so the
// --font-family-base token resolves to a real loaded face on first paint.
// Only the four weights the app actually uses are pulled in; tree-shaking
// keeps the bundle lean.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import './index.css';
import './i18n'; // initialize i18next before any component reads t()
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
