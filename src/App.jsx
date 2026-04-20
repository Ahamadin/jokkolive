// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Home   from './routes/Home.jsx';
import Stream from './routes/Stream.jsx';
import Join   from './routes/Join.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/"              element={<Home />} />
      <Route path="/stream/:room"  element={<Stream />} />
      <Route path="*"              element={<Navigate to="/" replace />} />
      <Route path="/join/:room"   element={<Join />} />
    </Routes>
  );
}