import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Discovery from './pages/Discovery';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Workers from './pages/Workers';
import Configuration from './pages/Configuration';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="discovery" element={<Discovery />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="orders" element={<Orders />} />
          <Route path="workers" element={<Workers />} />
          <Route path="configuration" element={<Configuration />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
