import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ShinyButton } from "../ui/shiny-button";
import eceHeroImg from '../../assets/ece.png';

const syllabusData = [
  {
    section: "XL0.1: Atomic Structure and Periodicity",
    topics: "Planck’s quantum theory, wave particle duality, uncertainty principle, comparison between Bohr’s model and quantum mechanical model of hydrogen atom, electronic configuration of atoms and ions. Hund’s rule and Pauli’s exclusion principle. Periodic table and periodic properties: ionization energy, electron affinity, electronegativity and atomic size."
  },
  {
    section: "XL0.2: Structure and Bonding",
    topics: "Ionic and covalent bonding, MO and VB approaches for diatomic molecules, VSEPR theory and shape of molecules, hybridization, resonance, dipole moment, structure parameters such as bond length, bond angle and bond energy, hydrogen bonding and van der Waals interactions. Ionic solids, ionic radii and lattice energy (Born‐Haber cycle). HSAB principle."
  },
  {
    section: "XL0.3: s, p and d Block Elements",
    topics: "Oxides, halides and hydrides of alkali, alkaline earth metals, B, Al, Si, N, P, and S. General characteristics of 3d elements. Coordination complexes: valence bond and crystal field theory, colour, geometry, magnetic properties and isomerism."
  },
  {
    section: "XL0.4: Bioinorganic Chemistry",
    topics: "Oxygen transport and storage metalloproteins (hemoglobin, myoglobin, hemocyanin); Electron transport Fe-S metalloproteins; Carbonic anhydrase and Cu-Zn Superoxide dismutase."
  },
  {
    section: "XL0.5: Chemical Equilibria",
    topics: "Osmotic pressure, elevation of boiling point and depression of freezing point, ionic equilibria in solution, solubility product, common ion effect, hydrolysis of salts, pH, buffer and their applications. Equilibrium constants (Kc, Kp, and KX) for homogeneous reactions."
  },
  {
    section: "XL0.6: Electrochemistry",
    topics: "Conductance, Kohlrausch law, cell potentials, EMF, Nernst equation, thermodynamic aspects and their applications."
  },
  {
    section: "XL0.7: Reaction Kinetics",
    topics: "Rate constant, order of reaction, molecularity, activation energy, zero, first and second order kinetics, catalysis and elementary enzyme reactions. Reversible and irreversible inhibition of enzymes."
  },
  {
    section: "XL0.8: Thermodynamics",
    topics: "Qualitative treatment of state and path functions, First law, reversible and irreversible processes, internal energy, enthalpy, Kirchoff equation, heat of reaction, Hess’s law, heat of formation. Second law, entropy and free energy. Gibbs‐Helmholtz equation, free energy change and spontaneity, Free energy changes from equilibrium constant."
  },
  {
    section: "XL0.9: Structure-Reactivity Correlations and Organic Reaction Mechanisms",
    topics: "Acids and bases, electronic and steric effects, Stereochemistry, optical and geometrical isomerism, tautomerism, conformers and concept of aromaticity. Elementary treatment of SN1, SN2, E1, E2 and radical reactions, Hoffmann/Saytzeff rules, addition reactions, Markownikoff rule and Kharasch effect. Elementary hydroboration reactions. Grignard’s reagents and their uses. Aromatic electrophilic substitutions, nucleophilic aromatic substitutions, and orientation effect as exemplified by various functional groups. Identification of common functional groups by chemical tests."
  },
  {
    section: "XL0.10: Chemistry of Biomolecules",
    topics: "Amino acids, proteins, nucleic acids and nucleotides. Peptide sequencing by chemical and enzymatic proteolytic methods. DNA sequencing by chemical and enzymatic methods. Carbohydrates (upto hexoses only). Lipids (triglycerides only). Principles of biomolecule purification-Ion exchange and gel filtration chromatography. Electronic absorption and fluorescence spectroscopy for the identification of biological molecules."
  },
  {
    section: "XL1.1 Structure and Function of Biomolecules",
    topics: "Organization of life; Importance of water; Structure and function of biomolecules: Carbohydrates, lipids, proteins, and nucleic acids; Protein structure, folding/misfolding, and function; Myoglobin, hemoglobin, lysozyme, ribonuclease A, carboxypeptidase, and chymotrypsin."
  },
  {
    section: "XL1.2 Enzymes and General Principles of Metabolism",
    topics: "Enzymes: catalysis, specificity, and regulation, kinetics (up to two substrates), enzyme inhibitors; Regulatory Enzymes; Vitamins and coenzymes; General principles of metabolism, hormonal regulation of metabolism; Generation and utilization of ATP."
  },
  {
    section: "XL1.3 Metabolic Pathways and Associated Disorders",
    topics: "Glycolysis, TCA cycle, pentose phosphate pathway, oxidative phosphorylation, gluconeogenesis, and fatty acid metabolism; Metabolism of nitrogen-containing compounds: nitrogen fixation, amino acids, and nucleotides. Photosynthesis, photophosphorylation, Calvin cycle. Metabolic disorders (Sugars, amino acids, and lipids)."
  },
  {
    section: "XL1.4 Analytical Techniques",
    topics: "Buffering against pH changes in biological systems, the Henderson-Hasselbalch equation; Ion exchange, size exclusion and affinity chromatography, Thin layer and paper chromatography, centrifugation; Characterization of biomolecules by electrophoresis; Analytical methods to study DNA-protein and protein–protein interactions; Lambert-Beer law, UV-visible, and fluorescence spectroscopy; next-generation DNA sequencing, PCR, and site-directed mutagenesis. Antibody-antigen interaction; Immunological techniques: immunodiffusion, immune-electrophoresis, RIA and ELISA, flow cytometry; monoclonal antibodies and their applications."
  },
  {
    section: "XL1.5 Cell Structure and Function",
    topics: "Cell structure and organelles; Biological membranes; Transport across membranes; Membrane assembly, Protein targeting and degradation; Biosignalling; Receptor-ligand interaction; Two-component system, hormones and neurotransmitters; Toxins and ion channels."
  },
  {
    section: "XL1.6 Gene Expression and Its Regulation, and DNA Repair",
    topics: "DNA replication, transcription, and translation; DNA damage and repair; Nuclease accessibility methods; Biochemical regulation of gene expression."
  },
  {
    section: "XL2.1: Plant Systematics",
    topics: "Botanical nomenclature; History of plant taxonomy; Diversity and classification of plants; APG system of plant classification; Major families such as Apiaceae, Apocynaceae, Asteraceae, Lamiaceae, Myrtaceae, Solanaceae, Verbenaceae, Poaceae and Orchidaceae; Phylogenetics and cladistics; Molecular taxonomy and DNA barcoding; Centers for plant taxonomy and herbaria in India."
  },
  {
    section: "XL2.2: Plant Anatomy",
    topics: "Anatomy of root, stem and leaves, floral organs, embryo and young seedlings; Primary and secondary meristems; Stellar organization; Vascular system and their ontogeny; Xylem and phloem structure; Secondary growth in plants and wood anatomy; Plant cell structure and differences from animal cells."
  },
  {
    section: "XL2.3: Plant development; Cell and Tissue Morphogenesis",
    topics: "Life cycle of an angiosperm; Development of male and female gametophyte; Cell fate determination and tissue patterning; Spacing mechanisms in trichomes and stomata; Embryogenesis, organization and function of shoot and root apical meristems; Transition to flowering: photoperiodism and vernalization; ABC model of floral organ patterning, pollen germination, double fertilization, seed development; Xylem and phloem cell differentiation, photomorphogenesis; Phytochrome, cryptochrome, phototropin; Role of auxin, cytokinin, gibberellins, and brassinosteroids on plant development."
  },
  {
    section: "XL2.4: Plant Physiology and Biochemistry",
    topics: "Plant water relations, mechanisms of uptake and transport of water, ions, solutes from soil to plants, apoplastic and symplastic transport mechanisms; Mechanism of stomatal movements, nitrogen metabolism, photosynthesis; C3, C4 and CAM cycles, photorespiration, respiration: glycolysis, TCA cycle and electron transport chain; Plant responses and mechanisms of abiotic stresses including drought, salinity, freezing and heat stress, metal toxicity; Role of abscisic acid in abiotic stresses; Structure and function of biomolecules (proteins, carbohydrates, lipids, nucleic acid), enzyme kinetics; Structure and biosynthesis of major plant secondary metabolites (alkaloids, terpenes, phenylpropanoids, flavonoids); Biosynthesis, mechanism of action and physiological effects of auxin, cytokinin, gibberellic acids, brassinosteroid, ethylene, strigolactone, abscisic acid, salicylic and jasmonic acid; Plant peptide hormones; Concept of hormone-receptor-repressor; Senescence and programmed cell death."
  },
  {
    section: "XL2.5: Genetics and Genomics",
    topics: "Cell cycle and cell division; Principles of Mendelian inheritance, linkage, recombination, genetic mapping; Extra chromosomal inheritance; Introduction to epigenetics; Gene silencing- transgene silencing, post transcriptional gene silencing, miRNA and siRNA; Evolution and organization of eukaryotic genome structure, gene expression, gene mutation and repair, chromosomal aberrations (numerical: euploidy and aneuploidy and structural: deletion, duplication, inversion, translocation), transposons; Model organisms for functional genetics and genomics; Introduction to transcriptomics, proteomics and metabolomics; Large data analysis, bioinformatics, statistical analysis."
  },
  {
    section: "XL2.6: Plant Breeding, Genetic Modification, Genome Editing",
    topics: "Principles, methods – selection, hybridization, heterosis; Male sterility; Genetic maps and molecular markers; Embryo rescue; haploid and doubled haploids; Plant tissue culture: micropropagation, embryo culture and in vitro regeneration, somatic embryogenesis, artificial seed, cryopreservation, somaclonal variation, somatic cell hybridization, marker-assisted selection, gene transfer methods viz. direct and vector-mediated, generation of transgenic plants; Introduction to genome editing: CRISPR/Cas9, Cre-Lox system to generate chimeras; Plastid transformation; chemical mutagenesis."
  },
  {
    section: "XL2.7: Economic and Applied Botany",
    topics: "A general account of economically and medicinally important plants - cereals, pulses, plants yielding fibers, timber, sugar, beverages, oils, rubber, pigments, dyes, gums, drugs and narcotics; Economic importance of algae, fungi, lichen and bacteria; Major Indian cash crops; Effect of industrialization on agricultural botany such as plastic on fiber economy; Genetically modified crops and its regulation eg. Bt cotton, Bt brinjal, golden rice etc.; Chemical biology of phytochemicals; Postharvest processing of tea and essential oil-bearing plants."
  },
  {
    section: "XL2.8: Plant Pathology",
    topics: "Nature and classification of plant diseases; Diseases of important crops caused by fungi, bacteria, nematodes and viruses, and their control measures (chemical and biological) mechanism(s) of pathogenesis, resistance: basal, systemic, induced systemic resistance, gene for gene concept; Molecular detection of pathogens; Plant-microbe interactions: symbionts and mycorrhiza, pathogens and pests; Signaling pathways in plant defence response; Salicylic acid (SA) and jasmonic acid (JA) in plant-pathogen and plant-herbivore interaction, necrosis; Calcium signalling in plants; Host-parasitic plant interaction (such as Cuscuta)."
  },
  {
    section: "XL2.9: Ecology and Environment",
    topics: "Ecosystems – types, dynamics, degradation, biogeochemical cycles, ecological succession; Food webs and energy flow through ecosystem; Vegetation types of the world, Indian vegetation types and biogeographical zones, climate and flora endemism; Pollution and global climate change, speciation and extinction, biodiversity and conservation strategies, ecological hotspots, afforestation, habitat restoration; Plant interactions with other organisms; epiphytes, parasites and endophytes."
  },
  {
    section: "XL3.1: Historical Perspective",
    topics: "Discovery of microbial world; Landmark discoveries relevant to the field of microbiology; Controversy over spontaneous generation; Role of microorganisms in transformation of organic matter and in the causation of diseases."
  },
  {
    section: "XL3.2: Methods in Microbiology",
    topics: "Pure culture techniques; Disinfection and Sterilization: principles, methods and assessment of efficacy; Principles of microbial nutrition; Enrichment culture techniques for isolation of microorganisms; Antigen and antibody detection methods for microbial diagnosis; Light-, phase contrast-, fluorescence- and electron-microscopy; PCR, Real-time PCR for quantitation of microbes; CRISPR-Cas."
  },
  {
    section: "XL3.3: Microbial Taxonomy and Diversity",
    topics: "Bacteria, Archea and their broad classification; Eukaryotic microbes: Yeasts, molds and protozoa; Viruses and their classification; Molecular approaches to microbial taxonomy and phylogeny."
  },
  {
    section: "XL3.4: Prokaryotic Cells: Structure and Function",
    topics: "Cell walls, cell membranes and their biosynthesis; Mechanisms of solute transport across membranes; Flagella and Pili, Capsules, Cell inclusions like endospores and gas vesicles; Bacterial locomotion, including positive and negative chemotaxis."
  },
  {
    section: "XL3.5: Microbial Growth",
    topics: "Definition of growth; Growth curve; Mathematical expression of exponential growth phase; Measurement of growth and growth yields; Synchronous growth; Continuous culture; Effect of environmental factors on growth; Sporulation; Quorum sensing; Bacterial biofilm and biofouling."
  },
  {
    section: "XL3.6: Microbial Metabolism",
    topics: "Energetics: redox reactions and electron carriers; Electron transport and oxidative phosphorylation; An overview of metabolism; Glycolysis; Pentose-phosphate pathway; Entner-Doudoroff pathway; Glyoxalate pathway; The citric acid cycle; Fermentation; Aerobic and anaerobic respiration; Chemolithotrophy; Photosynthesis; Calvin cycle; Biosynthetic pathway for fatty acids synthesis; Common regulatory mechanisms in synthesis of amino acids; Regulation of major metabolic pathways."
  },
  {
    section: "XL3.7: Microbial Diseases and Host Pathogen Interaction",
    topics: "Normal microbiota; Classification of infectious diseases; Reservoirs of infection; Nosocomial infection; Opportunistic infections; Emerging infectious diseases; Mechanism of microbial pathogenicity; Nonspecific defense of host; Antigens and antibodies; Humoral and cell mediated immunity; Vaccines; Passive immunization; Immune deficiency; Human diseases caused by viruses, bacteria, and pathogenic fungi."
  },
  {
    section: "XL3.8: Control of Micro-organisms: Chemotherapy/Antibiotics",
    topics: "General characteristics of antimicrobial drugs; Antibiotics: Classification, molecular mechanism of mode of action and resistance; Antifungal and antiviral drugs."
  },
  {
    section: "XL3.9: Microbial Genetics",
    topics: "Types of mutation; UV and chemical mutagens; Selection of mutants; Ames test for mutagenesis; Bacterial genetic system: transformation, conjugation, transduction, recombination, plasmids, transposons; DNA repair; Regulation of gene expression: repression and induction; Operon model; Bacterial genome with special reference to E.coli; Phage λ and its life cycle; RNA; Mutation in virus genomes, virus recombination and reassortment; Basic concept of microbial genomics; Cell cycle and cell division in lower eukaryotes."
  },
  {
    section: "XL3.10: Microbial Ecology",
    topics: "Microbial interactions; Carbon, sulphur and nitrogen cycles; Soil microorganisms associated with vascular plants; Bioremediation; Uncultivable microorganisms; Basic concept of metagenomics and metatranscriptomics."
  },
  {
    section: "XL4.1: Animal Diversity",
    topics: "Systematics and classification of animals, phylogenetic relationships (based on classical and molecular phylogenetic tools)."
  },
  {
    section: "XL4.2: Evolution",
    topics: "Origin and history of life on earth, theories of evolution, natural selection, adaptation, speciation."
  },
  {
    section: "XL4.3: Genetics",
    topics: "Basic Principles of inheritance, molecular basis of heredity, sex determination and sex-linked characteristics, cytoplasmic inheritance, linkage, recombination and mapping of genes in eukaryotes, population genetics, genetic disorders, roles of model organisms in understanding genetic principles."
  },
  {
    section: "XL4.4: Biochemistry and Molecular Biology",
    topics: "Nucleic acids, proteins, lipids and carbohydrates; replication, transcription and translation, Krebs cycle, glycolysis, enzyme catalysis, hormones and their actions, roles of vitamins and minerals."
  },
  {
    section: "XL4.5: Cell Biology",
    topics: "Basic principles of cellular microscopy, structure of cell, cytoskeletal organization, cellular organelles and their structure and function, cell cycle, cell division, chromosomes and chromatin structure."
  },
  {
    section: "XL4.6: Gene expression in Eukaryotes",
    topics: "Eukaryotic genome organization and regulation of gene expression, transposable elements."
  },
  {
    section: "XL4.7: Animal Anatomy and Physiology",
    topics: "Comparative anatomy and physiology, respiratory system, muscular system, circulatory system, digestive system, nervous system, excretory system, endocrine system, reproductive system, skeletal system."
  },
  {
    section: "XL4.8: Parasitology and Immunology",
    topics: "Nature of parasite, host-parasite relation, protozoan and helminthic parasites, the immune system, cellular and humoral immune response."
  },
  {
    section: "XL4.9: Development Biology",
    topics: "Gametogenesis, Embryonic development, cellular differentiation, organogenesis, metamorphosis, Model organisms used in developmental biology, genetic and molecular basis of development, stem cells."
  },
  {
    section: "XL4.10: Ecology",
    topics: "The ecosystem, Animal distribution, ecological niche and its contribution to ecological diversity, the food chain, population dynamics, species diversity, zoogeography, biogeochemical cycles, conservation biology, ecotoxicology, biodiversity hotspots in India."
  },
  {
    section: "XL4.11: Animal Behaviour",
    topics: "Type of animal behaviours and their evolution, courtship, mating and territoriality, instinct, learning and memory, social behaviour across the animal taxa, communication, pheromones."
  },
  {
    section: "XL5.1: Food Chemistry and Nutrition",
    topics: "Food Components Characterization and quantification techniques. Carbohydrates: Structure and functional properties of mono-, oligo-, & poly- saccharides including starch, cellulose, pectic substances and dietary fibre, gelatinization and retrogradation of starch. Proteins: classification and structure of proteins in food, Protein denaturation, functional properties of proteins and starch. Lipids: Classification and structure of lipids, rancidity, polymerization and polymorphism. Pigments: carotenoids, chlorophylls, anthocyanins, tannins and myoglobin. Curcumin, betalains. Food Flavours: Terpenes, esters, aldehydes, ketones and quinines. Enzymes: specificity, simple and inhibition kinetics, coenzymes, enzymatic and non- enzymatic browning, Food enzymology. Nutrition: Balanced diet, essential amino acids and essential fatty acids, protein efficiency ratio, water soluble and fat soluble vitamins, role of minerals in nutrition, co-factors, anti-nutrients, nutraceuticals, nutrient deficiency diseases. Food Supplements, Concept of nutrigenomics. Food adulteration (types of adulterants and their detection). Chemical and Biochemical Changes: Changes occurring in foods during different processing. Changes occur in foods and food biopolymers (carbohydrates, proteins, lipids) during different processing."
  },
  {
    section: "XL5.2: Food Microbiology",
    topics: "Characteristics of Microorganisms: Morphology of bacteria, yeast, mold and actinomycetes, spores and vegetative cells, gram-staining, Resistant bacteria. Microbial Growth: D-value, Z-value, F-value, Growth and death kinetics, serial dilution technique. Food Spoilage: Spoilage microorganisms in different food products including milk, fish, meat, egg, cereals and their products. Toxins from Microbes: Pathogens and non-pathogens including Staphylococcus, Salmonella, Shigella, Escherichia, Bacillus, Clostridium, and Aspergillus genera, Food borne diseases. Fermented Foods and Beverages: Curd, yoghurt, cheese, pickles, soya-sauce, sauerkraut, idli, dosa, vinegar, alcoholic beverages, and sausage. Probiotic foods: probiotic microorganisms, their benefits, prebiotics, synbiotics."
  },
  {
    section: "XL5.3: Food Products Technology",
    topics: "Processing Principles: Food Components Characterization and quantification techniques. Quality analysis of raw and processed food products. Thermal processing (blanching, pasteurization, sterilization), chilling, freezing, dehydration, addition of preservatives and food additives, Microwave, radiowave, and Infrared processing, irradiation, fermentation, hurdle technology, intermediate moisture foods. Non thermal technologies: Ultrasonication, HPP, Pulse Electric Field, Cold plasma. Food packaging and storage: packaging materials and their properties, aseptic packaging Active and Intelligent packaging, controlled and modified atmosphere storage. Microplastics in food. Cereal processing and products: milling of rice, wheat, and maize, Pulse processing, parboiling of paddy, bread, biscuits, extruded products and ready to eat breakfast cereals. Meat Analogue and Plant-based milk alternatives. Oil Processing: Expelling, solvent extraction, refining and hydrogenation. Fruits and Vegetables Processing: Extraction, clarification, concentration and packaging of fruit juice, jam, jelly, marmalade, squash, candies, tomato sauce, ketchup, and puree, potato chips, pickles. Plantation crops processing and products: Tea, coffee, cocoa, spice, extraction of essential oils and oleoresins from spices. Milk and Milk Products Processing: Pasteurization and sterilization, cream, butter, ghee, ice- cream, cheese and milk powder. Processing of animal products: Processing of frozen, canned, and dried products, ready to eat products of fish and meat. Curing, smoking, poultry processing, animal slaughtering. Waste Utilization: Pectin from fruit wastes, uses of by-products from rice milling. Edible films and packaging materials from waste. Food standards and Quality Maintenance: FPO, PFA, A-Mark, HACCP, food plant sanitation and cleaning in place (CIP). FSSAI, BIS, Codex Alimentarius, ISO, Food Safety and Management System (FSMS)."
  },
  {
    section: "XL5.4: Food Engineering",
    topics: "Mass and energy balance. Momentum Transfer: Flow rate and pressure drop relationships for Newtonian fluids flowing through pipe, Reynolds number. Heat transfer: heat transfer by conduction, convection, radiation, heat exchangers. Mass Transfer: Molecular diffusion and Fick's law, conduction and convective mass transfer, permeability through single and multilayer films. Mechanical Operations: Size reduction of solids, high pressure homogenization, filtration, centrifugation, settling, sieving, mixing & agitation of liquid. Thermal operations: Thermal blanching, pasteurization, sterilization, evaporation of liquid foods, hot air drying of solids, spray and freeze-drying, freezing and crystallization. Mass Transfer Operations: Psychometric, humidification and dehumidification operations."
  }
];

export default function XlCourse() {
  return (
    <main className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full px-4 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            GATE <span className="text-[#f36b2b]">Life Sciences</span> (XL)
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10">
            Master chemistry, biochemistry, botany, microbiology, zoology, and food technology with our specialized GATE XL program. Designed for top ranks.
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
            alt="XL GATE Coaching" 
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
          <h1 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">GATE Life Sciences</h1>
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
