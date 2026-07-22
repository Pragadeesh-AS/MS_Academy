import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Monitor, Cpu, Cog, Building2, Zap, Settings, Database, Gauge, 
  Dna, FlaskConical, HeartPulse, Atom, DraftingCompass, Sprout, 
  Anvil, Leaf, Microscope, Plane, ArrowRight, BookOpen, 
  GraduationCap, Award, Briefcase, Globe, Sparkles 
} from 'lucide-react';

const themes = {
  blue: {
    tag: "bg-blue-50 text-blue-600 border-blue-100/50",
    dotBg: "bg-blue-500",
    mediaBorder: "group-hover/media:border-blue-400",
    shadowHover: "hover:shadow-[0_30px_60px_-15px_rgba(59,130,246,0.15)]",
    btnHover: "hover:bg-blue-600 hover:shadow-blue-500/20 hover:border-transparent",
    bgGradientHover: "group-hover:from-blue-50/15 group-hover:to-transparent",
    watermarkHover: "group-hover:text-blue-500/8"
  },
  purple: {
    tag: "bg-purple-50 text-purple-600 border-purple-100/50",
    dotBg: "bg-purple-500",
    mediaBorder: "group-hover/media:border-purple-400",
    shadowHover: "hover:shadow-[0_30px_60px_-15px_rgba(168,85,247,0.15)]",
    btnHover: "hover:bg-purple-600 hover:shadow-purple-500/20 hover:border-transparent",
    bgGradientHover: "group-hover:from-purple-50/15 group-hover:to-transparent",
    watermarkHover: "group-hover:text-purple-500/8"
  },
  orange: {
    tag: "bg-orange-50 text-orange-600 border-orange-100/50",
    dotBg: "bg-orange-500",
    mediaBorder: "group-hover/media:border-orange-400",
    shadowHover: "hover:shadow-[0_30px_60px_-15px_rgba(249,115,22,0.15)]",
    btnHover: "hover:bg-orange-600 hover:shadow-orange-500/20 hover:border-transparent",
    bgGradientHover: "group-hover:from-orange-50/15 group-hover:to-transparent",
    watermarkHover: "group-hover:text-orange-500/8"
  },
  yellow: {
    tag: "bg-amber-50 text-amber-700 border-amber-100/50",
    dotBg: "bg-amber-500",
    mediaBorder: "group-hover/media:border-amber-400",
    shadowHover: "hover:shadow-[0_30px_60px_-15px_rgba(245,158,11,0.15)]",
    btnHover: "hover:bg-amber-600 hover:shadow-amber-500/20 hover:border-transparent",
    bgGradientHover: "group-hover:from-amber-50/15 group-hover:to-transparent",
    watermarkHover: "group-hover:text-amber-500/8"
  },
  emerald: {
    tag: "bg-emerald-50 text-emerald-600 border-emerald-100/50",
    dotBg: "bg-emerald-500",
    mediaBorder: "group-hover/media:border-emerald-400",
    shadowHover: "hover:shadow-[0_30px_60px_-15px_rgba(16,185,129,0.15)]",
    btnHover: "hover:bg-emerald-600 hover:shadow-emerald-500/20 hover:border-transparent",
    bgGradientHover: "group-hover:from-emerald-50/15 group-hover:to-transparent",
    watermarkHover: "group-hover:text-emerald-500/8"
  },
  cyan: {
    tag: "bg-cyan-50 text-cyan-600 border-cyan-100/50",
    dotBg: "bg-cyan-500",
    mediaBorder: "group-hover/media:border-cyan-400",
    shadowHover: "hover:shadow-[0_30px_60px_-15px_rgba(6,182,212,0.15)]",
    btnHover: "hover:bg-cyan-600 hover:shadow-cyan-500/20 hover:border-transparent",
    bgGradientHover: "group-hover:from-cyan-50/15 group-hover:to-transparent",
    watermarkHover: "group-hover:text-cyan-500/8"
  },
  red: {
    tag: "bg-red-50 text-red-600 border-red-100/50",
    dotBg: "bg-red-500",
    mediaBorder: "group-hover/media:border-red-400",
    shadowHover: "hover:shadow-[0_30px_60px_-15px_rgba(239,68,68,0.15)]",
    btnHover: "hover:bg-red-600 hover:shadow-red-500/20 hover:border-transparent",
    bgGradientHover: "group-hover:from-red-50/15 group-hover:to-transparent",
    watermarkHover: "group-hover:text-red-500/8"
  }
};

