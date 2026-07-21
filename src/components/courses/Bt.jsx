import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";
import eceHeroImg from '../../assets/ece.png';

const syllabusData = [
  {
    section: "Section 1: Engineering Mathematics",
    topics: "Linear Algebra: Matrices and determinants; Systems of linear equations; Eigen values and Eigen vectors. Calculus: Multivariable calculus (limits, continuity, and differentiability); Partial derivatives, maxima and minima; Sequences and series; Test for convergence. Multivariable calculus: Gradient, divergence, and curl (for applications in fluid mechanics, transport processes, etc.). Differential Equations: Linear and nonlinear first order ODEs, higher order ODEs with constant coefficients; Cauchy’s and Euler’s equations; Laplace transforms. Probability and Statistics: Mean, median, mode and standard deviation; Random variables; Poisson, normal and binomial distributions; Correlation and regression analysis; Bayesian Statistics. Numerical Methods: Solution of linear and nonlinear algebraic equations; Integration by trapezoidal and Simpson’s rule; Single step method for differential equations."
  },
  {
    section: "Section 2: General Biology",
    topics: "Biochemistry: Biomolecules - structure and function; Biological membranes - structure, membrane channels and pumps, molecular motors, action potential and transport processes; Basic concepts and regulation of metabolism of carbohydrates, lipids, amino acids and nucleic acids; Metabolism: Regulation of metabolism of carbohydrates, lipids, amino acids, and nucleic acids; Detailed pathways like glycolysis, citric acid cycle, and fatty acid oxidation; Photosynthesis, respiration and electron transport chain; Enzymes - Classification, catalytic and regulatory strategies; Enzyme kinetics - Michaelis-Menten equation; Enzyme inhibition - competitive, non-competitive and uncompetitive inhibition. Microbiology: History of Microbiology, Bacterial classification and diversity; Bacterial cell wall composition, Gram positive and Gram-negative bacteria, Archea, Methods in microbiology; Microbial growth and nutrition; Operon- Lac, Trp and Ara operon, Nitrogen fixation; Microbial diseases and host-pathogen interactions; Antibiotics and antimicrobial resistance, Two-component system (TCS), bacterial communication, Viruses - structure and classification. Immunology: Primary and Secondary lymphoid organs; Innate immunity and Inflammation; Cytokines and Chemokines; Complement system; Effector responses: Cellular and Humoral Immunity; Molecular basis of Antibody diversity and function; Polyclonal and Monoclonal antibodies; T-cell and B-cell development; Memory responses; Major Histocompatibility complex (MHC); Antigen processing and presentation; Regulation of immune responses; Immune tolerance; Hypersensitivity; Autoimmunity and Immunodeficiency; Graft vs Host disease; Immunization and vaccines."
  },
  {
    section: "Section 3: Genetics, Cellular and Molecular Biology",
    topics: "Genetics and Evolutionary Biology: Mendelian inheritance; Gene interaction; Complementation; Linkage, recombination and chromosome mapping; Extra chromosomal inheritance; Microbial genetics - transformation, transduction and conjugation; Bacterial gene mapping; Horizontal gene transfer and transposable elements; Chromosomal variation; Sex Determination; Genetic disorders; Population genetics; Epigenetics; Selection and inheritance; Adaptive and neutral evolution; Genetic drift; Species and speciation. Cell Biology: Eukaryotic cell structure; Cell cycle and cell growth control; Cell-cell communication; Cell signalling and signal transduction; Non-cell autonomous cell signalling; Post-translational modifications; Protein trafficking; Cell death and autophagy; Extra-cellular matrix."
  },
  {
    section: "Section 4: Fundamentals of Biological Engineering",
    topics: "Bioreaction Engineering: Rate law, zero and first order kinetics; (More advanced kinetic models, including Michaelis-Menten kinetics for enzyme reactions. Inhibition kinetics: Competitive, non-competitive, and uncompetitive inhibition in enzyme catalysis); Ideal reactors - batch, mixed flow and plug flow; Enzyme immobilization, diffusion effects - Thiele modulus, effectiveness factor, Damkoehler number; Kinetics of cell growth, substrate utilization and product formation; Structured and unstructured models; Batch, fed-batch and continuous processes; Microbial and enzyme reactors; Optimization and scale up (Design and operation of microbial reactors (e.g., fermentation reactors) and enzyme reactors (e.g., immobilized enzyme systems); Case studies on the use of microbial reactors in large-scale production (e.g., antibiotics, biofuels). Upstream and Downstream Processing: Media formulation and optimization; Sterilization of air and media; Filtration - membrane filtration, ultra filtration; Centrifugation - high speed and ultra; Cell disruption; Principles of chromatography - ion exchange, gel filtration, hydrophobic interaction, affinity, GC, HPLC and FPLC; Extraction, adsorption and drying; Measurement devices; Valves; First order and second order systems; Feedback and feed forward control; Types of controllers – proportional, derivative and integral control; Tuning of controllers."
  },
  {
    section: "Section 5: Plant, Animal and Microbial Biotechnology",
    topics: "Plants: Totipotency; Cell fate transition, direct and indirect organogenesis, regeneration of plants; Plant growth regulators and elicitors; Tissue culture and cell suspension culture system - methodology, kinetics of growth and nutrient optimization; Production of secondary metabolites; Hairy root culture; Plant products of industrial importance; Artificial seeds; Somaclonal variation; Protoplast, protoplast fusion - somatic hybrid and cybrid; Transgenic plants - direct and indirect methods of gene transfer techniques; Selection marker and reporter gene; Plastid transformation. Animals: Culture media composition and growth conditions; Animal cell and tissue preservation; Anchorage and non-anchorage dependent cell culture; Kinetics of cell growth; Micro & macro- carrier culture; Hybridoma technology; Stem cell technology; Animal cloning; Transgenic animals; Knock-out and knock-in animals. Microbes: Production of biomass and primary/secondary metabolites - Biofuels, bioplastics, industrial enzymes, antibiotics; Large scale production and purification of recombinant proteins and metabolites; Clinical-, food- and industrial- microbiology; Screening strategies for new products."
  },
  {
    section: "Section 6: Recombinant DNA technology and Other Tools in Biotechnology",
    topics: "Recombinant DNA technology: Restriction and modification enzymes; Vectors - plasmids, bacteriophage and other viral vectors, cosmids, Ti plasmid, bacterial and yeast artificial chromosomes; Expression vectors; Gene isolation and cloning, strategies for production of recombinant proteins; Transposons and gene targeting, Recombination-based gene cloning. Molecular tools: Polymerase chain reaction; DNA/RNA labelling and Sangers and next generation sequencing; Southern and northern blotting; In-situ hybridization; DNA fingerprinting, RAPD, RFLP; Site-directed mutagenesis; CRISPR-Cas; Biosensing and biosensors; DNA-protein and protein-protein interaction tools; Genomics and proteomics-based approaches. Analytical tools: Principles of microscopy - light, electron, fluorescence and confocal; Principles of spectroscopy- UV, visible, fluorescence, CD, IR, FT-IR, MS, NMR; Electrophoresis; Micro-arrays; Enzymatic assays; Immunoassays - ELISA, RIA, immunohistochemistry; Immunoblotting; Flow cytometry; Whole genome and ChIP sequencing. Computational tools: Bioinformatics resources and search tools; Sequence and structure databases; Sequence analysis - sequence file formats, scoring matrices, alignment, phylogeny; Genomics, proteomics, metabolomics; Gene prediction; Functional annotation; Secondary structure and 3D structure prediction; Knowledge discovery in biochemical databases; Metagenomics; Metabolic engineering and systems biology."
  }
];

export default function BtCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#f36b2b]">Biotechnology</span> (BT)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master biochemistry, microbiology, genetics, biological engineering, recombinant DNA technology, and computational tools with our specialized GATE BT program. Designed for top ranks.
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
            alt="BT GATE Coaching" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Biotechnology</h1>
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
