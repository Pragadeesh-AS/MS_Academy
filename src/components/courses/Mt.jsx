import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";


const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Linear Algebra: Matrices and determinants; systems of linear equations; eigenvalues and eigenvectors. Calculus: Limit, continuity and differentiability; partial derivatives; maxima and minima; sequences and series; test for convergence; Fourier series. Vector Calculus: Gradient, divergence and curl; line, surface and volume integrals; Gauss theorem. Differential Equations: Linear and non-linear first order ODEs; higher order linear ODEs with constant coefficients; Cauchy’s and Euler’s equations; PDEs – one dimensional heat and wave equations. Probability and Statistics: Definitions of probability; conditional probability; mean, median, mode and standard deviation; random variables; Poisson, normal and binomial distributions; analysis of experimental data; linear least squares method. Numerical Methods: Roots of linear and non-linear algebraic equations of single variable (bisection, secant, Newton- Raphson methods); numerical integration (trapezoidal rule) and differentiation (Taylor series expansion)."
  },
  {
    section: "Section 2: Metallurgical Thermodynamics",
    topics: "Laws of Thermodynamics: First law – energy conservation, Second law - entropy; enthalpy, Gibbs and Helmholtz free energy; Maxwell’s relations; chemical potential; applications to metallurgical systems; solutions, ideal and regular solutions; Gibbs phase rule, phase equilibria, binary phase diagram and lever rule; free-energy vs. composition diagrams; equilibrium constant, activity, Ellingham and phase stability diagrams. Electrochemistry: Single electrode potential; electrochemical cells; Nernst equation; potential-pH diagrams."
  },
  {
    section: "Section 3: Transport Phenomena and Rate Processes",
    topics: "Momentum Transfer: Concept of viscosity; shell balances; Bernoulli’s equation; mechanical energy balance equation; flow past plane surfaces and through pipes. Heat transfer: Conduction - Fourier’s Law, 1-D steady state conduction; convection; heat transfer coefficient and correlations; radiation; Stefan-Boltzmann Law; Kirchhoff’s Law. Mass Transfer: Diffusion and Fick’s laws, mass transfer coefficients and correlations. Dimensional Analysis: Significance of dimensionless numbers and their applications. Basic Laws of Chemical Kinetics: First order reactions; reaction rate constant; Arrhenius relation; heterogeneous reactions; oxidation kinetics. Electrochemical Kinetics: Polarization."
  },
  {
    section: "Section 4: Mineral Processing and Extractive Metallurgy",
    topics: "Comminution; Size classification; Flotation, Gravity, magnetic and electrostatic separation methods of mineral beneficiation. Principles of pyro, hydro and electro metallurgy; unit processes for extraction of non-ferrous metals – aluminium, copper, titanium, zinc, and associated heat and material balance. Ironmaking: Thermodynamics of blast furnace ironmaking; heat and material balance in blast furnace; production of sinter, pellets, metallurgical coke and testing, alternative routes of iron making (rotary kiln, MIDREX, COREX). Primary Steel Making: Structure and properties of slags; thermodynamics and kinetics of steelmaking; basic oxygen furnace and electric arc furnace steel making. Secondary Steel Making: Ladle process – deoxidation, degassing, argon stirring, desulphurization, inclusion shape control; basics of stainless steel manufacturing. Continuous Casting: Basics of continuous casting, casting defects, thin slab casting."
  },
  {
    section: "Section 5: Physical Metallurgy",
    topics: "Materials Characterisation: X-ray Diffraction-Bragg’s law; optical microscopy; imaging and spectroscopy in SEM. Crystal Imperfections: Point, line and surface defects; coherent, semi-coherent and incoherent interfaces. Diffusion in Solids: Atomic models for interstitial and substitutional diffusion; volume, surface and grain boundary diffusion, Kirkendall effect; uphill diffusion. Phase Transformation: Driving force; homogeneous and heterogeneous nucleation; growth kinetics; solidification in isomorphous, eutectic and peritectic systems; cast structures and macrosegregation; dendritic solidification and constitutional supercooling; coring and microsegregation. Solid-state Transformations: Precipitation; eutectoid transformation, diffusionless transformations; precipitate coarsening, Gibbs-Thomson effect; glass transition in ceramics and polymers. Principles of heat treatment: Heat treatment of steels; time-temperature-transformation (TTT) and continuous cooling transformation (CCT) diagrams; surface hardening; recovery, recrystallization and grain growth; heat treatment of cast irons and aluminium alloys. Corrosion: Basic forms of corrosion and its prevention."
  },
  {
    section: "Section 6: Mechanical Behaviour of Materials",
    topics: "Elasticity; strain tensor and stress tensor; representation by Mohr’s circle; uniaxial tensile testing and stress-strain curves for metals, ceramics, and polymers; Tresca and von Mises yield criteria; plastic deformation by slip and twinning. Dislocation Theory: Edge, screw and mixed dislocations; sources and multiplication of dislocations; stress fields around dislocations; partial dislocations; dislocation interactions and reactions. Strengthening Mechanisms: Work/strain hardening, strengthening due to grain boundaries, solid solution, precipitation and dispersion. Fracture behaviour: Griffith theory; linear elastic fracture mechanics; fracture toughness; fractography; ductile to brittle transition; toughening mechanisms in ceramics. Fatigue: Low and high cycle fatigue; crack growth. High Temperature deformation: Mechanisms of high temperature deformation and failure; creep and stress rupture, stress exponent and activation energy."
  },
  {
    section: "Section 7: Manufacturing Processes",
    topics: "Metal Casting: Mould design involving feeding, gating and risering, casting practices, casting defects. Hot, Warm and Cold Working of Metals: Metal forming – fundamentals of metal forming processes of rolling, forging, extrusion, wire drawing and sheet metal forming; defects in forming. Metal Joining: Principles of soldering, brazing and welding; welding metallurgy, defects in welded joints in steels and aluminium alloys. Powder Metallurgy: Production of powders, compaction and sintering. Non-destructive Testing (NDT): Dye-penetrant, ultrasonic, radiography, eddy current, acoustic emission and magnetic particle inspection methods."
  },
  {
    section: "Section 8: Materials Science and Non-Metallic Materials",
    topics: "Classification of engineering materials; chemical bonding- ionic, covalent, metallic and secondary bonding in materials; Structure of metals and alloys, ionic and covalent bonded solids and polymers. Polymers: Molecular weight; thermoplastics and thermosets; copolymers; crystallinity of polymers. Ceramics: Radius ratio and electroneutrality rules for determining crystal structure; Schottky and Frenkel defects, non-stoichiometric defects. Composites: Types of reinforcements and matrices; enhancement in modulus and strength; isostrain and isostress loading conditions. Electronic Properties: Band gap; Fermi energy; conductors, semiconductors and insulators. Magnetic properties: Magnetization and B-H curves, principles of ferro-, ferri-, antiferro-, para- and diamagnetism."
  }
];

