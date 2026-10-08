import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ChevronRight, Sparkle, BadgeCheck } from 'lucide-react';

const PHONE = '+91 8012052331';
const EMAIL = 'msacademics.edu@gmail.com';
const WHATSAPP_URL = 'https://wa.me/918012052331?text=Hello!%20I%20would%20like%20to%20inquire%20about%20the%20GATE%20coaching%20programs%20and%20admissions%20at%20MS%20Academy.%20Could%20you%20please%20share%20more%20details%3F';

// Brand marks (lucide no longer ships logos) - same paths as SocialCard
const WhatsAppIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
  </svg>
);
const InstagramIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
    <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
  </svg>
);
const YouTubeIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
    <path d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6-11.4 42.9-11.4 132.3-11.4 132.3s0 89.4 11.4 132.3c6.3 23.7 24.8 41.5 48.3 47.8C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.2 48.3-47.8 11.4-42.9 11.4-132.3 11.4-132.3s0-89.4-11.4-132.3zm-317.5 213.5V175.2l142.7 81.2-142.7 81.2z" />
  </svg>
);

const SOCIALS = [
  { name: 'WhatsApp', href: WHATSAPP_URL, Icon: WhatsAppIcon, color: 'text-[#25D366]' },
  { name: 'Instagram', href: 'https://www.instagram.com/ms__academics?utm_source=qr&igsh=MWVldTF5ZnVrMGNhYg==', Icon: InstagramIcon, color: 'text-[#E4405F]' },
  { name: 'YouTube', href: 'https://youtube.com/@ms_academics?si=HsJlHGR36xd13eD6', Icon: YouTubeIcon, color: 'text-[#FF0000]' },
  { name: 'Email', href: `mailto:${EMAIL}`, Icon: ({ size }) => <Mail size={size} />, color: 'text-[#1d4ed8]' }
];

const COMPANY_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'About Us', path: '/about' },
  { name: 'GATE Courses', path: '/gate-courses' },
  { name: 'Programming Courses', path: '/programming' },
  { name: 'Blog', path: '/blog' },
  { name: 'Careers', path: '/careers' },
  { name: 'Contact Us', path: '/contact' },
  { name: 'Student Login', path: '/login' }
];

const COURSE_LINKS = [
  { name: 'GATE Computer Science', path: '/courses/cse' },
  { name: 'GATE Electronics', path: '/courses/ece' },
  { name: 'GATE Electrical', path: '/courses/ee' },
  { name: 'GATE Mechanical', path: '/courses/me' },
  { name: 'GATE Civil', path: '/courses/ce' },
  { name: 'Data Science & AI', path: '/courses/ds' },
  { name: 'GATE Instrumentation', path: '/courses/in' },
  { name: 'GATE Chemical', path: '/courses/ch' },
  { name: 'GATE Biotechnology', path: '/courses/bt' },
  { name: 'GATE Biomedical', path: '/courses/bm' },
  { name: 'View all GATE courses', path: '/gate-courses' }
];

// Column heading: brand-blue title with a small sparkle and an underline bar
const ColumnHeading = ({ children }) => (
  <div className="mb-6">
    <h3 className="flex items-center gap-1.5 text-[#1d4ed8] font-bold text-lg">
      {children}
      <Sparkle size={14} className="text-[#93c5fd] fill-[#93c5fd]" />
    </h3>
    <span className="block mt-2 h-[3px] w-8 rounded-full bg-[#1d4ed8]" />
  </div>
);

const LinkList = ({ links }) => (
  <ul className="flex flex-col gap-3.5">
    {links.map(link => (
      <li key={link.path + link.name}>
        <Link to={link.path} className="group flex items-center gap-3 text-[15px] text-slate-700 hover:text-[#1d4ed8] transition-colors">
          <span className="w-6 h-6 shrink-0 rounded-full bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
            <ChevronRight size={14} strokeWidth={2.5} />
          </span>
          {link.name}
        </Link>
      </li>
    ))}
  </ul>
);

