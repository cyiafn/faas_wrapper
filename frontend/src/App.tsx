import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.css';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import CreateNew from './pages/CreateNew';
import UpdateFun from './pages/UpdateFunction';
import DeleteFun from './pages/DeleteFunction';
import GetLink from './pages/GetLink';

function App() {
  return (
    <Router>
      <Layout pageTitle="">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/create" element={<CreateNew />} />
          <Route path="/update" element={<UpdateFun />} />
          <Route path="/delete" element={<DeleteFun />} />
          <Route path="/get" element={<GetLink />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
