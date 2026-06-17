import React from "react";
import Header from "../components/Header";
import Preview from "../components/Preview";
import Testimonials from "../components/Testimonials";
import Courses from "./Courses";
import Membership from "../components/Membership";
import Ebook from "./Ebook";
import Blog from "./Blog";
import Coaching from "./Coaching";
import Product from "./Product";

export default function Home() {
  return (
    <>
      {/* Header */}
      <Header />
      <hr />

      {/* Preview */}
      <Preview />
      <hr />

      {/* Ebooks */}
      <Ebook />
      <hr />

      {/* Courses */}
      <Courses />
      <hr />

      {/* Testimonials */}
      <Testimonials />
      <hr />

      {/* Membership */}
      <Membership />
      <hr />

      {/* Blogs */}
      <Blog />
      <hr />

      {/* Products */}
      <Product />
      <hr />

      {/* Coaching */}
      <Coaching />
      <hr />
    </>
  );
}