const gateCoursesData = [
  {
    code: "CSE",
    name: "Computer Science (CSE)",
    icon: Monitor,
    path: "/courses/cse",
    desc: "Master algorithms, programming in C, data structures, databases, computer networks, compiler design, and operating systems.",
    highlights: ["Algorithms & Data Structures", "Theory of Computation & Compiler", "Computer Networks & OS"],
    video: "/CSE.mp4",
    theme: themes.blue
  },
  {
    code: "ECE",
    name: "Electronics (ECE)",
    icon: Cpu,
    path: "/courses/ece",
    desc: "Specialized training in signals & systems, electronic devices, analog/digital circuits, electromagnetics, and communications.",
    highlights: ["Electromagnetics & Antennas", "Analog & Digital Circuits", "Signals, Systems & Controls"],
    video: "/ECE.mp4",
    theme: themes.purple
  },
  {
    code: "EE",
    name: "Electrical (EE)",
    icon: Zap,
    path: "/courses/ee",
    desc: "Core concepts of electrical machines, power systems, control systems, power electronics, and electromagnetic fields.",
    highlights: ["Electrical Machines", "Power Systems & Analysis", "Power Electronics & Drives"],
    video: "/EEE.mp4",
    theme: themes.yellow
  },
  {
    code: "CE",
    name: "Civil (CE)",
    icon: Building2,
    path: "/courses/ce",
    desc: "In-depth modules on structural engineering, geotechnics, environmental engineering, transportation, and surveying.",
    highlights: ["Structural Mechanics", "Geotechnical Engineering", "Environmental & Transportation"],
    video: "/Civil.mp4",
    theme: themes.emerald
  },
  {
    code: "DS",
    name: "Data Science & AI (DS)",
    icon: Database,
    path: "/courses/ds",
    desc: "Advanced modules in probability, linear algebra, machine learning, deep learning, Python scripting, and database architectures.",
    highlights: ["Probability & Statistics", "Linear Algebra & Calculus", "Machine Learning & AI"],
    video: "/AIDS.mp4",
    theme: themes.blue
  },
  {
    code: "ME",
    name: "Mechanical (ME)",
    icon: Cog,
    path: "/courses/me",
    desc: "Comprehensive modules covering applied mechanics, design, fluid mechanics, thermodynamics, and manufacturing technology.",
    highlights: ["Thermodynamics & Heat", "Fluid Mechanics", "Machine Design & Mechanics"],
    video: "/MECH.mp4",
    theme: themes.orange
  },
  {
    code: "PI",
    name: "Production & Industrial (PI)",
    icon: Settings,
    path: "/courses/pi",
    desc: "Focuses on casting/forming processes, machining, production planning, operations research, and quality engineering.",
    highlights: ["Metal Casting & Machining", "Operations Research", "Production & Inventory"],
    video: "/Production & Industrial.mp4",
    theme: themes.orange
  },
  {
    code: "IN",
    name: "Instrumentation (IN)",
    icon: Gauge,
    path: "/courses/in",
    desc: "Focus on sensors & industrial instrumentation, optical instrumentation, electrical circuits, measurements, and control systems.",
    highlights: ["Sensors & Transducers", "Measurement Systems", "Optoelectronics"],
    video: "/Instrumentation_Engineering.mp4",
    theme: themes.cyan
  },
  {
    code: "AE",
    name: "Aerospace (AE)",
    icon: Plane,
    path: "/courses/ae",
    desc: "Advanced curriculum covering aerodynamics, flight mechanics, propulsion, aircraft structures, and space dynamics.",
    highlights: ["Aerodynamics & Fluids", "Aircraft Structures", "Jet & Rocket Propulsion"],
    video: "/Aerospace_Engineering.mp4",
    theme: themes.orange
  },
  {
    code: "AR",
    name: "Architecture (AR)",
    icon: DraftingCompass,
    path: "/courses/ar",
    desc: "Aesthetic and technical elements of architecture history, design, building materials, construction services, and urban planning.",
    highlights: ["Architecture & Design", "Building Services", "Urban Planning & Housing"],
    video: "/Architecture and Planning.mp4",
    theme: themes.cyan
  },
  {
    code: "CH",
    name: "Chemical (CH)",
    icon: FlaskConical,
    path: "/courses/ch",
    desc: "Covers transport phenomena, chemical reaction engineering, process design, instrumentation, and plant economics.",
    highlights: ["Heat & Mass Transfer", "Chemical Reaction Engg", "Process Control & Dynamics"],
    video: "/Chemical_Engineering.mp4",
    theme: themes.cyan
  },
  {
    code: "BT",
    name: "Biotechnology (BT)",
    icon: Dna,
    path: "/courses/bt",
    desc: "Advanced training in recombinant DNA, bioprocess engineering, microbiology, genetics, and molecular biology.",
    highlights: ["Recombinant DNA Tech", "Bioprocess Engineering", "Microbiology & Biotech"],
    video: "/Bio_technology.mp4",
    theme: themes.purple
  },
  {
    code: "BM",
    name: "Biomedical (BM)",
    icon: HeartPulse,
    path: "/courses/bm",
    desc: "Integration of biology and engineering: medical electronics, biosensors, biomechanics, and medical imaging systems.",
    highlights: ["Biomaterials & Sensors", "Medical Imaging Systems", "Anatomy & Physiology"],
    video: "/Bio_Medical.mp4",
    theme: themes.purple
  },
  {
    code: "XL",
    name: "Life Sciences (XL)",
    icon: Microscope,
    path: "/courses/xl",
    desc: "In-depth modules tailored for chemistry, biochemistry, botany, microbiology, zoology, and food technology sections.",
    highlights: ["Biochemistry & Genetics", "Microbiology & Cell Biology", "Botany & Zoology"],
    video: "/Life_Science.mp4",
    theme: themes.emerald
  },
  {
    code: "PH",
    name: "Physics (PH)",
    icon: Atom,
    path: "/courses/ph",
    desc: "Rigorous training in quantum mechanics, electromagnetic theory, mathematical physics, atomic physics, and thermodynamics.",
    highlights: ["Quantum Mechanics", "Electromagnetic Theory", "Solid State & Nuclear Physics"],
    video: "/Physics.mp4",
    theme: themes.red
  },
  {
    code: "AG",
    name: "Agricultural (AG)",
    icon: Sprout,
    path: "/courses/ag",
    desc: "Focus on soil & water conservation engineering, farm power machinery, food processing, and irrigation systems.",
    highlights: ["Soil & Water Conservation", "Farm Power Machinery", "Agricultural Processing"],
    video: "/Agricultural_Engineering.mp4",
    theme: themes.orange
  },
  {
    code: "MT",
    name: "Metallurgical (MT)",
    icon: Anvil,
    path: "/courses/mt",
    desc: "Deep study of physical metallurgy, mechanical metallurgy, thermodynamics of materials, and extractive metallurgy processes.",
    highlights: ["Physical & Mechanical Met", "Extractive Metallurgy", "Thermodynamics of Materials"],
    video: "/Metallurgical_Engineering.mp4",
    theme: themes.emerald
  },
  {
    code: "ES",
    name: "Environmental (ES)",
    icon: Leaf,
    path: "/courses/es",
    desc: "Comprehensive coverage of environmental chemistry, microbiology, water/air pollution, solid waste management, and ecology.",
    highlights: ["Water & Wastewater Engg", "Air & Noise Pollution", "Solid & Hazardous Waste"],
    video: "/Environment.mp4",
    theme: themes.emerald
  }
];

