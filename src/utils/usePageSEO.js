import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_SEO_MAP = {
  '/': {
    title: 'MS Gate Academy | Premier GATE & PSU Coaching Institute',
    description: 'Prepare for GATE with premier online live classes, CBT test series, expert faculty, and structured study material across all engineering disciplines.'
  },
  '/about': {
    title: 'About Us | MS Gate Academy',
    description: 'Learn about MS Gate Academy, our mission, expert faculty team, and proven track record in GATE and PSU exam coaching.'
  },
  '/contact': {
    title: 'Contact Us & Admissions | MS Gate Academy',
    description: 'Get in touch with MS Gate Academy counselors for admission details, course fees, test series inquiries, and batch timings.'
  },
  '/gate-courses': {
    title: 'GATE Engineering Courses & Streams | MS Gate Academy',
    description: 'Explore comprehensive GATE coaching programs across Chemical, Mechanical, Civil, CSE, ECE, EEE, Data Science, and all engineering branches.'
  },
  '/programming': {
    title: 'Programming & Software Development Courses | MS Gate Academy',
    description: 'Hands-on programming courses covering Python, C++, Java, Data Structures, Algorithms, and Full-Stack web development.'
  },
  '/careers': {
    title: 'Faculty & Educator Careers | MS Gate Academy',
    description: 'Join MS Gate Academy as GATE faculty, subject matter expert, or typist. Explore open teaching opportunities with competitive compensation.'
  },
  '/blog': {
    title: 'GATE Exam Preparation Blog & Guides | MS Gate Academy',
    description: 'Expert tips, syllabus breakdowns, previous year paper analyses, and strategy guides for cracking GATE with top ranks.'
  },
  '/gallery': {
    title: 'Campus & Academy Gallery | MS Gate Academy',
    description: 'Take a tour of MS Gate Academy classrooms, student interactions, achievement felicitations, and campus events.'
  },
  '/login': {
    title: 'Student & Faculty Portal Login | MS Gate Academy',
    description: 'Sign in to access your GATE online classes, test portal, practice tests, performance analytics, and study notes.'
  },
  // Individual GATE Courses
  '/courses/ch': {
    title: 'GATE Chemical Engineering (CH) Coaching | MS Gate Academy',
    description: 'Comprehensive GATE Chemical Engineering (CH) preparation with specialized faculty, complete syllabus coverage, and CBT mock tests.'
  },
  '/courses/me': {
    title: 'GATE Mechanical Engineering (ME) Coaching | MS Gate Academy',
    description: 'Top-tier GATE Mechanical Engineering coaching covering Thermodynamics, Fluid Mechanics, Manufacturing, and Machine Design with mock tests.'
  },
  '/courses/ce': {
    title: 'GATE Civil Engineering (CE) Coaching | MS Gate Academy',
    description: 'Target high scores in GATE Civil Engineering with structured live classes in Structural, Geotechnical, Environmental, and Transportation engineering.'
  },
  '/courses/cse': {
    title: 'GATE Computer Science & IT (CS/IT) Coaching | MS Gate Academy',
    description: 'Complete GATE CSE/IT preparation covering Algorithms, Data Structures, TOC, Compiler Design, OS, DBMS, and Computer Networks.'
  },
  '/courses/ece': {
    title: 'GATE Electronics & Communication (EC) Coaching | MS Gate Academy',
    description: 'In-depth GATE ECE coaching covering Communications, Signals & Systems, Electromagnetics, EDC, Analog & Digital circuits.'
  },
  '/courses/ee': {
    title: 'GATE Electrical Engineering (EE) Coaching | MS Gate Academy',
    description: 'Expert GATE Electrical coaching covering Power Systems, Electrical Machines, Control Systems, Power Electronics, and Network Theory.'
  },
  '/courses/ds': {
    title: 'GATE Data Science & Artificial Intelligence (DA) Coaching | MS Gate Academy',
    description: 'Prepare for the new GATE Data Science & AI (DA) paper with Python, Probability, Machine Learning, Linear Algebra, and Database systems.'
  },
  '/courses/in': {
    title: 'GATE Instrumentation Engineering (IN) Coaching | MS Gate Academy',
    description: 'GATE Instrumentation Engineering coaching covering Transducers, Sensors, Optical Instrumentation, and Biomedical measurements.'
  },
  '/courses/pi': {
    title: 'GATE Production & Industrial Engineering (PI) Coaching | MS Gate Academy',
    description: 'Focused GATE PI coaching covering Operations Research, Manufacturing Processes, Quality Control, and Production Planning.'
  },
  '/courses/bt': {
    title: 'GATE Biotechnology (BT) Coaching | MS Gate Academy',
    description: 'Premier GATE Biotechnology coaching covering Bioprocess Engineering, Molecular Biology, Recombinant DNA Technology, and Biochemistry.'
  },
  '/courses/bm': {
    title: 'GATE Biomedical Engineering (BM) Coaching | MS Gate Academy',
    description: 'GATE Biomedical Engineering coaching covering Biomaterials, Biomechanics, Medical Imaging, and Biosignal Processing.'
  },
  '/courses/ph': {
    title: 'GATE Physics (PH) Coaching | MS Gate Academy',
    description: 'GATE Physics coaching covering Classical Mechanics, Quantum Mechanics, Electrodynamics, Condensed Matter, and Nuclear Physics.'
  },
  '/courses/ar': {
    title: 'GATE Architecture & Planning (AR) Coaching | MS Gate Academy',
    description: 'GATE Architecture & Planning online coaching covering Architectural Design, Urban Planning, Sustainability, and Building Services.'
  },
  '/courses/ag': {
    title: 'GATE Agricultural Engineering (AG) Coaching | MS Gate Academy',
    description: 'GATE Agricultural Engineering coaching covering Farm Machinery, Soil & Water Conservation, and Food Processing Engineering.'
  },
  '/courses/mt': {
    title: 'GATE Metallurgical Engineering (MT) Coaching | MS Gate Academy',
    description: 'GATE Metallurgical Engineering coaching covering Physical Metallurgy, Thermodynamics of Materials, Extractive Metallurgy, and Mechanical Metallurgy.'
  },
  '/courses/es': {
    title: 'GATE Environmental Science & Engineering (ES) Coaching | MS Gate Academy',
    description: 'GATE Environmental Science (ES) coaching covering Environmental Chemistry, Microbiology, Water Treatment, and Air Pollution Control.'
  },
  '/courses/xl': {
    title: 'GATE Life Sciences (XL) Coaching | MS Gate Academy',
    description: 'GATE Life Sciences (XL) coaching covering Chemistry, Biochemistry, Botany, Zoology, Microbiology, and Food Technology.'
  },
  '/courses/ae': {
    title: 'GATE Aerospace Engineering (AE) Coaching | MS Gate Academy',
    description: 'GATE Aerospace Engineering coaching covering Aerodynamics, Flight Mechanics, Propulsion, and Space Dynamics.'
  },
  '/courses/st': {
    title: 'GATE Statistics (ST) Coaching | MS Gate Academy',
    description: 'GATE Statistics (ST) preparation covering Probability Theory, Stochastic Processes, Inference, Multivariate Analysis, and Linear Models.'
  }
};

const DEFAULT_SEO = {
  title: 'MS Gate Academy | Premier GATE & PSU Coaching Institute',
  description: 'MS Gate Academy provides premier GATE and PSU preparation with expert faculty, interactive live classes, CBT test series, and comprehensive study materials across all major engineering disciplines.'
};

/**
 * Custom React Hook to automatically update document title,
 * meta description, canonical link, and OpenGraph metadata per route.
 */
export function usePageSEO() {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    const seoData = ROUTE_SEO_MAP[pathname] || DEFAULT_SEO;

    // 1. Update Title
    document.title = seoData.title;

    // 2. Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', seoData.description);

    // 3. Update OpenGraph Title & Description
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', seoData.title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', seoData.description);

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://www.msgateacademy.com${pathname === '/' ? '' : pathname}`);

    // 4. Update Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://www.msgateacademy.com${pathname === '/' ? '' : pathname}`);
  }, [location.pathname]);
}
