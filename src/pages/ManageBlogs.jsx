// src/pages/ManageBlogs.jsx
import React from "react";
import AdminBlogForm from "./AdminBlogForm";
import Blog from "./Blog";
import Footer from "../components/Footer";

const ManageBlogs = () => {
  return (
    <>
      {/* Admin-side: create / delete premium blogs */}
      <AdminBlogForm />

      {/* Frontend preview: see all published blogs in luxury cards */}
      <Blog />

      {/* Footer */}
      <Footer />
    </>
  );
};

export default ManageBlogs;
