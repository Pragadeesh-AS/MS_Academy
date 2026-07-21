import React from 'react';
import { Monitor, BookOpen, Clock, Target, CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";
import piHeroImg from '../../assets/cse.jpeg';

const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Linear Algebra: Matrix algebra, Systems of linear equations, Eigen values and Eigen vectors. Calculus: Functions of single variable, Limit, continuity and differentiability, Mean value theorems, Evaluation of definite and improper integrals, Partial derivatives, Total derivative, Maxima and minima, Gradient, Divergence and Curl, Vector identities, Directional derivatives; Line, Surface and Volume integrals; Stokes, Gauss and Green's theorems. Differential Equations: First order equations (linear and nonlinear), Higher order linear differential equations with constant coefficients, Cauchy's and Euler's equations, Initial and boundary value problems, Laplace transforms. Complex variables: Analytic functions; Cauchy-Riemann equations; Cauchy's integral theorem and integral formula; Taylor and Laurent series. Probability and Statistics: Definitions of probability and sampling theorems, Conditional probability, Mean, median, mode and standard deviation, Linear regression, Random variables, Poisson, normal, binomial and exponential distributions. Numerical Methods: Numerical solutions of linear and nonlinear algebraic equations; Integration by trapezoidal and Simpson's rules; Single and multi-step methods for differential equations."
  },
  {
    section: "Section 2: General Engineering",
    topics: "Engineering Materials: Structure, physical and mechanical properties, and applications of common engineering materials (metals and alloys, semiconductors, ceramics, polymers, and composites – metal, polymer and ceramic based); Iron-carbon equilibrium phase diagram; Heat treatment of metals and alloys and its influence on mechanical properties; Stress-strain behavior of metals and alloys. Applied Mechanics: Engineering mechanics – equivalent force systems, free body concepts, equations of equilibrium; Trusses; Strength of materials – stress, strain and their relationship; Failure theories; Mohr's circle (stress); Deflection of beams, bending and shear stresses; Euler's theory of columns; Thick and thin cylinders; Torsion. Theory of Machines and Design: Analysis of planar mechanisms, cams and followers; Governors and fly wheels; Design of bolted, riveted and welded joints; Interference/shrink fit joints; Friction and lubrication; Design of shafts, keys, couplings, spur gears, belt drives, brakes and clutches; Pressure vessels. Thermal and Fluids Engineering: Fluid mechanics – fluid statics, Bernoulli's equation, flow through pipes, laminar and turbulent flows, equations of continuity and momentum, capillary action; Dimensional analysis; Thermodynamics – zeroth, first and second laws of thermodynamics, thermodynamic systems and processes, calculation of work and heat for systems and control volumes; Air standard cycles; Heat transfer – basic applications of conduction, convection and radiation."
  },
  {
    section: "Section 3: Manufacturing Processes I",
    topics: "Casting: Types of casting processes and applications; Sand casting: patterns – types, materials and allowances; molds and cores – materials, making, and testing; design of gating system and riser; casting techniques of cast iron, steels, and nonferrous metals and alloys; analysis of solidification and microstructure development; Other casting techniques: Pressure die casting, Centrifugal casting, Investment casting, Shell mold casting; Casting defects and their inspection by non-destructive testing. Metal Forming: Stress-strain relations in elastic and plastic deformation; von Mises and Tresca yield criteria, Concept of flow stress; Hot, warm and cold working; Bulk forming processes – forging, rolling, extrusion and wire drawing; Sheet metal working processes – blanking, punching, bending, stretch forming, spinning and deep drawing; Ideal work and slab analysis; Defects in metal working and their causes. Joining of Materials: Classification of joining processes; Principles of fusion welding processes using different heat sources (flame, arc, resistance, laser, electron beam); Arc welding processes - SMAW, GMAW, GTAW, plasma arc, submerged arc welding; Principles of solid state welding - friction welding, friction stir welding, ultrasonic welding; Welding defects - causes and inspection; Principles of adhesive joining, brazing and soldering. Powder Processing: Production of metal/ceramic powders, compaction and sintering, Cold and hot isostatic pressing. Polymers and Composites: Polymer processing – injection, compression and blow molding, extrusion, calendaring and thermoforming; Molding of composites."
  },
  {
    section: "Section 4: Manufacturing Processes II",
    topics: "Machining: Orthogonal and oblique machining, Single point cutting tool and tool signature, Chip formation, cutting forces, Merchant's analysis, Specific cutting energy and power; Machining parameters and material removal rate; tool materials, Tool wear and tool life; Thermal aspects of machining, cutting fluids, machinability; Economics of machining; Machining processes - turning, taper turning, thread cutting, drilling, boring, milling, gear cutting, thread production; Finishing processes – grinding, honing, lapping and super-finishing. Machine Tools: Lathe, milling, drilling and shaping machines – construction and kinematics; Jigs and fixtures – principles, applications, and design. Advanced Manufacturing: Principles and applications of USM, AJM, WJM, AWJM, EDM and Wire EDM, LBM, EBM, PAM, CHM, ECM; Effect of process parameters on material removal rate, surface roughness and power consumption; Additive manufacturing techniques. Computer Integrated Manufacturing: Basic concepts of CAD and CAM, Geometric modeling, CNC; Automation in Manufacturing; Industrial Robots – configurations, drives and controls; Cellular manufacturing and FMS - Group Technology, CAPP."
  },
  {
    section: "Section 5: Quality and Reliability",
    topics: "Metrology and Inspection: Accuracy and precision; Types of errors; Limits, fits and tolerances; Gauge design, Interchangeability, Selective assembly; Linear, angular, and form measurements by mechanical and optical methods; Inspection of screw threads and gears; Surface roughness measurement by contact and non-contact methods. Quality Management: Quality – concept and costs; Statistical quality control – process capability analysis, control charts for variables and attributes and acceptance sampling; Six sigma; Total quality management; Quality assurance and certification - ISO 9000, ISO 14000. Reliability and Maintenance: Reliability, availability and maintainability; Distribution of failure and repair times; Determination of MTBF and MTTR, Reliability models; Determination of system reliability; Preventive and predictive maintenance and replacement, Total productive maintenance."
  },
  {
    section: "Section 6: Industrial Engineering",
    topics: "Product Design and Development: Principles of product design, tolerance design; Quality and cost considerations; Product life cycle; Standardization, simplification, diversification; Value engineering and analysis; Concurrent engineering; Design for X. Work System Design: Taylor's scientific management, Gilbreths's contributions; Productivity – concepts and measurements; Method study, Micro-motion study, Principles of motion economy; Work measurement – time study, Work sampling, Standard data, PMTS; Ergonomics; Job evaluation and merit rating. Facility Design: Facility location factors and evaluation of alternate locations; Types of plant layout and their evaluation; Computer aided layout design techniques; Assembly line balancing; Materials handling systems."
  },
  {
    section: "Section 7: Operations Research and Operations Management",
    topics: "Operation Research: Linear programming – problem formulation, simplex method, duality and sensitivity analysis; Transportation and assignment models; Integer programming; Constrained and unconstrained nonlinear optimization; Markovian queuing models; Simulation – manufacturing applications. Engineering Economy and Costing: Elementary cost accounting and methods of depreciation; Break-even analysis; Techniques for evaluation of capital investments; Financial statements; Activity based costing. Production Control: Forecasting techniques – causal and time series models, moving average, exponential smoothing, trend and seasonality; Aggregate production planning; Master production scheduling; MRP, MRP-II and ERP; Routing, scheduling and priority dispatching; Push and pull production systems, concepts of Lean and JIT manufacturing systems; Logistics, distribution, and supply chain management; Inventory – functions, costs, classifications, deterministic inventory models, quantity discount; Perpetual and periodic inventory control systems. Project Management: Scheduling techniques – Gantt chart, CPM, PERT and GERT."
  }
];

export default function PiCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#1d4ed8]">Production & Industrial</span> Engg (PI)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master manufacturing processes, operations research, industrial engineering, and quality management with our specialized GATE PI program. Designed for top ranks.
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
            src={piHeroImg} 
            alt="PI GATE Coaching" 
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
          <h2 className="text-[14px] md:text-[16px] font-bold text-[#1d4ed8] tracking-widest uppercase mb-3">Complete Syllabus</h2>
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Production & Industrial Engineering</h1>
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
