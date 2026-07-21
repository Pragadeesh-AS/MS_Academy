import React from 'react';
import { Monitor, BookOpen, Clock, Target, CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";
import ceHeroImg from '../../assets/cse.jpeg';

const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Linear Algebra: Matrix algebra; Systems of linear equations; Eigen values and Eigen vectors. Calculus: Functions of single variable; Limit, continuity and differentiability; Mean value theorems, local maxima and minima; Taylor series; Evaluation of definite and indefinite integrals, application of definite integral to obtain area and volume; Partial derivatives; Total derivative; Gradient, Divergence and Curl, Vector identities; Directional derivatives; Line, Surface and Volume integrals. Ordinary Differential Equation (ODE): First order (linear and non-linear) equations; higher order linear equations with constant coefficients; Euler-Cauchy equations; initial and boundary value problems. Partial Differential Equation (PDE): Fourier series; separation of variables; solutions of one-dimensional diffusion equation; first and second order one-dimensional wave equation and two-dimensional Laplace equation. Probability and Statistics: Sampling theorems; Conditional probability; Descriptive statistics – Mean, median, mode and standard deviation; Random Variables – Discrete and Continuous, Poisson and Normal Distribution; Linear regression. Numerical Methods: Error analysis. Numerical solutions of linear and non-linear algebraic equations; Newton's and Lagrange polynomials; numerical differentiation; Integration by trapezoidal and Simpson's rule; Single and multi-step methods for first order differential equations."
  },
  {
    section: "Section 2: Structural Engineering",
    topics: "Engineering Mechanics: System of forces, free-body diagrams, equilibrium equations; Internal forces in structures; Frictions and its applications; Centre of mass; Free Vibrations of undamped SDOF system. Solid Mechanics: Bending moment and shear force in statically determinate beams; Simple stress and strain relationships; Simple bending theory, flexural and shear stresses, shear centre; Uniform torsion, Transformation of stress; buckling of column, combined and direct bending stresses. Structural Analysis: Statically determinate and indeterminate structures by force/energy methods; Method of superposition; Analysis of trusses, arches, beams, cables and frames; Displacement methods: Slope deflection and moment distribution methods; Influence lines; Stiffness and flexibility methods of structural analysis. Construction Materials and Management: Structural Steel – Composition, material properties and behaviour; Concrete - Constituents, mix design, short-term and long-term properties. Construction Management: Types of construction projects; Project planning and network analysis - PERT and CPM; Cost estimation. Concrete Structures: Working stress and Limit state design concepts; Design of beams, slabs, columns; Bond and development length; Prestressed concrete beams. Steel Structures: Working stress and Limit state design concepts; Design of tension and compression members, beams and beam-columns, column bases; Connections - simple and eccentric, beam-column connections, plate girders and trusses; Concept of plastic analysis - beams and frames."
  },
  {
    section: "Section 3: Geotechnical Engineering",
    topics: "Soil Mechanics: Three-phase system and phase relationships, index properties; Unified and Indian standard soil classification system; Permeability - one dimensional flow, Seepage through soils – two-dimensional flow, flow nets, uplift pressure, piping, capillarity, seepage force; Principle of effective stress and quicksand condition; Compaction of soils; One-dimensional consolidation, time rate of consolidation; Shear Strength, Mohr's circle, effective and total shear strength parameters, Stress-Strain characteristics of clays and sand; Stress paths. Foundation Engineering: Sub-surface investigations - Drilling bore holes, sampling, plate load test, standard penetration and cone penetration tests; Earth pressure theories - Rankine and Coulomb; Stability of slopes – Finite and infinite slopes, Bishop's method; Stress distribution in soils – Boussinesq's theory; Pressure bulbs, Shallow foundations – Terzaghi's and Meyerhoff's bearing capacity theories, effect of water table; Combined footing and raft foundation; Contact pressure; Settlement analysis in sands and clays; Deep foundations – dynamic and static formulae, Axial load capacity of piles in sands and clays, pile load test, pile under lateral loading, pile group efficiency, negative skin friction."
  },
  {
    section: "Section 4: Water Resources Engineering",
    topics: "Fluid Mechanics: Properties of fluids, fluid statics; Continuity, momentum and energy equations and their applications; Potential flow, Laminar and turbulent flow; Flow in pipes, pipe networks; Concept of boundary layer and its growth; Concept of lift and drag. Hydraulics: Forces on immersed bodies; Flow measurement in channels and pipes; Dimensional analysis and hydraulic similitude; Channel Hydraulics - Energy-depth relationships, specific energy, critical flow, hydraulic jump, uniform flow, gradually varied flow and water surface profiles. Hydrology: Hydrologic cycle, precipitation, evaporation, evapo-transpiration, watershed, infiltration, unit hydrographs, hydrograph analysis, reservoir capacity, flood estimation and routing, surface run-off models, ground water hydrology - steady state well hydraulics and aquifers; Application of Darcy's Law. Irrigation: Types of irrigation systems and methods; Crop water requirements - Duty, delta, evapo-transpiration; Gravity Dams and Spillways; Lined and unlined canals, Design of weirs on permeable foundation; cross drainage structures."
  },
  {
    section: "Section 5: Environmental Engineering",
    topics: "Water and Waste Water Quality and Treatment: Basics of water quality standards – Physical, chemical and biological parameters; Water quality index; Unit processes and operations; Water requirement; Water distribution system; Drinking water treatment. Sewerage system design, quantity of domestic wastewater, primary and secondary treatment. Effluent discharge standards; Sludge disposal; Reuse of treated sewage for different applications. Air Pollution: Types of pollutants, their sources and impacts, air pollution control, air quality standards, Air quality Index and limits. Municipal Solid Wastes: Characteristics, generation, collection and transportation of solid wastes, engineered systems for solid waste management (reuse/recycle, energy recovery, treatment and disposal)."
  },
  {
    section: "Section 6: Transportation Engineering",
    topics: "Transportation Infrastructure: Geometric design of highways - cross-sectional elements, sight distances, horizontal and vertical alignments. Geometric design of railway Track – Speed and Cant. Concept of airport runway length, calculations and corrections; taxiway and exit taxiway design. Highway Pavements: Highway materials - desirable properties and tests; Desirable properties of bituminous paving mixes; Design factors for flexible and rigid pavements; Design of flexible and rigid pavement using IRC codes. Traffic Engineering: Traffic studies on flow and speed, peak hour factor, accident study, statistical analysis of traffic data; Microscopic and macroscopic parameters of traffic flow, fundamental relationships; Traffic signs; Signal design by Webster's method; Types of intersections; Highway capacity."
  },
  {
    section: "Section 7: Geomatics Engineering",
    topics: "Principles of surveying; Errors and their adjustment; Maps - scale, coordinate system; Distance and angle measurement - Levelling and trigonometric levelling; Traversing and triangulation survey; Total station; Horizontal and vertical curves. Photogrammetry and Remote Sensing - Scale, flying height; Basics of remote sensing and GIS."
  }
];

export default function CeCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#f36b2b]">Civil</span> Engineering (CE)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master structural engineering, geotechnics, environmental engineering, and more with our specialized GATE CE program. Designed for top ranks.
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

        {/* Right Side: Image */}
        <div className="flex-1 w-full max-w-[650px] flex justify-center items-center lg:pl-10">
          <img 
            src={ceHeroImg} 
            alt="CE GATE Coaching" 
            className="w-full h-auto object-contain mix-blend-multiply hover:scale-105 transition-transform duration-700"
            style={{ 
              WebkitMaskImage: 'radial-gradient(circle at center, black 50%, transparent 100%)',
              maskImage: 'radial-gradient(circle at center, black 50%, transparent 100%)'
            }}
          />
        </div>

      </section>

      {/* Detailed Syllabus Section */}
      <section className="w-full max-w-[1000px] mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-[14px] md:text-[16px] font-bold text-[#f36b2b] tracking-widest uppercase mb-3">Complete Syllabus</h2>
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Civil Engineering</h1>
        </div>
        
        <div className="flex flex-col gap-6">
          {syllabusData.map((item, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex-shrink-0">
                  <CheckCircle2 className="text-[#f36b2b] group-hover:scale-110 transition-transform" size={24} />
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
