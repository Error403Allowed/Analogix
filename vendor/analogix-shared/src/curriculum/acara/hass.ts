import type { CurriculumSubject } from "./types.js";

export const HASS: Record<string, CurriculumSubject> = {
  HASS: {
    subject: "Humanities and Social Sciences",
    learningArea: "Humanities and Social Sciences",
    yearLevels: {
      "7": {
        year: 7,
        strands: {
          "History": [
            {
              id: "AC9HH7D01",
              strand: "History",
              topic: "Ancient Civilisations",
              contentDescription: "describe the significant features of ancient societies and explain how they contributed to the development of the modern world",
              elaborations: ["examining Ancient Egypt, Mesopotamia or Indus Valley", "comparing governance and social structures", "analysing contributions to modern society"]
            },
            {
              id: "AC9HH7D02",
              strand: "History",
              topic: "Historical Sources",
              contentDescription: "analyse sources to explain causes and effects of events and developments in the ancient world",
              elaborations: ["evaluating primary and secondary sources", "identifying causes and effects", "explaining significance of events"]
            }
          ],
          "Geography": [
            {
              id: "AC9HG7D01",
              strand: "Geography",
              topic: "Places and Environments",
              contentDescription: "describe the diverse features of places and explain why they are important to people",
              elaborations: ["analysing natural and built features", "explaining people's connection to places", "comparing places"]
            },
            {
              id: "AC9HG7D02",
              strand: "Geography",
              topic: "Sustainability",
              contentDescription: "explain how environments are changed and propose strategies to manage sustainability",
              elaborations: ["describing human impacts on environments", "proposing sustainability strategies", "evaluating environmental management"]
            }
          ],
          "Civics and Citizenship": [
            {
              id: "AC9HC7D01",
              strand: "Civics and Citizenship",
              topic: "Government and Democracy",
              contentDescription: "describe the key features of Australian government and explain the purpose of democratic rules",
              elaborations: ["describing federal, state and local government", "explaining voting and elections", "describing rights and responsibilities of citizens"]
            },
            {
              id: "AC9HC7D02",
              strand: "Civics and Citizenship",
              topic: "Law and Society",
              contentDescription: "explain the purpose of laws in society and describe key features of the Australian legal system",
              elaborations: ["describing types of laws", "explaining the court system", "describing how laws are made"]
            }
          ],
          "Economics and Business": [
            {
              id: "AC9HE7D01",
              strand: "Economics and Business",
              topic: "Economics",
              contentDescription: "describe the factors that influence economic decisions and explain the concept of scarcity",
              elaborations: ["explaining scarcity and choice", "describing factors influencing decisions", "analysing opportunity cost"]
            },
            {
              id: "AC9HE7D02",
              strand: "Economics and Business",
              topic: "Business",
              contentDescription: "describe how businesses meet consumer needs and wants and explain the role of producers in the economy",
              elaborations: ["explaining production and consumption", "describing business activities", "analysing market operations"]
            }
          ]
        },
        achievementStandard: "Students describe ancient societies and analyse historical sources. They explain environmental features and sustainability. They describe Australian government and legal systems. They explain economic concepts and business activities."
      },
      "8": {
        year: 8,
        strands: {
          "History": [
            {
              id: "AC9HH8D01",
              strand: "History",
              topic: "Medieval Europe",
              contentDescription: "describe the significant features of medieval Europe and explain the transition to the modern era",
              elaborations: ["examining feudalism and the church", "analysing the Crusades", "explaining the Renaissance"]
            },
            {
              id: "AC9HH8D02",
              strand: "History",
              topic: "Global History",
              contentDescription: "describe connections between societies and explain causes and effects of global interactions",
              elaborations: ["analysing trade networks", "explaining cultural exchange", "describing colonisation impacts"]
            }
          ],
          "Geography": [
            {
              id: "AC9HG8D01",
              strand: "Geography",
              topic: "Biomes",
              contentDescription: "describe the characteristics of different biomes and explain how they influence human activity",
              elaborations: ["identifying major biomes", "explaining human use of biomes", "analysing environmental challenges"]
            },
            {
              id: "AC9HG8D02",
              strand: "Geography",
              topic: "Global Connections",
              contentDescription: "explain how global patterns and connections affect the lives of people in different places",
              elaborations: ["analysing global trade", "explaining migration patterns", "describing cultural connections"]
            }
          ],
          "Civics and Citizenship": [
            {
              id: "AC9HC8D01",
              strand: "Civics and Citizenship",
              topic: "Citizenship",
              contentDescription: "explain the rights and responsibilities of Australian citizens and describe ways citizens can participate in civic life",
              elaborations: ["describing citizenship rights", "explaining civic participation", "analysing democratic processes"]
            },
            {
              id: "AC9HC8D02",
              strand: "Civics and Citizenship",
              topic: "Global Citizenship",
              contentDescription: "describe the role of international organisations and explain Australia's place in the world",
              elaborations: ["describing UN and other organisations", "explaining Australia's international relationships", "analysing global issues"]
            }
          ],
          "Economics and Business": [
            {
              id: "AC9HE8D01",
              strand: "Economics and Business",
              topic: "Markets",
              contentDescription: "explain how markets operate and analyse factors that affect demand and supply",
              elaborations: ["explaining demand and supply", "describing market equilibrium", "analysing price changes"]
            },
            {
              id: "AC9HE8D02",
              strand: "Economics and Business",
              topic: "Financial Decisions",
              contentDescription: "explain factors that influence consumer choices and describe the rights and responsibilities of consumers",
              elaborations: ["analysing consumer behaviour", "describing consumer rights", "explaining financial literacy"]
            }
          ]
        },
        achievementStandard: "Students describe medieval Europe and global connections. They explain biomes and global patterns. They describe citizenship and global connections. They explain market operations and consumer decisions."
      },
      "9": {
        year: 9,
        strands: {
          "History": [
            {
              id: "AC9HH9D01",
              strand: "History",
              topic: "Industrial Revolution",
              contentDescription: "explain causes and effects of the Industrial Revolution and describe changes in society and environment",
              elaborations: ["analysing technological changes", "explaining social impacts", "describing environmental effects"]
            },
            {
              id: "AC9HH9D02",
              strand: "History",
              topic: "World Wars",
              contentDescription: "describe the causes and effects of World War I and World War II and analyse how they shaped the modern world",
              elaborations: ["explaining WWI causes and effects", "describing WWII and the Holocaust", "analysing post-war changes"]
            }
          ],
          "Geography": [
            {
              id: "AC9HG9D01",
              strand: "Geography",
              topic: "Geographies of Interconnection",
              contentDescription: "analyse how environmental, economic and social factors affect places and explain strategies for managing environmental change",
              elaborations: ["analysing environmental challenges", "explaining economic factors", "proposing management strategies"]
            },
            {
              id: "AC9HG9D02",
              strand: "Geography",
              topic: "Urbanisation",
              contentDescription: "explain causes and consequences of urbanisation and evaluate strategies for creating sustainable cities",
              elaborations: ["describing urban growth patterns", "analysing urban challenges", "evaluating sustainability strategies"]
            }
          ],
          "Civics and Citizenship": [
            {
              id: "AC9HC9D01",
              strand: "Civics and Citizenship",
              topic: "Democracy",
              contentDescription: "evaluate the effectiveness of Australian democracy and explain challenges to democracy in contemporary contexts",
              elaborations: ["evaluating democratic processes", "analysing contemporary challenges", "proposing democratic improvements"]
            },
            {
              id: "AC9HC9D02",
              strand: "Civics and Citizenship",
              topic: "Law Reform",
              contentDescription: "explain how laws are made and changed, and evaluate the need for law reform",
              elaborations: ["describing law-making process", "analysing need for law reform", "evaluating reform proposals"]
            }
          ],
          "Economics and Business": [
            {
              id: "AC9HE9D01",
              strand: "Economics and Business",
              topic: "Economic Performance",
              contentDescription: "measure economic performance using indicators and explain factors that influence economic growth",
              elaborations: ["using GDP, unemployment and inflation", "explaining economic growth factors", "analysing economic policies"]
            },
            {
              id: "AC9HE9D02",
              strand: "Economics and Business",
              topic: "Global Economy",
              contentDescription: "explain the effects of global economic events and describe Australia's economic relationships with other economies",
              elaborations: ["analysing global economic events", "describing Australia's trade relationships", "explaining global economic interdependence"]
            }
          ]
        },
        achievementStandard: "Students explain causes and effects of the Industrial Revolution and World Wars. They analyse environmental factors and urbanisation. They evaluate democracy and law reform. They measure economic performance and explain global economic relationships."
      },
      "10": {
        year: 10,
        strands: {
          "History": [
            {
              id: "AC9HH10D01",
              strand: "History",
              topic: "Rights and Freedoms",
              contentDescription: "explain movements for rights and freedoms and evaluate their impact in Australia and the world",
              elaborations: ["analysing civil rights movements", "explaining Indigenous rights", "describing global human rights"]
            },
            {
              id: "AC9HH10D02",
              strand: "History",
              topic: "Cold War",
              contentDescription: "describe the Cold War and its effects on Australia and the Asia-Pacific region",
              elaborations: ["explaining Cold War tensions", "analysing ANZUS and SEATO", "describing regional impacts"]
            }
          ],
          "Geography": [
            {
              id: "AC9HG10D01",
              strand: "Geography",
              topic: "Environmental Change",
              contentDescription: "explain environmental changes and evaluate management strategies for environmental sustainability",
              elaborations: ["analysing climate change impacts", "evaluating sustainability strategies", "proposing environmental solutions"]
            },
            {
              id: "AC9HG10D02",
              strand: "Geography",
              topic: "Geopolitics",
              contentDescription: "analyse global geopolitics and explain Australia's position on contemporary global issues",
              elaborations: ["analysing global power dynamics", "explaining Australia's foreign policy", "evaluating international agreements"]
            }
          ],
          "Civics and Citizenship": [
            {
              id: "AC9HC10D01",
              strand: "Civics and Citizenship",
              topic: "Constitutional Change",
              contentDescription: "describe the process of constitutional change in Australia and evaluate proposals for reform",
              elaborations: ["explaining referendum process", "analysing Indigenous recognition", "evaluating constitutional proposals"]
            },
            {
              id: "AC9HC10D02",
              strand: "Civics and Citizenship",
              topic: "Political Participation",
              contentDescription: "evaluate how citizens can participate in democracy and explain ways to increase civic engagement",
              elaborations: ["analysing voter participation", "explaining civic engagement strategies", "proposing participation improvements"]
            }
          ],
          "Economics and Business": [
            {
              id: "AC9HE10D01",
              strand: "Economics and Business",
              topic: "Economic Policy",
              contentDescription: "analyse the effects of economic policies and evaluate the role of government in the economy",
              elaborations: ["analysing fiscal and monetary policy", "evaluating government interventions", "explaining policy impacts"]
            },
            {
              id: "AC9HE10D02",
              strand: "Economics and Business",
              topic: "Work and Careers",
              contentDescription: "describe trends in the workforce and explain how technological change and global factors affect employment",
              elaborations: ["analysing workforce trends", "explaining technological impacts", "describing future work skills"]
            }
          ]
        },
        achievementStandard: "Students explain movements for rights and freedoms and the Cold War. They analyse environmental change and geopolitics. They evaluate constitutional change and political participation. They analyse economic policy and workforce trends."
      }
    }
  },
  "Physics": {
    subject: "Physics",
    learningArea: "Science",
    yearLevels: {
      "11": {
        year: 11,
        strands: {
          "Kinematics": [
            {
              id: "AC-P11-K01",
              strand: "Kinematics",
              topic: "Motion in One Dimension",
              contentDescription: "describe and analyse motion in one dimension using equations of motion and graphical analysis",
              elaborations: ["analysing motion from graphs", "solving problems with equations of motion", "describing displacement, velocity and acceleration"]
            },
            {
              id: "AC-P11-K02",
              strand: "Kinematics",
              topic: "Motion in Two Dimensions",
              contentDescription: "describe and analyse projectile and circular motion",
              elaborations: ["analysing projectile motion", "describing circular motion", "solving two-dimensional motion problems"]
            }
          ],
          "Dynamics": [
            {
              id: "AC-P11-D01",
              strand: "Dynamics",
              topic: "Newton's Laws",
              contentDescription: "apply Newton's laws to analyse motion, including friction and inclined planes",
              elaborations: ["applying Newton's second law", "analysing friction forces", "solving problems on inclined planes"]
            },
            {
              id: "AC-P11-D02",
              strand: "Dynamics",
              topic: "Momentum",
              contentDescription: "describe and apply concepts of momentum, impulse and conservation of momentum",
              elaborations: ["calculating momentum and impulse", "applying conservation of momentum", "analysing collisions"]
            }
          ],
          "Energy and Work": [
            {
              id: "AC-P11-E01",
              strand: "Energy and Work",
              topic: "Work and Energy",
              contentDescription: "describe and calculate work, kinetic energy and potential energy",
              elaborations: ["calculating work done", "analysing kinetic and potential energy", "applying conservation of energy"]
            },
            {
              id: "AC-P11-E02",
              strand: "Energy and Work",
              topic: "Power",
              contentDescription: "describe and calculate power",
              elaborations: ["calculating power", "analysing power ratings", "solving power problems"]
            }
          ],
          "Waves": [
            {
              id: "AC-P11-W01",
              strand: "Waves",
              topic: "Wave Properties",
              contentDescription: "describe and analyse wave properties",
              elaborations: ["analysing wave behaviour", "explaining frequency and wavelength", "solving wave problems"]
            },
            {
              id: "AC-P11-W02",
              strand: "Waves",
              topic: "Sound",
              contentDescription: "describe and analyse sound waves",
              elaborations: ["explaining sound wave properties", "analysing the Doppler effect", "describing sound applications"]
            }
          ],
          "Electric Fields": [
            {
              id: "AC-P11-EF01",
              strand: "Electric Fields",
              topic: "Electric Force",
              contentDescription: "describe and calculate electric force and field strength",
              elaborations: ["calculating electric force", "analysing electric field", "solving electrostatic problems"]
            },
            {
              id: "AC-P11-EF02",
              strand: "Electric Fields",
              topic: "Electric Potential",
              contentDescription: "describe and calculate electric potential and potential difference",
              elaborations: ["calculating electric potential", "analysing potential difference", "solving potential problems"]
            }
          ]
        },
        achievementStandard: "Students describe and analyse motion using equations and graphical analysis. They apply Newton's laws to analyse motion. They apply conservation of energy and momentum. They describe and analyse wave properties and electric fields."
      },
      "12": {
        year: 12,
        strands: {
          "Gravitational and Electric Fields": [
            {
              id: "AC-P12-G01",
              strand: "Gravitational and Electric Fields",
              topic: "Gravitational Fields",
              contentDescription: "describe and analyse gravitational fields",
              elaborations: ["analysing gravitational field diagrams", "calculating gravitational field strength", "explaining gravitational potential"]
            },
            {
              id: "AC-P12-G02",
              strand: "Gravitational and Electric Fields",
              topic: "Electric Fields",
              contentDescription: "describe and analyse electric fields in detail",
              elaborations: ["analysing electric field patterns", "calculating field energy", "solving complex field problems"]
            }
          ],
          "Electromagnetism": [
            {
              id: "AC-P12-EM01",
              strand: "Electromagnetism",
              topic: "Magnetic Fields",
              contentDescription: "describe magnetic fields and the motor effect",
              elaborations: ["describing magnetic field patterns", "explaining the motor effect", "calculating magnetic force"]
            },
            {
              id: "AC-P12-EM02",
              strand: "Electromagnetism",
              topic: "Electromagnetic Induction",
              contentDescription: "describe and explain electromagnetic induction, Faraday's law and Lenz's law",
              elaborations: ["explaining electromagnetic induction", "applying Faraday's law", "analysing Lenz's law"]
            },
            {
              id: "AC-P12-EM03",
              strand: "Electromagnetism",
              topic: "Applications",
              contentDescription: "analyse generators, transformers and induced EMF",
              elaborations: ["analysing AC and DC generators", "explaining transformer operation", "calculating induced EMF"]
            }
          ],
          "Quantum Physics": [
            {
              id: "AC-P12-Q01",
              strand: "Quantum Physics",
              topic: "Wave-Particle Duality",
              contentDescription: "explain wave-particle duality",
              elaborations: ["explaining wave-particle duality", "calculating photon energy", "describing de Broglie wavelength"]
            },
            {
              id: "AC-P12-Q02",
              strand: "Quantum Physics",
              topic: "Photoelectric Effect",
              contentDescription: "describe the photoelectric effect",
              elaborations: ["explaining photoelectric effect", "calculating work function", "analysing frequency thresholds"]
            },
            {
              id: "AC-P12-Q03",
              strand: "Quantum Physics",
              topic: "Atomic Models",
              contentDescription: "describe the Bohr model of the atom and atomic energy levels",
              elaborations: ["explaining Bohr model", "describing atomic energy levels", "analysing spectral lines"]
            }
          ],
          "Special Relativity": [
            {
              id: "AC-P12-SR01",
              strand: "Special Relativity",
              topic: "Relativity Postulates",
              contentDescription: "explain the postulates of special relativity",
              elaborations: ["explaining time dilation", "describing length contraction", "analysing relativity principles"]
            },
            {
              id: "AC-P12-SR02",
              strand: "Special Relativity",
              topic: "Relativistic Effects",
              contentDescription: "calculate time dilation, length contraction",
              elaborations: ["calculating time dilation", "solving length contraction problems", "explaining relativistic mass"]
            },
            {
              id: "AC-P12-SR03",
              strand: "Special Relativity",
              topic: "Mass-Energy Equivalence",
              contentDescription: "describe and apply mass-energy equivalence, E = mc²",
              elaborations: ["applying E = mc²", "explaining nuclear energy", "analysing mass defect"]
            }
          ],
          "Nuclear Physics": [
            {
              id: "AC-P12-N01",
              strand: "Nuclear Physics",
              topic: "Nuclear Structure",
              contentDescription: "describe nuclear structure",
              elaborations: ["explaining nuclear structure", "calculating binding energy", "analysing nuclear stability"]
            },
            {
              id: "AC-P12-N02",
              strand: "Nuclear Physics",
              topic: "Radioactivity",
              contentDescription: "describe alpha, beta and gamma decay",
              elaborations: ["explaining decay types", "calculating half-life", "analysing radioactive decay"]
            },
            {
              id: "AC-P12-N03",
              strand: "Nuclear Physics",
              topic: "Nuclear Reactions",
              contentDescription: "describe nuclear fission and fusion",
              elaborations: ["explaining fission and fusion", "analysing stellar nucleosynthesis", "describing nuclear energy"]
            }
          ]
        },
        achievementStandard: "Students describe and analyse gravitational and electric fields in detail. They explain electromagnetic induction and its applications. They describe quantum physics, wave-particle duality and atomic models. They explain special relativity and nuclear physics."
      }
    }
  },
  "Chemistry": {
    subject: "Chemistry",
    learningArea: "Science",
    yearLevels: {
      "11": {
        year: 11,
        strands: {
          "Atomic Structure": [
            {
              id: "AC-C11-AS01",
              strand: "Atomic Structure",
              topic: "Quantum Theory",
              contentDescription: "explain quantum theory and electron configuration",
              elaborations: ["describing quantum numbers and orbitals", "explaining electron configuration rules", "analysing periodic trends"]
            },
            {
              id: "AC-C11-AS02",
              strand: "Atomic Structure",
              topic: "Periodicity",
              contentDescription: "analyse periodic trends",
              elaborations: ["explaining and calculating periodic trends", "relating trends to electron configuration", "predicting element properties"]
            }
          ],
          "Chemical Bonding": [
            {
              id: "AC-C11-BS01",
              strand: "Chemical Bonding",
              topic: "Ionic and Covalent",
              contentDescription: "explain ionic and covalent bonding",
              elaborations: ["explaining ionic bond formation", "describing covalent bond types", "analysing bonding in detail"]
            },
            {
              id: "AC-C11-BS02",
              strand: "Chemical Bonding",
              topic: "Intermolecular Forces",
              contentDescription: "describe intermolecular forces",
              elaborations: ["explaining van der Waals forces", "describing hydrogen bonding", "relating forces to properties"]
            }
          ],
          "Stoichiometry": [
            {
              id: "AC-C11-ST01",
              strand: "Stoichiometry",
              topic: "Mole Concept",
              contentDescription: "explain the mole concept",
              elaborations: ["calculating moles and mass", "explaining Avogadro's number", "performing mole calculations"]
            },
            {
              id: "AC-C11-ST02",
              strand: "Stoichiometry",
              topic: "Chemical Equations",
              contentDescription: "write and balance chemical equations",
              elaborations: ["writing balanced equations", "calculating limiting reagents", "performing yield calculations"]
            }
          ],
          "Reactions": [
            {
              id: "AC-C11-RX01",
              strand: "Reactions",
              topic: "Types of Reactions",
              contentDescription: "describe types of chemical reactions",
              elaborations: ["identifying reaction types", "writing ionic equations", "explaining redox reactions"]
            },
            {
              id: "AC-C11-RX02",
              strand: "Reactions",
              topic: "Oxidation and Reduction",
              contentDescription: "explain oxidation and reduction",
              elaborations: ["determining oxidation numbers", "writing half-equations", "balancing redox equations"]
            }
          ],
          "Energy Changes": [
            {
              id: "AC-C11-EC01",
              strand: "Energy Changes",
              topic: "Enthalpy",
              contentDescription: "describe and calculate enthalpy changes",
              elaborations: ["calculating enthalpy changes", "applying Hess's law", "drawing energy profiles"]
            },
            {
              id: "AC-C11-EC02",
              strand: "Energy Changes",
              topic: "Reaction Rates",
              contentDescription: "explain factors affecting reaction rates",
              elaborations: ["explaining rate factors", "describing collision theory", "analysing rate equations"]
            }
          ]
        },
        achievementStandard: "Students explain quantum theory, electron configuration and periodic trends. They describe ionic and covalent bonding and intermolecular forces. They perform stoichiometric calculations. They classify chemical reactions and explain enthalpy changes and reaction rates."
      },
      "12": {
        year: 12,
        strands: {
          "Equilibrium": [
            {
              id: "AC-C12-EQ01",
              strand: "Equilibrium",
              topic: "Chemical Equilibrium",
              contentDescription: "explain chemical equilibrium",
              elaborations: ["writing equilibrium constant expressions", "calculating equilibrium concentrations", "applying Le Chatelier's principle"]
            },
            {
              id: "AC-C12-EQ02",
              strand: "Equilibrium",
              topic: "Acids and Bases",
              contentDescription: "describe acid-base theories",
              elaborations: ["calculating pH and pOH", "explaining buffer action", "performing titration calculations"]
            }
          ],
          "Organic Chemistry": [
            {
              id: "AC-C12-OC01",
              strand: "Organic Chemistry",
              topic: "Organic Compounds",
              contentDescription: "describe organic compounds",
              elaborations: ["identifying functional groups", "naming organic compounds", "explaining isomerism"]
            },
            {
              id: "AC-C12-OC02",
              strand: "Organic Chemistry",
              topic: "Organic Reactions",
              contentDescription: "describe reactions of organic compounds",
              elaborations: ["predicting reaction products", "writing reaction mechanisms", "analysing reaction types"]
            }
          ],
          "Electrochemistry": [
            {
              id: "AC-C12-EL01",
              strand: "Electrochemistry",
              topic: "Galvanic Cells",
              contentDescription: "explain galvanic cells",
              elaborations: ["constructing galvanic cells", "calculating cell potential", "applying Nernst equation"]
            },
            {
              id: "AC-C12-EL02",
              strand: "Electrochemistry",
              topic: "Electrolytic Cells",
              contentDescription: "explain electrolytic cells",
              elaborations: ["explaining electrolysis", "applying Faraday's laws", "analysing industrial processes"]
            }
          ],
          "Chemical Analysis": [
            {
              id: "AC-C12-CA01",
              strand: "Chemical Analysis",
              topic: "Qualitative Analysis",
              contentDescription: "describe qualitative analysis",
              elaborations: ["identifying cations and anions", "performing flame tests", "explaining precipitation analysis"]
            },
            {
              id: "AC-C12-CA02",
              strand: "Chemical Analysis",
              topic: "Quantitative Analysis",
              contentDescription: "describe quantitative analysis",
              elaborations: ["performing acid-base titrations", "calculating concentrations", "explaining spectroscopic methods"]
            }
          ]
        },
        achievementStandard: "Students explain chemical equilibrium and acids and bases. They describe organic compounds and reactions. They explain galvanic and electrolytic cells. They perform qualitative and quantitative chemical analysis."
      }
    }
  },
  "Biology": {
    subject: "Biology",
    learningArea: "Science",
    yearLevels: {
      "11": {
        year: 11,
        strands: {
          "Cells": [
            {
              id: "AC-B11-CE01",
              strand: "Cells",
              topic: "Cell Structure",
              contentDescription: "describe cell structure and function",
              elaborations: ["describing organelle function", "explaining membrane transport", "analysing cell specialization"]
            },
            {
              id: "AC-B11-CE02",
              strand: "Cells",
              topic: "Exchange of Materials",
              contentDescription: "explain exchange of materials across membranes",
              elaborations: ["explaining diffusion and osmosis", "describing active transport", "analysing exchange surfaces"]
            }
          ],
          "Energy": [
            {
              id: "AC-B11-EL01",
              strand: "Energy",
              topic: "Photosynthesis",
              contentDescription: "describe photosynthesis",
              elaborations: ["explaining light reactions", "describing Calvin cycle", "analysing factors affecting photosynthesis"]
            },
            {
              id: "AC-B11-EL02",
              strand: "Energy",
              topic: "Cellular Respiration",
              contentDescription: "describe cellular respiration",
              elaborations: ["explaining aerobic and anaerobic respiration", "describing ATP production", "analysing respiratory pathways"]
            }
          ],
          "Homeostasis": [
            {
              id: "AC-B11-HS01",
              strand: "Homeostasis",
              topic: "Homeostatic Principles",
              contentDescription: "explain the principles of homeostasis",
              elaborations: ["describing feedback loops", "explaining negative and positive feedback", "analysing homeostatic mechanisms"]
            },
            {
              id: "AC-B11-HS02",
              strand: "Homeostasis",
              topic: "Control Systems",
              contentDescription: "describe the nervous and endocrine systems",
              elaborations: ["explaining nerve impulse transmission", "describing hormone action", "analysing coordination mechanisms"]
            }
          ],
          "Diversity": [
            {
              id: "AC-B11-DC01",
              strand: "Diversity",
              topic: "Classification",
              contentDescription: "describe biological classification",
              elaborations: ["explaining taxonomic hierarchy", "describing phylogenetic trees", "analysing evolutionary relationships"]
            },
            {
              id: "AC-B11-DC02",
              strand: "Diversity",
              topic: "Biodiversity",
              contentDescription: "explain biodiversity",
              elaborations: ["measuring biodiversity", "explaining species richness", "evaluating conservation strategies"]
            }
          ]
        },
        achievementStandard: "Students describe cell structure, function and membrane transport. They explain photosynthesis and cellular respiration. They describe homeostasis and control systems. They explain biological classification and biodiversity."
      },
      "12": {
        year: 12,
        strands: {
          "Genetics": [
            {
              id: "AC-B12-GN01",
              strand: "Genetics",
              topic: "DNA and Gene Expression",
              contentDescription: "describe DNA structure and gene expression",
              elaborations: ["explaining DNA replication", "describing transcription and translation", "analysing gene expression"]
            },
            {
              id: "AC-B12-GN02",
              strand: "Genetics",
              topic: "Inheritance",
              contentDescription: "explain patterns of inheritance",
              elaborations: ["analysing Mendel's laws", "explaining linkage and crossing over", "describing polygenic inheritance"]
            },
            {
              id: "AC-B12-GN03",
              strand: "Genetics",
              topic: "Gene Technologies",
              contentDescription: "describe DNA technologies",
              elaborations: ["explaining PCR and cloning", "describing genetic engineering techniques", "analysing gene technologies"]
            }
          ],
          "Evolution": [
            {
              id: "AC-B12-EV01",
              strand: "Evolution",
              topic: "Mechanisms of Evolution",
              contentDescription: "explain mechanisms of evolution",
              elaborations: ["analysing natural selection", "explaining genetic drift", "describing speciation mechanisms"]
            },
            {
              id: "AC-B12-EV02",
              strand: "Evolution",
              topic: "Evidence for Evolution",
              contentDescription: "describe evidence for evolution",
              elaborations: ["analysing fossil evidence", "explaining comparative anatomy", "describing molecular evidence"]
            }
          ],
          "Ecology": [
            {
              id: "AC-B12-EC01",
              strand: "Ecology",
              topic: "Ecosystem Dynamics",
              contentDescription: "describe ecosystem dynamics",
              elaborations: ["analysing energy flow", "explaining carbon and nitrogen cycles", "describing ecosystem productivity"]
            },
            {
              id: "AC-B12-EC02",
              strand: "Ecology",
              topic: "Population Ecology",
              contentDescription: "explain population dynamics",
              elaborations: ["analysing population growth", "explaining carrying capacity", "describing population dynamics"]
            },
            {
              id: "AC-B12-EC03",
              strand: "Ecology",
              topic: "Conservation",
              contentDescription: "describe conservation biology",
              elaborations: ["evaluating conservation strategies", "explaining habitat management", "analysing biodiversity loss"]
            }
          ]
        },
        achievementStandard: "Students describe DNA, gene expression and inheritance patterns. They explain mechanisms of evolution and evidence. They describe ecosystem dynamics and conservation."
      }
    }
  },
  "History": {
    subject: "History",
    learningArea: "Humanities and Social Sciences",
    yearLevels: {
      "11": {
        year: 11,
        strands: {
          "Modern History": [
            {
              id: "AC-HI11-01",
              strand: "Modern History",
              topic: "World War I",
              contentDescription: "analyse World War I",
              elaborations: ["analysing causes of WWI", "examining key battles", "evaluating Treaty of Versailles"]
            },
            {
              id: "AC-HI11-02",
              strand: "Modern History",
              topic: "Interwar Period",
              contentDescription: "describe the interwar period",
              elaborations: ["explaining economic impacts of Great Depression", "analysing rise of totalitarian regimes", "describing causes of WWII"]
            }
          ]
        },
        achievementStandard: "Students analyse World War I and its aftermath. They explain the interwar period, including the Great Depression and rise of authoritarian regimes."
      },
      "12": {
        year: 12,
        strands: {
          "Modern History": [
            {
              id: "AC-HI12-01",
              strand: "Modern History",
              topic: "World War II",
              contentDescription: "analyse World War II",
              elaborations: ["analysing causes of WWII", "examining key campaigns", "evaluating post-war order"]
            },
            {
              id: "AC-HI12-02",
              strand: "Modern History",
              topic: "The Cold War",
              contentDescription: "describe the Cold War era",
              elaborations: ["analysing Cold War tensions", "explaining nuclear age", "describing collapse of USSR"]
            },
            {
              id: "AC-HI12-03",
              strand: "Modern History",
              topic: "Movements and Change",
              contentDescription: "analyse social movements",
              elaborations: ["analysing civil rights movements", "explaining feminist movement", "describing environmental movement"]
            }
          ]
        },
        achievementStandard: "Students analyse World War II and the Cold War. They explain global movements and social change."
      }
    }
  },
  "Geography": {
    subject: "Geography",
    learningArea: "Humanities and Social Sciences",
    yearLevels: {
      "11": {
        year: 11,
        strands: {
          "Biophysical": [
            {
              id: "AC-GE11-01",
              strand: "Biophysical",
              topic: "Earth's Surface",
              contentDescription: "analyse physical processes shaping Earth's surface",
              elaborations: ["analysing weathering processes", "explaining erosion and deposition", "describing tectonic activity"]
            },
            {
              id: "AC-GE11-02",
              strand: "Biophysical",
              topic: "Climate and Weather",
              contentDescription: "analyse climate and weather systems",
              elaborations: ["explaining atmospheric circulation", "analysing oceanic currents", "describing climate patterns"]
            },
            {
              id: "AC-GE11-03",
              strand: "Biophysical",
              topic: "Ecosystems",
              contentDescription: "analyse ecosystem dynamics",
              elaborations: ["explaining energy flows", "analysing nutrient cycles", "describing ecological succession"]
            }
          ],
          "Human": [
            {
              id: "AC-GE11-04",
              strand: "Human",
              topic: "Population",
              contentDescription: "analyse population distribution and growth",
              elaborations: ["analysing population patterns", "explaining demographic transition", "describing migration trends"]
            },
            {
              id: "AC-GE11-05",
              strand: "Human",
              topic: "Urbanisation",
              contentDescription: "analyse urbanisation patterns",
              elaborations: ["explaining urban growth", "analysing urbanisation patterns", "describing megacities"]
            }
          ]
        },
        achievementStandard: "Students analyse physical processes shaping Earth's surface, climate systems and ecosystems. They describe population and urbanisation."
      },
      "12": {
        year: 12,
        strands: {
          "Sustainability": [
            {
              id: "AC-GE12-01",
              strand: "Sustainability",
              topic: "Environmental Challenges",
              contentDescription: "analyse global environmental challenges",
              elaborations: ["analysing climate change impacts", "explaining biodiversity loss", "describing resource challenges"]
            },
            {
              id: "AC-GE12-02",
              strand: "Sustainability",
              topic: "Sustainable Solutions",
              contentDescription: "evaluate sustainable solutions",
              elaborations: ["evaluating environmental policies", "analysing sustainable practices", "describing global initiatives"]
            }
          ],
          "Interconnection": [
            {
              id: "AC-GE12-03",
              strand: "Interconnection",
              topic: "Global Networks",
              contentDescription: "analyse global networks",
              elaborations: ["analysing global trade networks", "explaining cultural globaliszation", "describing political interconnections"]
            }
          ]
        },
        achievementStandard: "Students analyse global environmental challenges and evaluate sustainable solutions. They explain global networks."
      }
    }
  },
  "Economics": {
    subject: "Economics",
    learningArea: "Humanities and Social Sciences",
    yearLevels: {
      "11": {
        year: 11,
        strands: {
          "Introduction": [
            {
              id: "AC-EC11-01",
              strand: "Introduction",
              topic: "Fundamental Concepts",
              contentDescription: "explain fundamental economic concepts",
              elaborations: ["analysing the economic problem", "calculating opportunity cost", "explaining resource allocation"]
            },
            {
              id: "AC-EC11-02",
              strand: "Introduction",
              topic: "Economic Models",
              contentDescription: "describe economic models",
              elaborations: ["applying PPF analysis", "explaining efficiency and trade-offs", "analysing economic growth"]
            }
          ],
          "Microeconomics": [
            {
              id: "AC-EC11-03",
              strand: "Microeconomics",
              topic: "Demand and Supply",
              contentDescription: "explain demand and supply",
              elaborations: ["analysing demand determinants", "explaining supply determinants", "calculating elasticity"]
            },
            {
              id: "AC-EC11-04",
              strand: "Microeconomics",
              topic: "Market Structures",
              contentDescription: "describe different market structures",
              elaborations: ["comparing market structures", "analysing perfect competition", "explaining monopoly power"]
            }
          ],
          "Macroeconomics": [
            {
              id: "AC-EC11-05",
              strand: "Macroeconomics",
              topic: "Macroeconomic Concepts",
              contentDescription: "describe macroeconomic indicators",
              elaborations: ["calculating GDP", "measuring unemployment", "explaining inflation measurement"]
            },
            {
              id: "AC-EC11-06",
              strand: "Macroeconomics",
              topic: "Aggregate Demand and Supply",
              contentDescription: "explain aggregate demand and supply",
              elaborations: ["analysing aggregate demand", "explaining aggregate supply", "describing macroeconomic equilibrium"]
            }
          ]
        },
        achievementStandard: "Students explain fundamental economic concepts and economic models. They describe demand, supply and market structures. They explain macroeconomic indicators and aggregate demand and supply."
      },
      "12": {
        year: 12,
        strands: {
          "Microeconomics": [
            {
              id: "AC-EC12-01",
              strand: "Microeconomics",
              topic: "Theory of the Firm",
              contentDescription: "explain the theory of the firm",
              elaborations: ["analysing production and costs", "explaining revenue curves", "calculating profit maximisation"]
            },
            {
              id: "AC-EC12-02",
              strand: "Microeconomics",
              topic: "Labour Markets",
              contentDescription: "describe labour markets",
              elaborations: ["explaining wage determination", "analysing labour market outcomes", "describing employment patterns"]
            }
          ],
          "Macroeconomics": [
            {
              id: "AC-EC12-03",
              strand: "Macroeconomics",
              topic: "Economic Performance",
              contentDescription: "analyse economic performance",
              elaborations: ["analysing economic growth", "explaining fluctuations", "evaluating performance indicators"]
            },
            {
              id: "AC-EC12-04",
              strand: "Macroeconomics",
              topic: "Fiscal Policy",
              contentDescription: "explain fiscal policy",
              elaborations: ["explaining budget components", "analysing fiscal impact", "evaluating policy effectiveness"]
            },
            {
              id: "AC-EC12-05",
              strand: "Macroeconomics",
              topic: "Monetary Policy",
              contentDescription: "explain monetary policy",
              elaborations: ["explaining monetary policy tools", "analysing interest rate changes", "evaluating monetary policy effectiveness"]
            }
          ],
          "International": [
            {
              id: "AC-EC12-06",
              strand: "International",
              topic: "International Trade",
              contentDescription: "explain international trade",
              elaborations: ["analysing trade benefits", "explaining trade patterns", "describing trade agreements"]
            },
            {
              id: "AC-EC12-07",
              strand: "International",
              topic: "Exchange Rates",
              contentDescription: "explain exchange rates",
              elaborations: ["explaining exchange rate determination", "analysing currency fluctuations", "describing balance of payments"]
            }
          ]
        },
        achievementStandard: "Students explain theory of the firm and labour markets. They analyse economic performance and describe fiscal and monetary policy. They explain international trade and exchange rates."
      }
    }
  },
  "Business": {
    subject: "Business",
    learningArea: "Humanities and Social Sciences",
    yearLevels: {
      "11": {
        year: 11,
        strands: {
          "Fundamentals": [
            {
              id: "AC-BU11-01",
              strand: "Fundamentals",
              topic: "Nature of Business",
              contentDescription: "explain the nature and purpose of business",
              elaborations: ["explaining business objectives", "describing business role in economy", "analysing stakeholder interests"]
            },
            {
              id: "AC-BU11-02",
              strand: "Fundamentals",
              topic: "Business Types",
              contentDescription: "compare different types of business structures",
              elaborations: ["comparing ownership structures", "explaining legal requirements", "analysing advantages and disadvantages"]
            }
          ],
          "Planning": [
            {
              id: "AC-BU11-03",
              strand: "Planning",
              topic: "Business Plan Components",
              contentDescription: "describe the components of a business plan",
              elaborations: ["describing executive summary", "explaining market analysis", "analysing financial projections"]
            },
            {
              id: "AC-BU11-04",
              strand: "Planning",
              topic: "Market Research",
              contentDescription: "explain the importance of market research",
              elaborations: ["explaining market research methods", "describing data collection", "analysing market information"]
            }
          ],
          "Marketing": [
            {
              id: "AC-BU11-05",
              strand: "Marketing",
              topic: "Marketing Fundamentals",
              contentDescription: "explain the marketing process",
              elaborations: ["describing market segmentation", "explaining targeting and positioning", "analysing the 4 Ps"]
            },
            {
              id: "AC-BU11-06",
              strand: "Marketing",
              topic: "Consumer Behaviour",
              contentDescription: "describe factors influencing consumer behaviour",
              elaborations: ["explaining consumer decision process", "analysing buying motives", "describing consumer trends"]
            }
          ],
          "Finance": [
            {
              id: "AC-BU11-07",
              strand: "Finance",
              topic: "Financial Records",
              contentDescription: "explain financial records and basic financial statements",
              elaborations: ["explaining income statements", "describing balance sheets", "analysing cash flow"]
            },
            {
              id: "AC-BU11-08",
              strand: "Finance",
              topic: "Financial Analysis",
              contentDescription: "analyse financial performance using key ratios",
              elaborations: ["calculating profitability ratios", "explaining liquidity ratios", "analysing efficiency ratios"]
            }
          ]
        },
        achievementStandard: "Students explain the nature and purpose of business. They describe business planning and marketing. They explain financial records and analyse financial performance."
      },
      "12": {
        year: 12,
        strands: {
          "Operations": [
            {
              id: "AC-BU12-01",
              strand: "Operations",
              topic: "Operations Management",
              contentDescription: "explain operations management",
              elaborations: ["describing production processes", "explaining quality management", "analysing inventory systems"]
            }
          ],
          "Finance": [
            {
              id: "AC-BU12-02",
              strand: "Finance",
              topic: "Financial Management",
              contentDescription: "explain financial management",
              elaborations: ["explaining financing options", "analysing investment decisions", "describing capital budgeting"]
            },
            {
              id: "AC-BU12-03",
              strand: "Finance",
              topic: "Risk Management",
              contentDescription: "explain business risk and strategies for managing risk",
              elaborations: ["identifying business risks", "explaining risk management strategies", "analysing insurance and hedging"]
            }
          ],
          "Strategy": [
            {
              id: "AC-BU12-04",
              strand: "Strategy",
              topic: "Strategic Management",
              contentDescription: "explain strategic management",
              elaborations: ["analysing competitive environment", "explaining strategy options", "describing strategic implementation"]
            },
            {
              id: "AC-BU12-05",
              strand: "Strategy",
              topic: "Growth Strategies",
              contentDescription: "describe strategies for business growth",
              elaborations: ["explaining organic growth", "analysing mergers and acquisitions", "describing expansion strategies"]
            }
          ],
          "Human Resources": [
            {
              id: "AC-BU12-06",
              strand: "Human Resources",
              topic: "Workforce Planning",
              contentDescription: "explain human resource management",
              elaborations: ["explaining recruitment process", "describing training methods", "analysing performance management"]
            },
            {
              id: "AC-BU12-07",
              strand: "Human Resources",
              topic: "Industrial Relations",
              contentDescription: "explain workplace relations",
              elaborations: ["explaining workplace legislation", "describing employee rights", "analysing industrial disputes"]
            }
          ]
        },
        achievementStandard: "Students explain operations management, financial management, strategic management and human resource management."
      }
    }
  }
};
