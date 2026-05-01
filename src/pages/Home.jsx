import React from 'react';
import Header from '../components/Header';
import Preview from '../components/Preview';
import Testimonials from '../components/Testimonials';
import Courses from './Courses';
import Membership from '../components/Membership';
import Ebook from './Ebook';
import Blog from './Blog';
import Coaching from './Coaching';
import Product from './Product';

export default function Home(){
  return (
    <>
      {/* Header */}
      <Header />

      {/* Preview */}
      <Preview />

      {/* Ebooks */}
      <Ebook />

      {/* Courses */}
      <Courses />

      {/* Testimonials */}
      <Testimonials />

      {/* Membership */}
      <Membership />

      {/* Blogs */}
      <Blog />

      {/* Products */}
      <Product />

      {/* Coaching */}
      <Coaching />
    </>
 )
}



