import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";
import eceHeroImg from '../../assets/ece.png';

const syllabusData = [
  {
    section: "Section 1: Mathematics Foundation",
    topics: "Linear Algebra: Determinants and matrices, Systems of linear equations, Eigenvalues and eigenvectors. Calculus: Functions, Limit, Continuity, Differentiability, Local maxima and minima, Taylor series, Tests for convergence, Definite and indefinite integrals, Application of definite integral to obtain area and volume, Partial and total derivatives, Linear and non-linear first order ordinary differential equations (ODE). Numerical Methods: Approximation, errors, accuracy and precision in numerical methods; Numerical solutions (roots) of linear and non-linear algebraic equations; Interpolation and curve fitting - Least square approximation, Newton’s and Lagrange polynomials; Numerical differentiation and integration - trapezoidal and Simpson’s rule; Numerical solution of ordinary differential equations - single and multi-step methods. Probability and Statistics: Descriptive statistics, Measurement of central tendency, Dispersion, Skewness and kurtosis, Probability concepts, Conditional probability, Bayes theorem, Risk and reliability, Probability distributions, Correlation, Single and multiple regression models, Hypothesis testing (t-test, F-test, chi-square test)."
  },
  {
    section: "Section 2: Environmental Chemistry",
    topics: "Fundamentals of Environmental Chemistry: Covalent and ionic bonding; Chemical equations, concentration and activity; Structure and chemistry of organic molecules; Chemical equilibria; Thermodynamics and kinetics of chemical reactions. Principles of Water Chemistry: Water quality parameters and their measurement; Acid-base equilibria; Buffer solution; Carbonate equilibrium; Solubility of gases in water; Complexation, precipitation, and redox reactions; Inorganic and organic contaminants. Soil Chemistry: Organic matter, nitrogen, phosphorous, potassium, cation exchange capacity, base saturation, and sodium absorption ratio. Atmospheric Chemistry: Composition of the atmosphere; Reactivity of trace substances in the atmosphere; Chemistry of ozone formation."
  },
  {
    section: "Section 3: Environmental Microbiology",
    topics: "Prokaryotic and Eukaryotic Microorganisms: Characteristics of diverse groups of microorganisms; Classification of microorganisms; Microbial diversity; Role of microorganisms in wastewater treatment, bioremediation and biogeochemical cycling. Cell Chemistry and Cell Biology: Structure of proteins, nucleic acid (DNA & RNA), lipids and polysaccharides; Structure of cell; Structure and function of cytoplasmic membrane, cell wall, outer membrane, glycocalyx; antimicrobial resistance, quorum sensing. Microbial Metabolism: Anabolism and catabolism; Phosphorylation; Glycolysis; TCA cycle; Electron transport chain; Fermentation; Anaerobic respiration; Energy balances; Enzymes and Enzyme kinetics. Growth and Control of Microorganisms: Bacterial nutrition and growth; Specific growth rate and doubling time; Monod’s model; Types of culture media; Batch and continuous culture; Effects of environmental factors on growth; Control of microbes using physical and chemical methods. Microbiology and Health: Pathogens and modes of transmission; Indicator organisms; Quantification of coliforms using MPN and membrane filtration techniques."
  },
  {
    section: "Section 4: Water Resources and Environmental Hydraulics",
    topics: "Global Water Resources: Structure, properties and distribution of water; Threats to water resources; Water conservation. Surface Water Resources: Hydrological cycle and water balance - precipitation, infiltration, evapotranspiration, runoff; Flow hydrographs; Unit hydrographs; Stage-discharge relationship; Reservoir capacity; Surface water management; Rain water harvesting and storage. Groundwater Resources: Geologic formations as aquifers; Vadose and saturated zones; Confined and unconfined aquifers and their parameters - porosity, permeability, transmissivity and storage coefficient; Darcy’s law and applications; Steady state well hydraulics. Environmental Hydraulics: Concepts of mechanics; Properties of fluids; Pressure measurement; Hydrostatic force on surfaces; Buoyancy and flotation; Laminar and turbulent flow; Flow through pipes; Pipe networks; Forces on immersed bodies; Flow measurement in channels and pipes; Kinematics of flow; Continuity, momentum and energy equations; Channel hydraulics - specific energy, critical flow, hydraulic jump, rapid and gradually varied flow; Design of lined channels."
  },
  {
    section: "Section 5: Water & Wastewater Treatment and Management",
    topics: "Water and wastewater quality parameters; Eutrophication and thermal stratification in lakes; River pollution - Oxygen sag curve. Water treatment methods — screening, sedimentation with and without coagulation, filtration, desalination, disinfection; Water distribution and storage. Point and non-point sources of wastewater; Population forecasting methods; Design of sewer and storm water sewers; Sewer appurtenances; Preliminary, primary, secondary and tertiary sewage treatment; Sludge generation, processing and disposal methods; Sewage farming. Sources and characteristics of industrial effluents; Concept of Common Effluent Treatment Plants (CETP); Wastewater recycling and zero liquid discharge. Kinetics and reactor design: Mass and energy balance, Order and rate of reactions, Batch reactors, Completely mixed flow reactors, Plug flow reactors."
  },
  {
    section: "Section 6: Air and Noise Pollution",
    topics: "Structure and composition of the atmosphere; sources (natural and anthropogenic); Atmospheric processes (emission, transformation, transport, removal); Indoor air pollution; Effects on health and environment; Air pollution: gases and particulate matter; Air quality standards; Primary and secondary pollutants; Criteria pollutants; ambient and emission standards; air quality indices; visibility and radiative effects. Particulate Pollutants: Measurement and control methods; Control of particulate air pollutants using gravitational settling chambers, cyclone separators, wet scrubbers, fabric filters (Baghouse filter), electrostatic precipitators (ESP). Gaseous Pollutants: Measurement and control methods; Control of gaseous contaminants: absorption, adsorption, condensation and combustion; Control of sulphur oxides, nitrogen oxides, carbon monoxide, and hydrocarbons; Diffusion, Fick’s law and interfacial mass transfer. Vehicular emission control systems, including diesel particulate filters (DPFs), catalytic converters, and fuel standards. Air Quality Management: Point, line and area sources; Inventory; Meteorology and dispersion; atmospheric stability and inversion, mixing height, wind rose diagrams, Gaussian plume dispersion modelling, and topographic influences. Noise Pollution: Sources; Health effects; Standards; Measurement parameters (sound pressure level, equivalent continuous sound level Leq, day-night level Ldn); frequency analysis; and control and mitigation methods."
  },
  {
    section: "Section 7: Solid and Hazardous Waste Management",
    topics: "Integrated solid waste management; Waste hierarchy; Rules and regulations for solid waste management in India. Municipal solid waste management: Sources, generation, characteristics, collection, segregation, and transportation, waste processing and disposal (including reuse options, biological methods, energy recovery processes and landfilling), waste-to-energy technologies, circular economy principles, life-cycle energy analysis, decentralized renewable systems, and urban metabolism. Hazardous waste management: Characteristics, generation, fate of materials in the environment, treatment and disposal. Soil contamination and leaching of contaminants into groundwater. Management of biomedical waste, plastic waste, waste from energy sector (solar/wind/batteries etc), C&D waste and E-waste: Sources, generation and characteristics; Waste management practices including storage, collection and transfer."
  },
  {
    section: "Section 8: Global and Regional Environmental Issues",
    topics: "Global effects of air pollution: Greenhouse gases, radiative forcing and global warming potential (GWP), climate change, urban heat islands, acid rain, ozone hole. Ecology and various ecosystems; Biodiversity; Factors influencing increase in population, energy consumption, and environmental degradation."
  },
  {
    section: "Section 9: Environmental Management and Sustainable Development",
    topics: "Environmental Management Systems; ISO14000 series; Environmental Auditing; Environmental Impact Assessment; Life cycle assessment; Human health risk assessment; Occupational Health and Hygiene, Physical & Chemical Hazards. Environmental Law and Policy: Objectives; Polluter pays principle, Precautionary principle; The Water and Air Acts with amendments; The Environment (Protection) Act (EPA) 1986; National Green Tribunal Act, 2010; National Environment Policy; Principles of International Law and International treaties. Energy and Environment: Energy Sources: Overview of resources and reserves; Renewable and non-renewable energy sources; Energy-Environment nexus. Sustainable Development: Definition and concepts of sustainable development; Sustainable development goals; Hurdles to sustainability; Environment and economics; carbon pricing, emission trading, Environmental, Social, and Governance (ESG) frameworks."
  }
];

export default function EsCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#f36b2b]">Environmental</span> (ES)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master mathematics foundations, water chemistry, environmental microbiology, hydraulics, waste treatment, air & noise pollution, and sustainable development with our specialized GATE ES program. Designed for top ranks.
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
            alt="ES GATE Coaching" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Environmental Science & Engg</h1>
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
