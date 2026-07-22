import React from 'react';
import { Monitor, BookOpen, Clock, Target, CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";


const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Linear Algebra: Vector space, basis, linear dependence and independence, matrix algebra, Eigen values and eigen vectors, rank, solution of linear equations - existence and uniqueness. Calculus: Mean value theorems, theorems of integral calculus, evaluation of definite and improper integrals, partial derivatives, maxima and minima, multiple integrals, line, surface and volume integrals, Taylor series. Differential Equations: First order equations (linear and nonlinear), higher order linear differential equations, Cauchy's and Euler's equations, methods of solution using variation of parameters, complementary function and particular integral, partial differential equations, variable separable method, initial and boundary value problems. Vector Analysis: Vectors in plane and space, vector operations, gradient, divergence and curl, Gauss's, Green's and Stokes' theorems. Complex Analysis: Analytic functions, Cauchy's integral theorem, Cauchy's integral formula, sequences, series, convergence tests, Taylor and Laurent series, residue theorem. Probability and Statistics: Mean, median, mode, standard deviation, combinatorial probability, probability distributions, binomial distribution, Poisson distribution, exponential distribution, normal distribution, joint and conditional probability."
  },
  {
    section: "Section 2: Networks, Signals and Systems",
    topics: "Circuit analysis: nodal and mesh analysis, superposition, Thevenin's theorem, Norton's theorem, reciprocity. Sinusoidal steady state analysis: phasors, complex power, maximum power transfer. Time and frequency domain analysis of linear circuits: RL, RC and RLC circuits, solution of network equations using Laplace transform. Linear 2-port network parameters, wye-delta transformation. Continuous-time signals: Fourier series and Fourier transform, sampling theorem and applications. Discrete-time signals: DTFT, DFT, z-transform, discrete-time processing of continuous-time signals. LTI systems: definition and properties, causality, stability, impulse response, convolution, poles and zeroes, frequency response, group delay, phase delay."
  },
  {
    section: "Section 3: Electronic Devices",
    topics: "Energy bands in intrinsic and extrinsic semiconductors, equilibrium carrier concentration, direct and indirect band-gap semiconductors. Carrier transport: diffusion current, drift current, mobility and resistivity, generation and recombination of carriers, Poisson and continuity equations. P-N junction, Zener diode, BJT, MOS capacitor, MOSFET, LED, photo diode and solar cell."
  },
  {
    section: "Section 4: Analog Circuits",
    topics: "Diode circuits: clipping, clamping and rectifiers. BJT and MOSFET amplifiers: biasing, ac coupling, small signal analysis, frequency response. Current mirrors and differential amplifiers. Op-amp circuits: Amplifiers, summers, differentiators, integrators, active filters, Schmitt triggers and oscillators."
  },
  {
    section: "Section 5: Digital Circuits",
    topics: "Number representations: binary, integer and floating-point numbers. Combinatorial circuits: Boolean algebra, minimization of functions using Boolean identities and Karnaugh map, logic gates and their static CMOS implementations, arithmetic circuits, code converters, multiplexers, decoders. Sequential circuits: latches and flip-flops, counters, shift-registers, finite state machines, propagation delay, setup and hold time, critical path delay. Data converters: sample and hold circuits, ADCs and DACs. Semiconductor memories: ROM, SRAM, DRAM. Computer organization: Machine instructions and addressing modes, ALU, data-path and control unit, instruction pipelining."
  },
  {
    section: "Section 6: Control Systems",
    topics: "Basic control system components; Feedback principle; Transfer function; Block diagram representation; Signal flow graph; Transient and steady-state analysis of LTI systems; Frequency response; Routh-Hurwitz and Nyquist stability criteria; Bode and root-locus plots; Lag, lead and lag-lead compensation; State variable model and solution of state equation of LTI systems."
  },
  {
    section: "Section 7: Communications",
    topics: "Random processes: auto correlation and power spectral density, properties of white noise, filtering of random signals through LTI systems. Analog communications: modulation and demodulation, angle modulation and demodulation, spectra of AM and FM, super heterodyne receivers. Information theory: entropy, mutual information and channel capacity theorem. Digital communications: PCM, DPCM, digital modulation schemes (ASK, PSK, FSK, QAM), bandwidth, inter-symbol interference, MAP, ML detection, matched filter receiver, SNR and BER. Fundamentals of error correction, Hamming codes, CRC."
  },
  {
    section: "Section 8: Electromagnetics",
    topics: "Maxwell's equations: differential and integral forms and their interpretation, boundary conditions, wave equation, Poynting vector. Plane waves and properties: reflection and refraction, polarization, phase and group velocity, propagation through various media, skin depth. Transmission lines: equations, characteristic impedance, impedance matching, impedance transformation, S-parameters, Smith chart. Rectangular and circular waveguides, light propagation in optical fibers, dipole and monopole antennas, linear antenna arrays."
  }
];

export default function EceCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#1d4ed8]">Electronics</span> & Comm (ECE)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master electronic devices, analog/digital circuits, and communications with our specialized GATE ECE program. Designed for top ranks.
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
            src="/ECE.mp4" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Electronics & Communication Engineering</h1>
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
