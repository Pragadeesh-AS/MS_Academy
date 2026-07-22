import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";
import eceHeroImg from '../../assets/ece.png';

const syllabusData = [
  {
    section: "Part A: Common Section - Section A.1: Design and Graphics",
    topics: "Architectural Graphics; Visual composition in 20 and 30; Form; Surface development; Anthropometrics; Ergonomics, Ratio and proportion, Scales in design, Organization of space; Plans, elevations, and sections of buildings; Circulation- horizontal and vertical; Universal design; Building bye-laws; Codes and standards, Barrier-free environment; Engineering curves; Orthographic and Isometric projection; One-point and two-point perspectives; Light, shade and shadow;"
  },
  {
    section: "Part A: Common Section - Section A.2: Environmental Planning and Landscape",
    topics: "Natural and man-made ecosystem; Environmental, ecological, and sustainability principles; Environmental pollution- types, causes, controls and abatement strategies; Sustainable development goals and strategies; Climate change and built environment; Urban ecosystem approach; Ecological footprint and carrying capacity; Resource management; Life cycle analysis; Principles of circular economy; Environmental Impact Assessment; Carbon footprint; Carbon credits; Urban Heat Islands; Sustainable site planning; Contour and slope analysis; Landscape planning and design; Landscape suitability analysis; Plant characteristics and planting designs; Landscape conservation - principles and techniques; Social forestry; Historical gardens;"
  },
  {
    section: "Part A: Common Section - Section A.3: Urban Design and Conservation",
    topics: "Historical and modern examples of urban design; Elements of urban built environment - urban form, spaces, structure, pattern, fabric, texture, grain; Theories, principles, tools and techniques of urban design; Precincts, character, spatial qualities; Placemaking; Form-based code; Urban design interventions for sustainable development and transportation; Development controls - FAR, densities and building bye-laws; Urban renewal and conservation; Heritage conservation; Historical and contemporary public spaces;"
  },
  {
    section: "Part A: Common Section - Section A.4: Town Planning, Housing and Real Estate Development",
    topics: "Principles and concepts of town planning; Traditional and modern planned cities in India and abroad; Housing typologies; Concepts of housing need, demand, supply and shortage; Neighbourhood design; Residential densities; Affordable and incremental housing; Slums, squatters and informal housing; Standards for housing and community facilities; Housing for special areas and needs; Real estate valuation; Real estate feasibility studies and market analysis; Real Estate locational decisions and economic analysis; Project phasing and construction phasing;"
  },
  {
    section: "Part B1: Architecture - Section B1.1 History and Theory of Architecture",
    topics: "World History of Architecture: Egyptian, Greco-Roman classical period, Byzantine, Gothic, Renaissance, Baroque-Rococo; Recent trends in Contemporary Architecture: Art nouveau, Art Deco, Eclecticism, International styles, Postmodernism, Deconstruction in architecture; Influence of Modern art and Design in Architecture; Indian Architecture; Oriental Architecture; Works of renowned national and international architects; Principles of art, design and Architecture;"
  },
  {
    section: "Part B1: Architecture - Section B1.2 Climatology and Environmentally Responsive Design",
    topics: "Climatic factors and classification; Solar architecture; Micro and macro climatic considerations in design; Thermal comfort in built environments; Passive design principles and concepts; Building energy audit and management; Embodied and operational energy; Building energy performance simulation and evaluation; Alternate and renewable sources of energy for buildings; Building Performance Rating systems; Kinetic architecture; Sustainable building technologies;"
  },
  {
    section: "Part B1: Architecture - Section B1.3 Building Construction, Materials, and Structural Systems",
    topics: "Building construction techniques, methods and details: foundation, plinth, masonry, bonds, fenestrations, arches, scaffolding, formwork, timber/RCC/Steel frame construction, roof and roof covering; Lightweight construction; Fire protection; Flooring systems; Principles of Modular Coordination; Prefabricated construction; Building materials characteristics & applications; Different types of building materials for walls, floor, roof, finishes, repair and retrofitting, acoustic & insulation materials, damp prevention; Alternative building materials; Building structural systems; Elastic and Limit State design; Structural systems; Design with steel and RCC; Principles of Prestressing; High Rise and Shell structures; Gravity and lateral load resisting systems; Space frames; Long span structures; Suspension structures; Catenary structures; Wind load & seismic considerations in high-rise structures; Disaster resistant structures; Temporary structures for rehabilitation;"
  },
  {
    section: "Part B1: Architecture - Section B1.4 Building Services",
    topics: "Natural and mechanical ventilation; HVAC design principles; Air-Conditioning systems; Water supply and distribution system; Water harvesting systems; Water treatment, recycling and reuse; Storm water drainage; Sewage and waste disposal; Sanitary fittings and fixtures; Plumbing systems; Drainage system; Principles of electrification and illumination and special lighting for buildings; Acoustics in buildings; Vertical transport systems- standards and uses; Building automation systems; Firefighting Systems; Building Safety and Security systems; Building Management Systems; Services for specialised buildings like Hospitals, Indoor Sports Stadiums & High-rise buildings;"
  },
  {
    section: "Part B1: Architecture - Section B1.5 Computer Applications in Architecture",
    topics: "Fundamental principles of computational methods; Logic-based understanding of pattern recognition, simulation, and data analytics; Computer applications in building design and performance analysis; Architectural visualization: 3d Modelling and BIM, Rendering, Virtual Reality, Augmented Reality; Computational design: parametric design, shape grammar and generative design; Visual communication; User Interface and User Experience Design; Digital design and fabrication methods: CNC mining and 3d printing; Artificial Intelligence for architecture."
  },
  {
    section: "Part B1: Architecture - Section B1.6 Project Management and Professional Practice",
    topics: "Construction planning and equipment; Construction project management techniques e.g. PERT, CPM; Professional practice and ethics; Estimation, costing and specification; Tendering; Arbitration; Role of Council of Architecture; Architecture journalism; Industrial architecture; Human Sociology; Building Economics; Interior design;"
  },
  {
    section: "Part B2: Planning - Section B2.1 Planning History, Theory and Techniques",
    topics: "Origins of the city; Pre-industrial cities; Post-industrial cities; Garden City, City Beautiful, Broadacre, Radial City, Linear City; Concepts and theories of urban planning; Ekistics; Urban sociology; Theories of urban geography; Regional delineation; Settlement hierarchy; Urban growth models; Industrial location theories; Contemporary planning ideas and trends: Eco-City, Smart City; Network Cities, Global Cities etc.; Global North and South perspectives; Land use and land cover classification; Types, tools, and techniques of surveys; Sampling techniques; Demography - definition and variables; Techniques of population projections; Estimation and forecasting techniques in planning; Socio-economic analysis; Goal formulation and scenario analysis; Planning indicators, norms, and standards; Public perception and user behaviour;"
  },
  {
    section: "Part B2: Planning - Section B2.2 Planning Policy and Practice",
    topics: "Concepts, factors and trends of urbanization; International charters and mandates for planning; Constitutional and legal provision for planning; Planning as a state subject; Policies and programs for planning in India; Types and hierarchy of plans; Development norms, standards and guidelines such as URDPFI; Eminent domain; Land pooling and readjustment; Land acquisition; Laws governing land; Institutions of urban governance; Composition and functions of local self-governments and statutory institutions; Urban reforms and good governance; Participatory planning and use of technology; Municipal information systems, land information systems, cadastral systems;"
  },
  {
    section: "Part B2: Planning - Section B2.3 Infrastructure, Services and Utilities",
    topics: "Water supply demand; Sources of water and intakes; Groundwater yield and recharge; Service Reservoir and Pumps; Water distribution system layout and network design; Water treatment; Water quality and testing; Water sensitive urban planning; Off-site and on-site sanitation; Decentralized sewerage system; Water carriage systems; Sewage quantity; Sewerage layout and network design; Sewer section and sewer design; Sewer appurtenances; Waste water treatment; Sewage disposal; Surface water runoff estimate, Discharge from streams and rivers; Flood protection measures; Layout and design of storm water drains; Rain water harvesting; Solid waste management: collection, storage, transportation and disposal; Waste composition and characteristics; Recycling and Reuse of solid waste; Processing and treatment of solid wastes; Area requirements and location choice criteria for different facilities and infrastructure; Standards, rules and Codes; Fundamentals of power transmission & distribution; Transformers, Feeders, Substation;"
  },
  {
    section: "Part B2: Planning - Section B2.4 Urban Land Use and Transportation",
    topics: "Land Use-Transport-Urban form interaction; Urban structures and land use pattern; Economics concepts of land, rent, land use and land values; Land value capture; Transit Oriented Development, Urban regeneration and brown field redevelopment; Real estate pricing; Accessibility measures; Residence and employment location choice; Aggregate and disaggregate transport demand models and forecasting; Traffic and travel demand management and control in urban areas; Process and principles of traffic engineering; Design of roads, intersections, grade separators and parking areas; Hierarchy of roads and level of service; Modes of transportation; Pedestrian and non-motorized transport planning; Traffic survey methods, Traffic flow Analysis; Transport infrastructure and allied facilities planning; Intelligent transportation systems;"
  },
  {
    section: "Part B2: Planning - Section B2.5 Data Analysis, Remote Sensing and Geo-informatics",
    topics: "Types of data and sources of data for planning; Descriptive statistics; Tests of normality; Inferential statistics: linear and multiple regression, testing of hypothesis, testing of error, ANOVA etc.; Decision Problem Structuring: Analytical Hierarchical Process, Multi-Criteria Analysis etc.; Basic concepts in satellite remote sensing, satellites, sensors, and coverage; Principles of digital image processing; Satellite data products and their use; Aerial photography; Principles of photogrammetry; Application of remote sensing in urban and regional studies; G.I.S applications in planning; Georeferencing; Storage of spatial data; Processing tools; 2d(spatial), 3d(elevation) and 4d(temporal) data analysis and modeling; Database management systems; Structured query Language; Spatial queries; Application of Machine Learning in urban planning; Smart city IoT applications; Python basics; Urban Analytics; Spatial Data Infrastructure;"
  },
  {
    section: "Part B2: Planning - Section B2.6 Project Implementation and Financing",
    topics: "Reforms in municipal finance; Municipal tax administration; Municipal budgeting; Fiscal indicators for finance; Municipal bonds/debentures; Loans and credit rating; Recovery mechanisms and pricing of services and infrastructure; Partnership approaches and types of contracts; Financial Viability & cost-benefit analysis; Project implementation, monitoring and evaluation; Asset management; Operation and maintenance; Institutional organizational structures and capacity building;"
  }
];

export default function ArCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#1d4ed8]">Architecture</span> & Planning (AR)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master architectural design, graphics, urban design, housing, environmental planning, structural systems, and town planning with our specialized GATE AR program. Designed for top ranks.
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
            alt="AR GATE Coaching" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Architecture & Planning</h1>
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