const ContactItem = ({ icon, iconClass = 'bg-[#eff6ff] text-[#1d4ed8]', label, children }) => (
  <li className="flex items-start gap-4">
    <span className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${iconClass}`}>{icon}</span>
    <div className="min-w-0 pt-0.5">
      <div className="font-bold text-slate-900">{label}</div>
      <div className="mt-1 text-sm leading-relaxed text-[#1d4ed8]">{children}</div>
    </div>
  </li>
);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 px-4 sm:px-6 pb-6">
      <div className="relative max-w-7xl mx-auto bg-white rounded-3xl border border-[#dbeafe] shadow-[0_8px_30px_rgba(29,78,216,0.06)] overflow-hidden">
        {/* Dotted corner pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 w-56 h-56 opacity-70 [background-image:radial-gradient(#bfdbfe_1.5px,transparent_1.5px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom_left,black,transparent_70%)]"
        />

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

          {/* About */}
          <div className="px-6 sm:px-8 py-10">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.webp" alt="MS GATE Academy" className="w-12 h-12 object-contain" />
              <div className="flex flex-col">
                <span className="font-black text-[17px] text-[#1e3a8a] uppercase tracking-wide leading-none">MS GATE Academy</span>
                <span className="font-bold text-[11px] text-[#1d4ed8] uppercase tracking-[0.15em] mt-1 leading-none">Coimbatore</span>
              </div>
            </Link>

            <h3 className="mt-7 text-[#1d4ed8] font-bold text-lg">About MS GATE Academy</h3>
            <p className="mt-3 text-[15px] text-slate-600 leading-relaxed">
              Empowering engineers to achieve their dreams with top-tier coaching for GATE and programming excellence. Your success is our mission.
            </p>

            <div className="mt-6 flex gap-3">
              {SOCIALS.map(({ name, href, Icon, color }) => (
                <a
                  key={name}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  aria-label={name}
                  className={`w-11 h-11 rounded-full bg-white border border-slate-100 shadow-[0_4px_12px_rgba(15,23,42,0.08)] flex items-center justify-center ${color} hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(29,78,216,0.18)] transition-all`}
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>

            <div className="mt-6 inline-flex items-center gap-3 rounded-xl border-2 border-[#1e3a8a] px-3.5 py-2">
              <BadgeCheck size={26} className="text-[#1d4ed8] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Udyam Startup Reg.</span>
                <span className="mt-1 text-[14px] font-black text-[#1e3a8a] leading-none">TN-03-0337502</span>
              </div>
            </div>
          </div>

          {/* Company */}
          <div className="px-6 sm:px-8 py-10 border-t md:border-t-0 md:border-l border-dashed border-[#dbeafe]">
            <ColumnHeading>Company</ColumnHeading>
            <LinkList links={COMPANY_LINKS} />
          </div>

          {/* Courses */}
          <div className="px-6 sm:px-8 py-10 border-t lg:border-t-0 lg:border-l border-dashed border-[#dbeafe]">
            <ColumnHeading>Popular Courses</ColumnHeading>
            <LinkList links={COURSE_LINKS} />
          </div>

          {/* Contact */}
          <div className="px-6 sm:px-8 py-10 border-t lg:border-t-0 md:border-l border-dashed border-[#dbeafe]">
            <div className="mb-6">
              <h3 className="text-[#1d4ed8] font-bold text-lg">Get in touch with us</h3>
              <span className="block mt-2 h-[3px] w-8 rounded-full bg-[#1d4ed8]" />
            </div>
            <ul className="flex flex-col gap-6">
              <ContactItem icon={<MapPin size={22} />} label="Othakkalmandapam Branch">
                9 Vinayagar Koil Street, RC Nagar, Othakkalmandapam (P.O), Coimbatore - 641032
              </ContactItem>
              <ContactItem icon={<MapPin size={22} />} label="Malumichampatti Branch">
                MVP Complex, 1/453 B5, Chettipalayam Road, Malumichampatti, Coimbatore - 641050
                <span className="block text-slate-500">Near VMK Bakery, Malumichampatti Bus Stop</span>
              </ContactItem>
              <ContactItem icon={<Mail size={22} />} label="Email">
                <a href={`mailto:${EMAIL}`} className="hover:underline break-all">{EMAIL}</a>
              </ContactItem>
              <ContactItem icon={<Phone size={22} />} label="Phone">
                <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="hover:underline">{PHONE}</a>
              </ContactItem>
              <ContactItem icon={<WhatsAppIcon size={22} />} iconClass="bg-[#dcfce7] text-[#25D366]" label="WhatsApp">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">{PHONE}</a>
              </ContactItem>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="relative border-t border-dashed border-[#dbeafe] bg-[#eff6ff]/50 px-6 sm:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          <p className="text-slate-500">&copy; {currentYear} MS GATE Academy. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-500 hover:text-[#1d4ed8] transition-colors">Privacy Policy</a>
            <a href="#" className="text-slate-500 hover:text-[#1d4ed8] transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
