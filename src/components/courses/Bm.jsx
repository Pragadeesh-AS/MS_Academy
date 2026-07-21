import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";
import eceHeroImg from '../../assets/ece.png';

const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Linear Algebra: Matrix algebra, systems of linear equations, Eigenvalues and Eigenvectors. Calculus: Mean value theorems, theorems of integral calculus, partial derivatives, maxima and minima, multiple integrals, Fourier series, vector identities, line, surface and volume integrals, Stokes, Gauss and Green's theorems. Differential equations: First order linear and nonlinear differential equations, higher order linear differential equations with constant coefficients, method of separation of variables, Cauchy's and Euler's equations, initial and boundary value problems, and solution of partial differential equations. Analysis of complex variables: Analytic functions, Cauchy's integral theorem and integral formula, Taylor's and Laurent's series, residue theorem. Probability and Statistics: Sampling theorems, conditional probability, mean, median, mode and standard deviation, random variables, discrete and continuous distributions: normal, Poisson and binomial distributions. Tests of Significance, statistical power analysis, and sample size estimation. Linear Regression and correlation analysis. Numerical Methods: Matrix inversion, numerical solutions of nonlinear algebraic equations, iterative methods for solving differential equations, numerical integration."
  },
  {
    section: "Section 2: Electrical Circuits",
    topics: "Voltage and current sources - independent, dependent, ideal and practical; v-i relationships of resistor, inductor and capacitor; transient analysis of RLC circuits with dc excitation; Kirchoff’s laws, superposition, Thevenin, Norton, maximum power transfer and reciprocity theorems; Peak, average and rms values of ac quantities; apparent, active and reactive powers; phasor analysis, impedance and admittance; series and parallel resonance, realization of basic filters with R, L and C elements, Bode plot."
  },
  {
    section: "Section 3: Signals and Systems",
    topics: "Continuous and Discrete Signal and Systems - Periodic, a periodic and impulse signals; Sampling theorem; Laplace and Fourier transforms; impulse response of systems; transfer function, frequency response of first and second order linear time invariant systems, convolution, correlation. Discrete time systems - impulse response, frequency response, DFT, Z - transform; basics of IIR and FIR filter."
  },
  {
    section: "Section 4: Analog and Digital Electronics",
    topics: "Basic characteristics and applications of diode, BJT and MOSFET; Characteristics and applications of operational amplifiers - difference amplifier, adder, subtractor, integrator, differentiator, instrumentation amplifier, buffer, filters and waveform generators. Number systems, Boolean algebra; combinational logic circuits - arithmetic circuits, comparators, Schmitt trigger, encoder/decoder, MUX/DEMUX, multi-vibrators; Principles of ADC and DAC; Microprocessor- architecture, interfacing memory and input- output devices."
  },
  {
    section: "Section 5: Measurements and Control Systems",
    topics: "SI units, systematic and random errors in measurement, expression of uncertainty - accuracy and precision index, propagation of errors; PMMC, MI and dynamometer type instruments; DC potentiometer; bridges for measurement of R, L and C, Q-meter. Basics of control system - transfer function."
  },
  {
    section: "Section 6: Sensors and Bioinstrumentation",
    topics: "Sensors - resistive, capacitive, inductive, piezoelectric, Hall effect, electro chemical, optical; Sensor signal conditioning circuits; application of LASER in sensing and therapy. Origin of bio potentials and their measurement techniques - ECG, EEG, EMG, ERG, EOG, GSR, PCG, Principles of measuring blood pressure, body temperature, volume and flow in arteries, veins and tissues, respiratory measurements and cardiac output measurement. Operating principle of medical equipment-sphygmomanometer, ventilator, cardiac pacemaker, defibrillator, pulse oximeter, hemodialyzer Electrical Isolation (optical and electrical), Safety and Regulatory Aspects of Biomedical Instruments."
  },
  {
    section: "Section 7: Mammalian Cell Biology, Human Anatomy and Physiology",
    topics: "Basics of cell, types of tissues and organ systems; Homeostasis; Basics of organ systems & their physiological aspects - musculoskeletal, respiratory, circulatory, excretory, endocrine, nervous, and gastro-intestinal systems."
  },
  {
    section: "Section 8: Medical Imaging Systems",
    topics: "Instrumentation and image formation techniques in medical imaging modalities such as X-Ray, Computed Tomography, Single Photon Emission Computed Tomography, Positron Emission Tomography, Magnetic Resonance Imaging, Ultrasound."
  },
  {
    section: "Section 9: Biomechanics",
    topics: "Kinematics of muscles and joints - free-body diagrams and equilibrium, forces and stresses in joints, biomechanical analysis of joints, Gait analysis; Hard Tissues - Definition of Stress and Strain, Structure and mechanical properties of bone - cortical and cancellous bones; Soft Tissues - Structure, functions, material properties."
  },
  {
    section: "Section 10: Biomaterials and Tissue Engineering",
    topics: "Basic properties of biomaterials - Metallic, Ceramic, Polymeric, Carbon-based and Composite materials; Fundamental characteristics of implants - biocompatibility, bioactivity, biodegradability; Basics of tissue engineering. Biomaterial characterization techniques - Atomic Force Microscopy, Electron Microscopy, Fourier Transform Infrared Spectroscopy; Scaffold fabrication techniques– Electrospinning, 3D Printing and Bioprinting; Artificial Organs; Organoid; Organ-on-chip."
  }
];

export default function BmCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#f36b2b]">Biomedical</span> Engg (BM)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master electrical circuits, bio-signals, analog and digital electronics, medical sensors, anatomy, medical imaging systems, and biomaterials with our specialized GATE BM program. Designed for top ranks.
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
            src={eceHeroImg} 
            alt="BM GATE Coaching" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Biomedical Engineering</h1>
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
