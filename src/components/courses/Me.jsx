import React from 'react';
import { Monitor, BookOpen, Clock, Target, CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";

const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Linear Algebra: Matrix algebra, systems of linear equations, eigen values and eigen vectors. Calculus: Functions of single variable, limit, continuity and differentiability, mean value theorems, indeterminate forms; evaluation of definite and improper integrals; double and triple integrals; partial derivatives, total derivative, Taylor series (in one and two variables), maxima and minima, Fourier series; gradient, divergence and curl, vector identities, directional derivatives, line, surface and volume integrals, applications of Gauss, Stokes and Green's theorems. Differential equations: First order equations (linear and nonlinear); higher order linear differential equations with constant coefficients; Euler-Cauchy equation; initial and boundary value problems; Laplace transforms; solutions of heat, wave and Laplace's equations. Complex variables: Analytic functions; Cauchy-Riemann equations; Cauchy's integral theorem and integral formula; Taylor and Laurent series. Probability and Statistics: Definitions of probability, sampling theorems, conditional probability; mean, median, mode and standard deviation; random variables, binomial, Poisson and normal distributions. Numerical Methods: Numerical solutions of linear and non-linear algebraic equations; integration by trapezoidal and Simpson's rules; single and multi-step methods for differential equations."
  },
  {
    section: "Section 2: Applied Mechanics and Design",
    topics: "Engineering Mechanics: Free-body diagrams and equilibrium; friction and its applications including rolling friction, belt-pulley, brakes, clutches, screw jack, wedge, vehicles, etc.; trusses and frames; virtual work; kinematics and dynamics of rigid bodies in plane motion; impulse and momentum (linear and angular) and energy formulations; Lagrange's equation. Mechanics of Materials: Stress and strain, elastic constants, Poisson's ratio; Mohr's circle for plane stress and plane strain; thin cylinders; shear force and bending moment diagrams; bending and shear stresses; concept of shear centre; deflection of beams; torsion of circular shafts; Euler's theory of columns; energy methods; thermal stresses; strain gauges and rosettes; testing of materials with universal testing machine; testing of hardness and impact strength. Theory of Machines: Displacement, velocity and acceleration analysis of plane mechanisms; dynamic analysis of linkages; cams; gears and gear trains; flywheels and governors; balancing of reciprocating and rotating masses; gyroscope. Vibrations: Free and forced vibration of single degree of freedom systems, effect of damping; vibration isolation; resonance; critical speeds of shafts. Machine Design: Design for static and dynamic loading; failure theories; fatigue strength and the S-N diagram; principles of the design of machine elements such as bolted, riveted and welded joints; shafts, gears, rolling and sliding contact bearings, brakes and clutches, springs."
  },
  {
    section: "Section 3: Fluid Mechanics and Thermal Sciences",
    topics: "Fluid Mechanics: Fluid properties; fluid statics, forces on submerged bodies, stability of floating bodies; control-volume analysis of mass, momentum and energy; fluid acceleration; differential equations of continuity and momentum; Bernoulli's equation; dimensional analysis; viscous flow of incompressible fluids, boundary layer, elementary turbulent flow, flow through pipes, head losses in pipes, bends and fittings; basics of compressible fluid flow. Heat-Transfer: Modes of heat transfer; one dimensional heat conduction, resistance concept and electrical analogy, heat transfer through fins; unsteady heat conduction, lumped parameter system, Heisler's charts; thermal boundary layer, dimensionless parameters in free and forced convective heat transfer, heat transfer correlations for flow over flat plates and through pipes, effect of turbulence; heat exchanger performance, LMTD and NTU methods; radiative heat transfer, Stefan-Boltzmann law, Wien's displacement law, black and grey surfaces, view factors, radiation network analysis. Thermodynamics: Thermodynamic systems and processes; properties of pure substances, behavior of ideal and real gases; zeroth and first laws of thermodynamics, calculation of work and heat in various processes; second law of thermodynamics; thermodynamic property charts and tables, availability and irreversibility; thermodynamic relations. Applications — Power Engineering: Air and gas compressors; vapour and gas power cycles, concepts of regeneration and reheat. I.C. Engines: Air-standard Otto, Diesel and dual cycles. Refrigeration and air-conditioning: Vapour and gas refrigeration and heat pump cycles; properties of moist air, psychrometric chart, basic psychrometric processes. Turbomachinery: Impulse and reaction principles, velocity diagrams, Pelton-wheel, Francis and Kaplan turbines; steam and gas turbines."
  },
  {
    section: "Section 4: Materials, Manufacturing and Industrial Engineering",
    topics: "Engineering Materials: Structure and properties of engineering materials, phase diagrams, heat treatment, stress-strain diagrams for engineering materials. Casting, Forming and Joining Processes: Different types of castings, design of patterns, moulds and cores; solidification and cooling; riser and gating design. Plastic deformation and yield criteria; fundamentals of hot and cold working processes; load estimation for bulk (forging, rolling, extrusion, drawing) and sheet (shearing, deep drawing, bending) metal forming processes; principles of powder metallurgy. Principles of welding, brazing, soldering and adhesive bonding. Machining and Machine Tool Operations: Mechanics of machining; basic machine tools; single and multi-point cutting tools, tool geometry and materials, tool life and wear; economics of machining; principles of non-traditional machining processes; principles of work holding, jigs and fixtures; abrasive machining processes; NC/CNC machines and CNC programming. Metrology and Inspection: Limits, fits and tolerances; linear and angular measurements; comparators; interferometry; form and finish measurement; alignment and testing methods; tolerance analysis in manufacturing and assembly; concepts of coordinate-measuring machine (CMM). Computer Integrated Manufacturing: Basic concepts of CAD/CAM and their integration tools; additive manufacturing. Production Planning and Control: Forecasting models, aggregate production planning, scheduling, materials requirement planning; lean manufacturing. Inventory Control: Deterministic models; safety stock inventory control systems. Operations Research: Linear programming, simplex method, transportation, assignment, network flow models, simple queuing models, PERT and CPM."
  }
];

export default function MeCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#1d4ed8]">Mechanical</span> Engineering (ME)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master applied mechanics, fluid dynamics, manufacturing, and thermodynamics with our specialized GATE ME program. Designed for top ranks.
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
            src="/Mech.mp4" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Mechanical Engineering</h1>
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
