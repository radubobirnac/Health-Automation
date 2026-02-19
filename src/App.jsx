import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminCreateUser from "./pages/AdminCreateUser.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminGuard from "./components/AdminGuard.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/app" element={<Dashboard />} />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminCreateUser />
            </AdminGuard>
          }
        />
      </Routes>
    </Layout>
  );
}
