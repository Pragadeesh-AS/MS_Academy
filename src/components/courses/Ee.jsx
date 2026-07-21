import React from 'react';
import { Monitor, BookOpen, Clock, Target, CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";
import eeHeroImg from '../../assets/cse.jpeg';

const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Linear Algebra: Matrix Algebra, Systems of linear equations, Eigen values, Eigen vectors. Calculus: Mean value theorems, Theorems of integral calculus, Evaluation of definite and improper integrals, Partial Derivatives, Maxima and minima, Multiple integrals, Fourier series, Vector identities, Directional derivatives, Line integral, Surface integral, Volume integral, Stokes's theorem, Gauss's theorem, Divergence theorem, Green's theorem. Differential equations: First order equations (linear and nonlinear), Higher order linear differential equations with constant coefficients, Method of variation of parameters, Cauchy's equation, Euler's equation, Initial and boundary value problems, Partial Differential Equations, Method of separation of variables. Complex variables: Analytic functions, Cauchy's integral theorem, Cauchy's integral formula, Taylor series, Laurent series, Residue theorem, Solution integrals. Probability and Statistics: Sampling theorems, Conditional probability, Mean, Median, Mode, Standard Deviation, Random variables, Discrete and Continuous distributions, Poisson distribution, Normal distribution, Binomial distribution, Correlation analysis, Regression analysis."
  },
  {
    section: "Section 2: Electric Circuits",
    topics: "Network elements: ideal voltage and current sources, dependent sources, R, L, C, M elements; Network solution methods: KCL, KVL, Node and Mesh analysis; Network Theorems: Thevenin's, Norton's, Superposition and Maximum Power Transfer theorem; Transient response of dc and ac networks, sinusoidal steady-state analysis, resonance, two port networks, balanced three phase circuits, star-delta transformation, complex power and power factor in ac circuits."
  },
  {
    section: "Section 3: Electromagnetic Fields",
    topics: "Coulomb's Law, Electric Field Intensity, Electric Flux Density, Gauss's Law, Divergence, Electric field and potential due to point, line, plane and spherical charge distributions, Effect of dielectric medium, Capacitance of simple configurations, Biot-Savart's law, Ampere's law, Curl, Faraday's law, Lorentz force, Inductance, Magnetomotive force, Reluctance, Magnetic circuits, Self and Mutual inductance of simple configurations."
  },
  {
    section: "Section 4: Signals and Systems",
    topics: "Representation of continuous and discrete time signals, shifting and scaling properties, linear time invariant and causal systems, Fourier series representation of continuous and discrete time periodic signals, sampling theorem, Applications of Fourier Transform for continuous and discrete time signals, Laplace Transform and Z transform. R.M.S. value, average value calculation for any general periodic waveform."
  },
  {
    section: "Section 5: Electrical Machines",
    topics: "Single phase transformer: equivalent circuit, phasor diagram, open circuit and short circuit tests, regulation and efficiency. Three-phase transformers: connections, vector groups, parallel operation; Auto-transformer, Electromechanical energy conversion principles. DC machines: separately excited, series and shunt, motoring and generating mode of operation and their characteristics, speed control of dc motors. Three-phase induction machines: principle of operation, types, performance, torque-speed characteristics, no-load and blocked-rotor tests, equivalent circuit, starting and speed control; Operating principle of single-phase induction motors. Synchronous machines: cylindrical and salient pole machines, performance and characteristics, regulation and parallel operation of generators, starting of synchronous motors; Types of losses and efficiency calculations of electric machines."
  },
  {
    section: "Section 6: Power Systems",
    topics: "Basic concepts of electrical power generation, ac and dc transmission concepts, Models and performance of transmission lines and cables, Economic Load Dispatch (with and without considering transmission losses), Series and shunt compensation, Electric field distribution and insulators, Distribution systems, Per-unit quantities, Bus admittance matrix, Gauss-Seidel and Newton-Raphson load flow methods, Voltage and Frequency control, Power factor correction, Symmetrical components, Symmetrical and unsymmetrical fault analysis, Principles of over-current, differential, directional and distance protection; Circuit breakers, System stability concepts, Equal area criterion."
  },
  {
    section: "Section 7: Control Systems",
    topics: "Mathematical modelling and representation of systems, Feedback principle, transfer function, Block diagrams and Signal flow graphs, Transient and Steady-state analysis of linear time invariant systems, Stability analysis using Routh-Hurwitz and Nyquist criteria, Bode plots, Root loci, Lag, Lead and Lead-Lag compensators; P, PI and PID controllers; State space model, Solution of state equations of LTI systems."
  },
  {
    section: "Section 8: Electrical and Electronic Measurements",
    topics: "Bridges and Potentiometers, Measurement of voltage, current, power, energy and power factor; Instrument transformers, Digital voltmeters and multi-meters, Phase, Time and Frequency measurement; Oscilloscopes, Error analysis."
  },
  {
    section: "Section 9: Analog and Digital Electronics",
    topics: "Simple diode circuits: clipping, clamping, rectifiers. Amplifiers: biasing, equivalent circuit and frequency response; oscillators and feedback amplifiers. Op-amp characteristics and applications; single stage active filters, Sallen Key, Butterworth, VCOs and timers, combinatorial and sequential logic circuits, multiplexers, demultiplexers, Schmitt triggers, sample and hold circuits, A/D and D/A converters."
  },
  {
    section: "Section 10: Power Electronics",
    topics: "Static V-I characteristics and firing/gating circuits for Thyristor, MOSFET, IGBT; DC to DC conversion: Buck, Boost and Buck-Boost Converters; Single and three-phase configuration of uncontrolled rectifiers; Voltage and Current commutated Thyristor based converters; Bidirectional ac to dc voltage source converters; Magnitude and Phase of line current harmonics for uncontrolled and thyristor based converters; Power factor and Distortion Factor of ac to dc converters; Single-phase and three-phase voltage and current source inverters, sinusoidal pulse width modulation."
  }
];

export default function EeCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#f36b2b]">Electrical</span> Engineering (EE)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master electric circuits, power systems, electrical machines, and control systems with our specialized GATE EE program. Designed for top ranks.
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
            src={eeHeroImg} 
            alt="EE GATE Coaching" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Electrical Engineering</h1>
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
