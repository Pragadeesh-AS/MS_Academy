import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";
import eceHeroImg from '../../assets/ece.png';

const syllabusData = [
  {
    section: "Section 1: Measurements and Error Analysis",
    topics: "Units and dimensions, dimensional analysis; least count, significant figures; Methods of measurement and error analysis for physical quantities associated with various measurements; 2-probe and 4-probe methods for resistance measurement; Grounding for electrical circuits, Ground loops; Design of DC power supply, Signal processing through lock-in amplifiers."
  },
  {
    section: "Section 2: Mathematical Physics",
    topics: "Linear vector spaces: basis, orthogonality and completeness; matrices: similarity transformations, diagonalization, eigenvalues and eigen vectors; linear differential equations: simple applications of first and second order linear differential equations and solutions; complex analysis: Cauchy-Riemann conditions, Cauchy's theorem, singularities, residue theorem and applications; Fourier analysis; tensors: tensor transformations, covariant and contravariant tensors."
  },
  {
    section: "Section 3: Classical Mechanics",
    topics: "D'Alembert's principle, Euler-Lagrange equation, Hamilton's principle, calculus of variations; symmetry and conservation laws; central force motion: Kepler problem; small oscillations: coupled oscillations and normal modes; rigid body dynamics: inertia tensor, orthogonal transformations, Euler angles, torque free motion of a symmetric top; Hamiltonian and Hamilton's equations of motion; canonical transformations: Poisson bracket. Special theory of relativity: Lorentz transformations, relativistic kinematics, mass-energy equivalence."
  },
  {
    section: "Section 4: Thermodynamics and Statistical Mechanics",
    topics: "Laws of thermodynamics; macrostates and microstates; phase space; ensembles; partition function, free energy, calculation of thermodynamic quantities; classical and quantum statistics; degenerate Fermi gas; black body radiation and Planck's distribution law; Bose-Einstein condensation; first and second order phase transitions, phase equilibria, critical phenomena."
  },
  {
    section: "Section 5: Electromagnetic theory",
    topics: "Solutions of electrostatic and magnetostatic problems including boundary value problems; method of images; separation of variables; dielectrics and conductors; magnetic materials; multipole expansion; Maxwell's equations; scalar and vector potentials; Coulomb and Lorentz gauges; electromagnetic waves in free space, non-conducting and conducting media; reflection and transmission at normal and oblique incidences; polarization of electromagnetic waves; Poynting vector, Poynting theorem, energy and momentum of electromagnetic waves."
  },
  {
    section: "Section 6: Optical Physics",
    topics: "Wave equation: plane and spherical waves, superposition of waves, standing waves, phase and group velocities; Interference: spatial and temporal coherence, dielectric films, Newton’s ring, multiple-beam interference, Michelson interferometer, Fabry-Perot interferometer and etalon; diffraction: Fresnel and Fraunhofer diffraction, rectangular and circular aperture, Rayleigh criterion of resolution, diffraction from double slit and many slits. dispersion by a grating; polarization: Jones vectors and matrices for linear, circular and elliptical polarization, birefringence, ray-transfer matrix for mirrors and lenses; lasers: Einstein coefficients, population inversion, two and three level laser systems."
  },
  {
    section: "Section 7: Quantum Mechanics",
    topics: "Basic ideas of quantum mechanics; uncertainty principle; linear vectors and operators in Hilbert space; time independent Schrodinger equation; one dimensional potentials: step potential, finite rectangular well, tunnelling from a potential barrier, particle in 1,2,3-dimensional box, particle in single and double delta function potentials, 1,2,3 dimensional harmonic oscillator: concept of degeneracy; central potentials; hydrogen-like atoms; orbital and spin angular momenta; addition of angular momenta; variational method, time independent perturbation theory; elementary scattering theory, Born approximation."
  },
  {
    section: "Section 8: Atomic and Molecular Physics",
    topics: "Spectra of one-and many-electron atoms; spin-orbit interaction: L-S and j-j coupling schemes; fine and hyperfine structures; Zeeman, Paschen-Back and Stark effects; electric dipole transitions and selection rules; rotational and vibrational spectra of diatomic molecules; electronic transitions in diatomic molecules, FranckCondon principle; Raman effect and basics of Raman spectroscopy; NMR, ESR, X-ray and Mossbauer spectroscopies."
  },
  {
    section: "Section 9: Solid State Physics",
    topics: "Elements of crystallography; diffraction methods for structure determination; bonding in solids; lattice vibrations and thermal properties of solids; free electron theory; band theory of solids: nearly free electron model; metals, semiconductors and insulators; conductivity, electron and hole statistics in intrinsic and extrinsic semiconductors, mobility and effective mass; metal-semiconductor junctions; ohmic and rectifying contacts; dielectric properties of solids; polarizability, ferroelectricity; magnetic properties of solids; dia, para, ferro, antiferro and ferri magnetism, ferromagnetic domains; superconductivity: type-I and type II superconductors, Meissner effect, London equation, BCS theory, flux quantization."
  },
  {
    section: "Section 10: Nuclear and Particle Physics",
    topics: "Nuclear binding energy, electric and magnetic moments; semi-empirical mass formula; nuclear models; liquid drop model, nuclear shell model; nuclear force and two nucleon problem; alpha decay, beta-decay, electromagnetic transitions in nuclei; Rutherford scattering, nuclear reactions, conservation laws; fission and fusion; particle accelerators and detectors; elementary particles; photons, baryons, mesons and leptons; quark model; conservation laws, isospin symmetry, charge conjugation, parity and time-reversal invariance."
  },
  {
    section: "Section 11: Electronics",
    topics: "p-n diodes, bipolar junction transistors, field effect transistors; negative and positive feedback circuits; oscillators, operational amplifiers and their applications, active filters; wave form generators: sine wave, square wave and triangular wave; basics of digital logic circuits, combinational and sequential circuits, flipflops, timers, counters, registers, A/D and D/A conversion."
  }
];

export default function PhCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#f36b2b]">Physics</span> (PH)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master classical and quantum mechanics, mathematical physics, thermodynamics, electromagnetism, optics, atomic and molecular physics, solid state physics, nuclear physics, and electronics with our specialized GATE PH program. Designed for top ranks.
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
            alt="PH GATE Coaching" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Physics</h1>
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
