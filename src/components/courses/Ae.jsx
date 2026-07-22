import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";


const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Core Topics: Linear Algebra: Vector algebra, matrix algebra, systems of linear equations, rank of a matrix; Eigenvalues and eigenvectors. Calculus: Functions of single variable, limits, continuity and differentiability, chain rule, maxima and minima, Integration; Functions of several variables, partial derivatives, gradient, divergence and curl, directional derivatives; Line, surface and volume integrals. Theorems of Stokes, Gauss and Green. Differential Equations: First order linear ordinary differential equations; Higher order linear ODEs with constant coefficients; Classification of partial differential equations; solution to: wave equation, Laplace equation, heat equation using separation of variables methods. Numerical Methods: Numerical solutions for linear and nonlinear algebraic equations by bisection, Newton-Raphson method; basic numerical differentiation; numerical integration by trapezoidal and Simpson’s rules; linear regression and least squares method; linear interpolation. Special Topics: Fourier series; complex numbers, analytic functions and Cauchy-Riemann equations. Basics of probability and statistics: Bayes theorem, mean, median, & mode; variance; binomial, normal and Poisson distribution."
  },
  {
    section: "Section 2: Flight Mechanics & Space Dynamics",
    topics: "Core Topics: Atmosphere: Properties of standard atmosphere. Classification of aircraft. Airplane (fixed wing aircraft) configuration and various parts; Pressure altitude; equivalent, calibrated, indicated air speeds; Primary flight instruments: Altimeter, air speed indicator, vertical speed indicator, turn-bank indicator. Aerodynamic forces and moments; angle of attack; sideslip; High-lift devices; roll, pitch & yaw controls. Airplane performance: CL-alpha curve, drag polar; take-off and landing; steady climb and descent; absolute and service ceiling; range and endurance, load factor, turning flight, V-n diagram. Winds: head, tail and cross winds. Static stability: stability and control derivatives; longitudinal stick fixed and free stability; horizontal tail position and size; directional stability, vertical tail position and size; lateral stability; wing dihedral, sweep & position; hinge moments, stick forces. Linear momentum and angular momentum balance for rigid bodies. Space Dynamics: central force motion, Keplerian orbits, Kepler’s laws; escape velocity. Special Topics: Equations of motion; Euler angles; decoupling of longitudinal and lateral-directional dynamics; longitudinal modes; lateral-directional modes, Hohmann orbital transfers."
  },
  {
    section: "Section 3: Aerodynamics",
    topics: "Core Topics: Basic fluid mechanics: fluid kinematics, streamline, streakline, pathline; conservation laws: mass, linear momentum and energy (integral and differential form); dimensional analysis and dynamic similarity; incompressibility conditions; Newtonian fluids. Elementary ideas of viscous flows: Hagen-Poiseulle flow, Couette flow, basic concepts in boundary layers, boundary layer thickness. Two-dimensional potential flow theory: sources, sinks, doublets, point vortex and their superposition, Bernoulli’s equation. Airfoils and wings: airfoil nomenclature; aerodynamic coefficients: lift, drag and moment; Kutta-Joukoswki theorem; thin airfoil theory, Kutta condition, starting vortex; finite wing theory: induced drag, Prandtl lifting line theory; critical and drag divergence Mach numbers. Compressible flows: basic concepts of compressibility, one-dimensional compressible flows, isentropic flows, normal and oblique shocks, Prandtl-Meyer flow; flow through nozzles and diffusers. Special Topics: Fanno flow; Rayleigh flow; pressure measurements using U-tube manometers and Pitot probe."
  },
  {
    section: "Section 4: Structures",
    topics: "Core Topics: Strength of materials: Stress and strain, stress-strain curves of steel and Aluminium; stresses and deflections in statically determinate and indeterminate linear elastic trusses, bars, beams, and shafts; two-dimensional transformations of stresses and strains, Mohr’s circle, principal stresses and strains; combined loading, failure criteria: maximum stress, Tresca, von Mises; strain energy; Castigliano’s principles; three-dimensional Hooke's law; plane stress and strain; Euler buckling of columns. Flight vehicle structures: torsion, bending and shear of open and closed thin-walled sections: symmetric and unsymmetric cross-sections; loads on aircraft. Structural Dynamics: free and forced vibrations of undamped and damped SDOF systems; free vibrations of undamped 2-DOF systems. Special Topics: Equilibrium and compatibility equations in two-dimensional elasticity."
  },
  {
    section: "Section 5: Propulsion",
    topics: "Core Topics: Basics of thermodynamics. Aerothermodynamics of aircraft engines: thrust, efficiency, range. Brayton cycle. Engine performance: ramjet, turbojet, turbofan, turboprop and turboshaft engines; after-burners. Aerothermodynamics of non-rotating propulsion components such as intakes, nozzles. Gas turbine combustor: types and configurations; combustion, stoichiometric fuel-to-air ratio. Turbomachinery: Axial compressors: angular momentum, work and compression, characteristic performance of a single axial compressor stage, efficiency of the compressor and degree of reaction, multi-staging; Centrifugal compressor: stage dynamics, inducer, impeller and diffuser; Axial turbines: stage performance. Rockets: thrust equation and specific impulse, rocket performance; multi-staging; chemical rockets; performance of solid and liquid propellant rockets. Special Topics: Turbine blade cooling, compressor-turbine matching."
  }
];

export default function AeCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#1d4ed8]">Aerospace</span> (AE)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master engineering mathematics, flight mechanics, space dynamics, aerodynamics, structural mechanics, and aircraft propulsion with our specialized GATE AE program. Designed for top ranks.
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
            src="/Aerospace_Engineering.mp4" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Aerospace Engineering</h1>
          <p className="mt-4 text-[16px] text-slate-500 max-w-[700px] mx-auto leading-relaxed">
            <strong className="text-slate-700">Important Note:</strong> In each subject, the topics are divided into Core Topics (~90% of questions) and Special Topics (~10% of questions).
          </p>
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