const postGateOpportunities = [
  {
    title: "M.Tech & Ph.D Admissions",
    description: "Get direct admission to prestigious institutions like IISc, IITs, NITs, and IIITs with a monthly stipend of ₹12,400.",
    icon: GraduationCap,
    color: "from-blue-500/10 to-blue-600/5 text-blue-600 border-blue-200/50"
  },
  {
    title: "Direct PSU Jobs",
    description: "Public Sector Undertakings (ONGC, IOCL, NTPC, GAIL, BARC) recruit directly through GATE scores for highly paid Grade-A officer roles.",
    icon: Briefcase,
    color: "from-emerald-500/10 to-emerald-600/5 text-emerald-600 border-emerald-200/50"
  },
  {
    title: "Research Fellowships",
    description: "Qualify for Junior Research Fellowship (JRF) in CSIR, DRDO, ISRO, and other national laboratories with competitive monthly grants.",
    icon: Award,
    color: "from-purple-500/10 to-purple-600/5 text-purple-600 border-purple-200/50"
  },
  {
    title: "Global Higher Education",
    description: "GATE scores are accepted for postgraduate studies at top foreign universities, including NUS & NTU in Singapore and TUM in Germany.",
    icon: Globe,
    color: "from-amber-500/10 to-amber-600/5 text-amber-600 border-amber-200/50"
  }
];

