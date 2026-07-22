import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";


const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Linear Algebra: Matrix algebra; Systems of linear equations; Eigenvalues and eigenvectors. Calculus: Functions of single variable; Limit, continuity and differentiability; Taylor series; Mean value theorem; Evaluation of definite and improper integrals; Partial derivatives; Total derivative; Maxima and minima; Gradient, divergence, and curl; Vector identities; Directional derivatives; Line, surface, and volume integrals; Stokes, Gauss, and Green’s theorems. Differential Equations: First order equations (linear and nonlinear); Higher order linear differential equations with constant coefficients; Cauchy’s and Euler’s equations; Initial and boundary value problems; Laplace transforms; Solutions of one-dimensional heat equation, wave equation, and Laplace equation. Complex Variables: Complex number; polar form of complex number. Probability and Statistics: Definitions of probability and sampling theorems; Conditional probability; Mean, median, mode, and standard deviation; Random variables; Poisson, Normal, and Binomial distributions. Fundamentals of AI/ML: Linear Regression; Principal Component Analysis (PCA). Numerical Methods: Numerical solutions of linear and non-linear algebraic equations; Integration by trapezoidal and Simpson’s rule; Single and multi-step methods for numerical solution of ordinary differential equations; Finite-difference method for partial differential equations."
  },
  {
    section: "Section 2: Process Calculations",
    topics: "Steady and unsteady state mass and energy balances including multiphase, multi-component, reacting and non-reacting systems; Use of tie components; Recycle, bypass and purge calculations; Gibbs phase rule and degree of freedom analysis."
  },
  {
    section: "Section 3: Thermodynamics",
    topics: "Laws of thermodynamics; Open and closed systems; Entropy and chemical potential; Thermodynamic properties of pure substances: equations of state and residual properties; Thermodynamic properties of mixtures: partial molar properties, fugacity, excess properties, and activity coefficients; Phase equilibria: predicting VLE of systems; Chemical reaction equilibrium."
  },
  {
    section: "Section 4: Fluid Mechanics and Mechanical Operations",
    topics: "Newtonian and non-Newtonian fluids; Fluid statics; Surface Tension; Fluid kinematics; Equation of continuity, Equation of motion, Equation of mechanical energy; Macroscopic friction factors; Dimensional analysis and similitude; Inviscid flows: Euler equation; Flow through pipes: velocity profile, pressure drop, Bernoulli equation, flow meters; Pumps; Turbulent flow: fluctuating velocity, universal velocity profile, pressure drop; Elementary boundary layer theory; Flow past immersed bodies including packed and fluidized beds. Particle size and shape; Particle size distribution; Size reduction and classification of solid particles; Free and hindered settling; Centrifuge and cyclones; Thickening and clarification; Filtration, agitation and mixing."
  },
  {
    section: "Section 5: Heat Transfer",
    topics: "Equation of energy; Steady and unsteady heat conduction, convection, and radiation; Thermal boundary layer and heat transfer coefficients; Boiling, condensation, and evaporation; Types of heat exchangers and evaporators and their process calculations; Design of double pipe, shell and tube heat exchangers, and single and multiple effect evaporators."
  },
  {
    section: "Section 6: Mass Transfer",
    topics: "Fick’s laws; Molecular diffusion in fluids; Mass transfer coefficients; Film, penetration and surface renewal theories; Momentum, heat and mass transfer analogies; Stage-wise and continuous contacting and stage efficiencies; HTU & NTU concepts. Fundamentals concepts and design of mass transfer operations: distillation, absorption, leaching, liquid-liquid extraction, drying, humidification, dehumidification and adsorption, membrane separations."
  },
  {
    section: "Section 7: Chemical Reaction Engineering",
    topics: "Theories of reaction rates; Kinetics of homogeneous reactions; Interpretation of kinetic data; Single and multiple reactions in ideal reactors; Kinetics of enzyme reactions (Michaelis-Menten and Monod models); Non-ideal reactors: residence time distribution, single parameter model; Non-isothermal reactors; Kinetics of heterogeneous catalytic reactions; Diffusion effects in catalysis; Catalyst deactivation."
  },
  {
    section: "Section 8: Instrumentation and Process Control",
    topics: "Measurement of process variables; Sensors and transducers; P&ID equipment symbols; Process modeling and linearization; State-space models; Transfer functions and dynamic responses of various systems; Systems with inverse response; Process reaction curve; Controller modes (P, PI, and PID); Control valves; Analysis of closed loop systems including stability, frequency response, controller tuning, cascade and feed forward control."
  },
  {
    section: "Section 9: Plant Design and Economics",
    topics: "Principles of process economics and cost estimation including depreciation and total annualized cost, cost indices, rate of return, payback period, discounted cash flow; Optimization in process design and sizing of chemical engineering equipment such as heat exchangers and multistage contactors; Batch plant scheduling."
  },
  {
    section: "Section 10: Chemical Technology",
    topics: "Overview of raw materials, unit operations, and processes involved in inorganic chemical industries (synthesis gas, sulfuric acid, phosphoric acid, chlor-alkali industry), fertilizers (ammonia, urea), natural products industries (pulp and paper, sugar and ethanol), petroleum refining and petrochemicals (ethyl benzene, styrene, ethylene oxide), polymerization industries (polyethylene and polyester)."
  }
];

export default function ChCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#1d4ed8]">Chemical</span> Engg (CH)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master process calculations, thermodynamics, fluid mechanics, heat and mass transfer, reaction engineering, and process control with our specialized GATE CH program. Designed for top ranks.
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
            src="/Chemical_Engineering.mp4" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Chemical Engineering</h1>
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
