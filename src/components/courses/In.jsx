import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";


const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Linear Algebra: Matrix algebra, systems of linear equations, consistency and rank, eigenvalues and eigenvectors, tensors. Calculus: Functions, limits, continuity; differentiation, differentiability, partial derivatives, maxima and minima, integration, multiple integrals, vector algebra, line, surface and volume integrals, Stokes, Gauss and Green’s theorems. Differential Equations: Ordinary differential equations, first order linear differential equations, second order linear differential equations with constant coefficients, method of variation of parameters, Cauchy’s and Euler’s equations, initial and boundary value problems, solution of partial differential equations: variable separable method. Analysis of Complex Variables: Analytic functions, Cauchy’s integral theorem and integral formula, Taylor’s and Laurent’s series, residue theorem, solution of integrals. Probability and Statistics: Random variables, discrete and continuous distributions: normal, Poisson and Binomial distributions. Sampling from distributions, conditional probability and Bayes' theorem, mean, median, mode, standard deviation and variance. Numerical Methods: Solution of matrix equations, solutions of non-linear algebraic equations, iterative methods for solving differential equations, numerical integration, regression and correlation analysis, backpropagation for neural networks."
  },
  {
    section: "Section 2: Electricity and Magnetism",
    topics: "Coulomb's law, electric field intensity, electric flux density, Gauss' law, electric field and potential due to point, line, plane and spherical charge distributions, effect of dielectric medium, permittivity, capacitance, magnetic field intensity, magnetic flux density, Biot‐Savart’s law, Ampere’s law, Faraday’s law, Lorentz force, permeability, self and mutual inductance, electrical and magnetic dipoles, electromagnetic induction, magnetomotive force, reluctance, magnetic circuits, B-H curve, Maxwell's equations: vector, differential and integral forms."
  },
  {
    section: "Section 3: Electrical Circuits and Machines",
    topics: "Electrical Circuits: Independent, dependent, ideal and practical sources; V-I characteristics of practical current and voltage sources, battery, solar cell, resistor, inductor, coupled inductor, capacitor; transient analysis of RC, RL, LC, RLC circuits; power and energy consumption, power rating of components, efficiency and losses. Kirchhoff’s laws, mesh and nodal analysis, star-delta transformation, superposition, Thevenin’s, Norton’s, Miller’s, maximum power transfer and reciprocity theorems. Peak, average and rms values of AC quantities; apparent, active and reactive powers, power factor; phasor analysis, impedance and admittance; series and parallel resonance, locus diagrams, realization of basic filters with R, L, and C elements; transient analysis of RLC circuits with AC excitation. Analysis of one-port and two-port networks with controlled voltage and current sources, driving point impedance and admittance, open and short circuit parameters. Electrical Machines: Single phase transformers, permanent magnet synchronous machines; buck and boost converters, rectifiers, single phase inverters; rotor position and speed sensing, current sensing, pulse width modulation (PWM) control."
  },
  {
    section: "Section 4: Signals and Systems",
    topics: "Periodic, aperiodic and impulse signals; sampling; Fourier series, Laplace, Fourier and z-transforms, DFT and FFT; continuous-time and discrete-time systems, transfer function, linear time invariant systems, impulse response, frequency response, pulse transfer function; convolution, correlation; basics of IIR and FIR filters."
  },
  {
    section: "Section 5: Control Systems",
    topics: "Feedback principles, role of sensing in feedback, signal flow graphs, transient response, steady state error, Bode plot, phase and gain margins, Routh and Nyquist criteria, root loci, state-space representation of systems; time-delay systems. Actuators for control system: control valves, servo valves, servo motors, stepper motors; on-off, P, PI, PID, cascade, feed forward, and ratio controllers, tuning of PID controllers; design of lead, lag and lead-lag compensators; basic concept of supervisory control, basics of distributed control system (DCS) and programmable logic controller (PLC)."
  },
  {
    section: "Section 6: Analog Electronics",
    topics: "Types of diode and their applications; BJT and MOSFET circuits, biasing, power dissipation, DC analysis, small signal analysis, frequency response of transistor circuits, feedback, amplifier design. Characteristics of ideal and practical operational amplifiers; applications of opamps: adder, subtractor, integrator, differentiator, difference amplifier, instrumentation amplifier, precision rectifier, active filters, comparators, Schmitt trigger, multivibrators, oscillators, signal generators, voltage-controlled oscillators and phase-locked loop. Sources and effects of noise and interference in electronic circuits; conductively, capacitively, inductively coupled interference; noise generated by electronic components, thermal noise, shot noise, flicker noise; shielding and grounding. Basic principles of component selection based on specifications, circuit board realization and testing."
  },
  {
    section: "Section 7: Digital Electronics",
    topics: "Basics of number systems. Combinational logic circuits, multiplexer and demultiplexer, truth table, minimization of Boolean functions; IC families: ECL, TTL and CMOS, CMOS implementation of logic gates; arithmetic circuits, sequential circuits, finite state machines, flipflops, shift registers, timers and counters. Analog front end: analog multiplexer, programmable gain amplifier, sample-and-hold circuit; analog-to-digital converters (ADC) (successive approximation, integrating, flash and sigma-delta) and digital-to-analog converters (DAC) (weighted R, R-2R ladder and current steering logic); characteristics and specifications of ADC and DAC (dynamic range, resolution, quantization, significant bits, conversion/settling time, INL, DNL, ENOB); embedded systems: common microprocessors and microcontrollers, memory and input-output interfacing, embedded systems programming; basics of data acquisition systems, virtual instrumentation, IoT; basic AI applications in instrumentation (sensor linearization, system calibration and tuning, signal classification)."
  },
  {
    section: "Section 8: Measurements",
    topics: "SI units, standards of basic electrical quantities (R, L, C, voltage, current and frequency), systematic and random errors in measurement, expression of uncertainty, accuracy and precision, propagation of errors, linear and weighted regression; bridges: Wheatstone, Kelvin, Maxwell, Anderson, Schering and Wien bridges for measurement of R, L, C and frequency, typical applications of bridges, Q-meter; megohm measurement; measurement of voltage, current and power in DC, single and three phase AC circuits; contact and noncontact type AC and DC current and voltage probes; true rms meters, voltage and current scaling, instrument transformers, timer/counter, time, phase and frequency measurements, digital voltmeter, digital multimeter, digital energy meter, digital storage oscilloscope, spectrum analyzer."
  },
  {
    section: "Section 9: Sensors and Industrial Instrumentation",
    topics: "Resistive, capacitive, inductive, piezoelectric, electromagnetic and Hall effect sensors and associated signal conditioning circuits; transducers for industrial instrumentation: displacement, velocity, acceleration (linear and angular), force, torque, vibration, shock, pressure (including low and high pressure), flow (variable head, variable area, electromagnetic, ultrasonic, turbine flowmeters), temperature (thermocouple, bolometer, 2, 3, 4 wire RTD, thermistor, pyrometer and semiconductor sensor), liquid level, pH, conductivity and viscosity measurement."
  },
  {
    section: "Section 10: Communication and Optical Instrumentation",
    topics: "Amplitude and frequency modulation and demodulation, pulse code modulation, frequency and time division multiplexing; amplitude, phase, frequency, quadrature amplitude, pulse shift keying for digital modulation and demodulation; functional architectures of transmitters and receivers; instrument and sensor networks, 4–20 mA two-wire transmitter. Optical sources and detectors: LED, laser, photo-diode, light dependent resistor, square law detectors and their characteristics; interferometer: applications in metrology; basics of fiber optic sensing. Near-infrared (NIR) sensing, Ultraviolet-Visible (UV-VIS) spectrophotometers, mass spectrometer."
  }
];

export default function InCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#1d4ed8]">Instrumentation</span> Engg (IN)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master sensors, control systems, industrial instrumentation, analog and digital electronics, and electrical measurements with our specialized GATE IN program. Designed for top ranks.
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
            src="/Instrumentation_Engineering.mp4" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Instrumentation Engineering</h1>
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