export default function MtCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#1d4ed8]">Metallurgical</span> (MT)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master thermodynamics, transport phenomena, physical metallurgy, mechanical behavior, extractive metallurgy, manufacturing processes, and materials science with our specialized GATE MT program. Designed for top ranks.
          </p>
          <div className="flex gap-4">
            <ShinyButton className="px-8 py-4 text-[17px] font-semibold text-white rounded-xl bg-gradient-to-b from-[#4a4a4a] via-[#2a2a2a] to-[#111111] shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-[1.02] transition-transform border border-[#333333]">
              Enroll Now
            </ShinyButton>
            <button className="px-8 py-4 text-[17px] font-semibold text-slate-700 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
              Download Syllabus
            </button>
          </div>
        </div>

        {/* Right Side: Video */}
        <div className="flex-1 w-full max-w-[650px] flex justify-center items-center lg:pl-10">
          <video 
            src="/Metallurgical_Engineering.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-auto rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-100/60 hover:scale-[1.01] transition-transform duration-500"
          />
        </div>

      </section>

      {/* Detailed Syllabus Section */}
      <section className="w-full max-w-[1000px] mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-[14px] md:text-[16px] font-bold text-[#1d4ed8] tracking-widest uppercase mb-3">Complete Syllabus</h2>
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Metallurgical Engineering</h1>
        </div>
        
        <div className="flex flex-col gap-6">
          {syllabusData.map((item, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex-shrink-0">
                  <CheckCircle2 className="text-[#1d4ed8] group-hover:scale-110 transition-transform" size={24} />
                </div>
                <div>
                  <h3 className="text-[20px] md:text-[22px] font-bold text-slate-900 mb-3">{item.section}</h3>
                  <p className="text-[16px] text-slate-600 leading-relaxed font-medium">
                    {item.topics}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
