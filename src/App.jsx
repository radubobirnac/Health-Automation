import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Security from "./pages/Security.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Logs from "./pages/Logs.jsx";
import BotActive from "./pages/BotActive.jsx";
import AdminCreateUser from "./pages/AdminCreateUser.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminGuard from "./components/AdminGuard.jsx";
import AuthGuard from "./components/AuthGuard.jsx";
import TrustsData from "./pages/TrustsData.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/security" element={<Security />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/app"
          element={<AuthGuard><Dashboard /></AuthGuard>}
        />
        <Route
          path="/logs"
          element={<AuthGuard><Logs /></AuthGuard>}
        />
        <Route
          path="/trusts-data"
          element={<AuthGuard><TrustsData /></AuthGuard>}
        />
        <Route
          path="/portal-data"
          element={<AuthGuard><TrustsData /></AuthGuard>}
        />
        <Route
          path="/bot-active"
          element={<AdminGuard><BotActive /></AdminGuard>}
        />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminCreateUser />
            </AdminGuard>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
