// src/routes/AppRoutes.jsx
import { Routes, Route } from 'react-router-dom';
import Home from '../pages/home.jsx'
import About from '../pages/about.jsx';
import Contact from '../pages/contact.jsx';
import Careers from '../pages/careers.jsx'

import Services from '../pages/Services.jsx';
import Industries from '../pages/industries.jsx';
import CaseStudiesPage from '../pages/casestudy.jsx';




const AppRoutes = () => {
  return (

    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/About" element={<About />} />
      <Route path="/industries" element={<Industries />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/services" element={<Services />} />
      <Route path="/resources" element={<CaseStudiesPage/>}/>
      <Route path="/careers" element={<Careers/>}/>
      <Route path="/contact" element={<Contact/>}/>

      {/* <Route path="/focus-areas/banking" element={<Banking />} /> */}
    </Routes>

  );
};

export default AppRoutes;