export default function GateCourses() {
  return (
    <main className="w-full relative z-10 pb-20 pt-4 lg:pb-24 max-w-[1200px] mx-auto px-6 flex flex-col gap-16 overflow-x-hidden">
      
      {/* Page Header */}
      <section className="text-center max-w-3xl mx-auto flex flex-col items-center gap-4 mt-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-[#1d4ed8] font-bold text-sm w-fit border border-blue-100 shadow-sm">
          <Sparkles size={14} className="animate-pulse" />
          GATE Coaching Center
        </div>
        <h1 className="text-[44px] md:text-[60px] font-[900] text-slate-900 leading-[1.1] tracking-tight">
          Explore Our <span className="text-[#1d4ed8]">GATE Streams</span>
        </h1>
        <p className="text-[17px] md:text-[18px] text-slate-500 leading-relaxed max-w-[650px] font-medium">
          MS Gate Academy offers professional coaching across 18 official GATE disciplines. Browse our curriculum details below.
        </p>
      </section>

      {/* Courses Zigzag Section */}
      <section className="w-full flex flex-col divide-y divide-slate-100">
        {gateCoursesData.map((course, index) => {
          const Icon = course.icon;
          const th = course.theme;
          const indexStr = String(index + 1).padStart(2, '0');
          const isEven = index % 2 === 0;

          return (
            <div
              key={course.code}
              className={`group flex flex-col lg:flex-row items-center gap-12 lg:gap-16 py-16 border-b border-slate-100 last:border-0 relative ${
                isEven ? '' : 'lg:flex-row-reverse'
              }`}
            >
              {/* Media Container (Video/Image) */}
              <div className="flex-1 w-full relative group/media">
                {/* Glow Background Ring */}
                <div className={`absolute -inset-4 bg-gradient-to-br from-transparent to-transparent opacity-0 group-hover/media:opacity-100 blur-2xl transition-all duration-700 rounded-[2.5rem] -z-10 ${th.bgGradientHover}`} />
                
                {/* Media frame */}
                <div className={`relative rounded-3xl overflow-hidden border border-slate-200/50 shadow-md hover:shadow-2xl transition-all duration-500 bg-white ${th.shadowHover}`}>
                  {course.video ? (
                    <video
                      src={course.video}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto max-h-[350px] object-cover transition-transform duration-700 group-hover/media:scale-[1.03]"
                    />
                  ) : (
                    <img
                      src={course.image}
                      alt={course.name}
                      className="w-full h-auto max-h-[350px] object-cover transition-transform duration-700 group-hover/media:scale-[1.03]"
                    />
                  )}
                  {/* Glowing Border on Hover */}
                  <div className={`absolute inset-0 rounded-3xl border-2 border-transparent transition-all duration-500 pointer-events-none ${th.mediaBorder}`} />
                </div>
              </div>

              {/* Text Details Container */}
              <div className="flex-1 flex flex-col items-start relative z-10">
                {/* Background Editorial Index Number */}
                <div className={`absolute -top-10 left-0 text-[120px] font-black text-slate-100/55 select-none pointer-events-none tracking-tighter leading-none -z-10 transition-colors duration-500 ${th.watermarkHover}`}>
                  {indexStr}
                </div>

                {/* Tag & Icon Row */}
                <div className="flex items-center gap-3.5 mb-5">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all duration-500 shadow-sm ${th.iconStyle}`}>
                    <Icon size={20} className="transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <span className={`text-[10px] font-black tracking-widest bg-white border px-3 py-1 rounded-full uppercase transition-all duration-500 ${th.tag}`}>
                    GATE {course.code}
                  </span>
                </div>

                {/* Department Title */}
                <h2 className="text-3xl md:text-4xl font-[900] text-slate-900 tracking-tight leading-tight mb-4">
                  {course.name}
                </h2>

                {/* Description */}
                <p className="text-[15.5px] text-slate-500 font-medium leading-relaxed mb-6 max-w-xl">
                  {course.desc}
                </p>

                {/* Key Study Highlights */}
                <div className="flex flex-wrap gap-2.5 mb-8">
                  {course.highlights.map((h, hIdx) => (
                    <span
                      key={hIdx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-[12.5px] font-bold shadow-sm"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${th.dotBg}`} />
                      {h}
                    </span>
                  ))}
                </div>

                {/* CTA Syllabus Button */}
                <Link
                  to={course.path}
                  className="w-full sm:w-fit py-3.5 px-7 rounded-2xl bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] hover:from-[#2a2a2a] hover:to-[#0a0a0a] text-white border border-[#2a2a2a] flex items-center justify-center gap-2 font-bold text-[13.5px] tracking-wide transition-all duration-300 shadow-md"
                >
                  <span>Explore Syllabus</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* Opportunities / Why GATE Section */}
      <section className="w-full flex flex-col gap-8 pt-10 border-t border-slate-100">
        
        {/* Section Header */}
        <div className="flex flex-col gap-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#1d4ed8] font-bold text-xs w-fit border border-blue-100 shadow-sm">
            <BookOpen size={14} />
            Career Prospects
          </div>
          <h2 className="text-[30px] md:text-[38px] font-[900] text-slate-900 leading-tight tracking-tight">
            Why Crack GATE? <span className="text-[#1d4ed8]">Infinite Pathways</span>
          </h2>
          <p className="text-slate-500 text-sm md:text-base font-medium">
            Cracking the Graduate Aptitude Test in Engineering unlocks top-tier professional, educational, and international opportunities.
          </p>
        </div>

        {/* Highlight Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {postGateOpportunities.map((op, index) => {
            const OpIcon = op.icon;
            return (
              <div 
                key={index} 
                className={`flex flex-col p-6 rounded-3xl border bg-gradient-to-b ${op.color} shadow-sm hover:scale-[1.01] transition-transform duration-300`}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100/50 flex items-center justify-center mb-4 shadow-sm flex-shrink-0">
                  <OpIcon size={18} />
                </div>
                <h3 className="text-slate-800 font-black text-[16px] mb-2 leading-tight">
                  {op.title}
                </h3>
                <p className="text-slate-500 text-[13px] font-medium leading-relaxed">
                  {op.description}
                </p>
              </div>
            );
          })}
        </div>

      </section>

    </main>
  );
}
