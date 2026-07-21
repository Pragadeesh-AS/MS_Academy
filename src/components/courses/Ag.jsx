import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";
import eceHeroImg from '../../assets/ece.png';

const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Linear Algebra: Matrices and determinants, linear and orthogonal transformations, Caley Hamilton theorem; Eigen values and Eigen vectors, solutions of linear equations. Calculus: Limit, continuity and differentiability; partial derivatives; homogeneous function – Euler’s theorem on homogeneous functions, total differentiation; maxima and minima of function with several independent variables; sequences and series – infinite series, tests for convergence; Fourier, Taylor and MacLaurin series. Vector Calculus: Vector differentiation, scalar and vector point functions, vector differential operators – del, gradient; divergence and curl; physical interpretations-line, surface and volume integrals; Stokes, Gauss and Green’s theorems. Differential Equations: Linear and non-linear first order Ordinary Differential Equations (ODE); homogeneous differential equations, higher order linear ODEs with constant coefficients; Laplace transforms and their inverse; Partial Differential Equations - Laplace, heat and wave equations. Probability and Statistics: Mean, median, mode and standard deviation; random variables; Poisson, normal and binomial distributions; correlation and regression analysis. Numerical Methods: Solutions of linear and non-linear algebraic equations; numerical integration - trapezoidal and Simpson’s rule; numerical solutions of ODEs."
  },
  {
    section: "Section 2: Farm Machinery",
    topics: "Machine Design: Design and selection of machine elements – gears, pulleys, chains and sprockets and belts; overload safety devices used in farm machinery; measurement of force, stress, torque, speed, displacement and acceleration on machine elements - shafts, couplings, keys, bearings and knuckle joints. Farm Machinery: Soil tillage; forces acting on a tillage tool; hitch systems and hitching of tillage implements; functional requirements, principles of working, construction and operation of manual, animal, tractor and renewable energy operated equipment for tillage, sowing, planting, fertilizer application, inter-cultivation, spraying, mowing, chaff cutting, harvesting and threshing, calculation of performance parameters - field capacity, efficiency, performance index, application rate and losses; cost analysis of implements and tractors, equipment for precision agriculture."
  },
  {
    section: "Section 3: Farm Power",
    topics: "Sources of Power: Sources of power on the farm — human, animal, mechanical, electrical, wind, solar and biomass; bio-fuels and their use in farm mechanization. Farm Power: Thermodynamic principles of I.C. engines; I.C. engine cycles; engine components; fuels and combustion; lubricants and their properties; I.C. engine systems – fuel, cooling, lubrication, ignition, electrical, intake and exhaust; selection, operation, maintenance and repair of I.C. engines; power efficiencies and measurement, engine performance curves; calculation of power, torque, fuel consumption, heat load and power losses; Tractors and Power tillers: Type, selection, maintenance and repair of tractors and power tillers; tractor clutches and brakes; power transmission systems – gear trains, differential, final drives and power take-off; mechanics of tractor chassis; traction theory; three point hitches - free link and restrained link operations; steering and hydraulic control systems used in tractors; tractor tests and performance; human engineering and safety considerations in design of tractor and agricultural implements."
  },
  {
    section: "Section 4: Soil and Water Conservation Engineering",
    topics: "Fluid Mechanics: Ideal and real fluids, properties of fluids; hydrostatic pressure and its measurement; continuity equation, kinematics and dynamics of flow; Bernoulli’s theorem; laminar and turbulent flow in pipes, Darcy- Weisbach and Hazen-Williams equations; flow through orifices, weirs and notches; flow in open channels, dimensional analysis – concepts of geometric dimensionless numbers. Soil Mechanics: Engineering properties of soils; fundamental definitions and relationships; index properties of soils; permeability and seepage analysis; shear strength, Soil compaction and Proctor test, Mohr’s circle of stress, active and passive earth pressures; stability of slopes, Terzaghi’s one dimensional soil consolidation theory. Hydrology: Hydrological cycle and measurement of its components; meteorological parameters and their measurement; analysis of precipitation data; runoff estimation; hydrograph analysis, unit hydrograph theory and application; stream flow measurement; flood routing, hydrological reservoir and channel routing, Infiltration – indices and equations, drought and its classification. Surveying and Leveling: Measurement of distance and area; instruments for surveying and levelling; chain surveying, methods of traversing; measurement of angles and bearings, plane table surveying; types of levelling; the Theodolite traversing; contouring; total station, introduction to GPS survey, computation of areas and volume. Soil and Water Erosion: Mechanics of soil erosion - wind and water erosion: soil erosion types, factors affecting erosion; soil loss estimation; biological and engineering measures to control erosion; terraces and bunds; vegetative waterways; gully control structures, drop, drop inlet and chute spillways; earthen dams. Watershed Management: Watershed characterization and land use capability classification; water budgeting in watershed, rainwater harvesting, check dams and farm ponds."
  },
  {
    section: "Section 5: Irrigation and Drainage Engineering",
    topics: "Soil-Water-Plant Relationship: Water requirement of crops; consumptive use and evapotranspiration; measurement of infiltration, soil moisture and irrigation water infiltration. Irrigation Water Conveyance and Application Methods: Design of irrigation channels and underground pipelines; irrigation scheduling; surface, sprinkler and micro irrigation methods, design and evaluation of irrigation methods; irrigation efficiencies. Agricultural Drainage: Drainage coefficient; planning, design and layout of surface and sub- surface drainage systems; leaching requirement and salinity control; irrigation and drainage water quality and reuse; non-conventional drainage system. Groundwater Hydrology: Groundwater occurrence; ground water movement; Darcy’s Law, steady and unsteady flow in confined and unconfined aquifers, groundwater exploration techniques; overview of groundwater recharge estimation and artificial recharge techniques. Wells and Pumps: Types of wells, steady flow through wells; design and construction of water wells; classification of pumps; pump characteristics; pump selection and installation."
  },
  {
    section: "Section 6: Agricultural Process Engineering",
    topics: "Engineering properties of agriculture produce: Physical, thermal, frictional, rheological and electrical properties. Evaporation and Drying: Concentration and drying of liquid foods – evaporators, tray, drum and spray dryers; osmotic dehydration and freeze drying; hydrothermal treatments; drying and milling of cereals, pulses and oilseeds; drying kinetics; psychrometry – properties of air-water vapor mixture. Size Reduction and Material Handling: Mechanics and energy requirement in size reduction of agriculture produce; particle size analysis for comminuted solids; size separation by screening; fluidization of granular solids-pneumatic, bucket, screw and belt conveying; cleaning and grading; effectiveness of separation; centrifugal separation of solids, liquids and gases; homogenization; filtration and membrane separation. Processing of Agriculture Produce: Processing of seeds, spices, fruits and vegetables; value addition of agriculture produce. Storage Systems: Controlled and modified atmosphere storage; perishable food storage, godowns, bins and grain silos, packaging material and machines."
  },
  {
    section: "Section 7: Dairy and Food Engineering",
    topics: "Heat and Mass Transfer: Steady state heat transfer in conduction, convection and radiation; transient heat transfer in simple geometry; working principles of heat exchangers; diffusive and convective mass transfer; simultaneous heat and mass transfer in agricultural processing operations; material and energy balances in food processing systems; water activity, sorption and desorption isotherms. Unit operations in Dairy and Food engineering: Blanching, homogenization, pasteurization, sterilization. Preservation of Food: Kinetics of microbial death – pasteurization and sterilization of milk and other liquid foods; preservation of food by cooling and freezing; refrigeration and cold storage basics and applications."
  }
];

export default function AgCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#f36b2b]">Agricultural</span> Engg (AG)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master engineering mathematics, farm machinery, farm power systems, soil & water conservation, irrigation drainage, agricultural processing, and food engineering with our specialized GATE AG program. Designed for top ranks.
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
            alt="AG GATE Coaching" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Agricultural Engineering</h1>
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
