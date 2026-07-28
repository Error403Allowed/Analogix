import type { CurriculumSubject } from "./types.js";

export const Science: Record<string, CurriculumSubject> = {
  Science: {
    subject: "Science",
    learningArea: "Science",
    yearLevels: {
      "7": {
        year: 7,
        strands: {
          "Physics": [
            {
              id: "AC9S7U01",
              strand: "Physics",
              topic: "Forces and Motion",
              contentDescription: "describe and predict the effect of forces, including gravity, on the motion of objects",
              elaborations: ["identifying forces acting on objects", "describing the effect of friction", "predicting motion from force diagrams"]
            },
            {
              id: "AC9S7U02",
              strand: "Physics",
              topic: "Energy",
              contentDescription: "describe the relationship between temperature and the movement of particles in objects and examples of heat transfer",
              elaborations: ["explaining conduction, convection and radiation", "describing particle movement in heating", "investigating heat transfer"]
            }
          ],
          "Chemistry": [
            {
              id: "AC9S7C01",
              strand: "Chemistry",
              topic: "Particle Theory",
              contentDescription: "describe the particle nature of matter and explain differences in physical properties of solids, liquids and gases",
              elaborations: ["using particle theory to explain states of matter", "explaining changes of state", "relating particle arrangement to properties"]
            },
            {
              id: "AC9S7C02",
              strand: "Chemistry",
              topic: "Pure Substances",
              contentDescription: "distinguish between pure substances and mixtures, and describe methods to separate mixtures",
              elaborations: ["identifying pure substances vs mixtures", "describing filtration, evaporation, chromatography", "separating mixtures"]
            }
          ],
          "Biology": [
            {
              id: "AC9S7B01",
              strand: "Biology",
              topic: "Cells",
              contentDescription: "describe the structure and function of cells as the basic unit of living things",
              elaborations: ["identifying cell structures and functions", "comparing plant and animal cells", "explaining cell processes"]
            },
            {
              id: "AC9S7B02",
              strand: "Biology",
              topic: "Ecosystems",
              contentDescription: "describe interactions between organisms in food webs and explain how matter and energy flow through ecosystems",
              elaborations: ["constructing food webs", "explaining energy flow in ecosystems", "describing population dynamics"]
            }
          ],
          "Earth Science": [
            {
              id: "AC9S7E01",
              strand: "Earth Science",
              topic: "Earth's Resources",
              contentDescription: "describe the renewable and non-renewable resources from Earth and evaluate practices that affect sustainability",
              elaborations: ["identifying renewable and non-renewable resources", "explaining sustainability practices", "evaluating resource use"]
            }
          ]
        },
        achievementStandard: "Students describe forces and predict motion, explain heat transfer, use particle theory to explain states of matter, separate mixtures, describe cells and ecosystems, and explain Earth's resources and sustainability."
      },
      "8": {
        year: 8,
        strands: {
          "Physics": [
            {
              id: "AC9S8U01",
              strand: "Physics",
              topic: "Light and Sound",
              contentDescription: "explain how light and sound are produced, transmitted and detected, and describe the wave model for these phenomena",
              elaborations: ["explaining light reflection and refraction", "describing sound wave properties", "comparing light and sound as waves"]
            },
            {
              id: "AC9S8U02",
              strand: "Physics",
              topic: "Electricity",
              contentDescription: "explain how electric currents are produced and describe the components of simple circuits",
              elaborations: ["describing series and parallel circuits", "explaining voltage, current and resistance", "investigating electrical conduction"]
            }
          ],
          "Chemistry": [
            {
              id: "AC9S8C01",
              strand: "Chemistry",
              topic: "Chemical Reactions",
              contentDescription: "describe chemical reactions as rearrangements of atoms and predict outcomes of simple reactions",
              elaborations: ["identifying reactants and products", "balancing simple equations", "predicting products of reactions"]
            },
            {
              id: "AC9S8C02",
              strand: "Chemistry",
              topic: "Periodic Table",
              contentDescription: "describe the structure of the periodic table and explain patterns in properties of elements",
              elaborations: ["identifying groups and periods", "explaining metal and non-metal properties", "predicting element properties from position"]
            }
          ],
          "Biology": [
            {
              id: "AC9S8B01",
              strand: "Biology",
              topic: "Cell Processes",
              contentDescription: "explain the processes of photosynthesis and respiration, and describe factors that affect them",
              elaborations: ["describing photosynthesis equation and process", "explaining cellular respiration", "comparing photosynthesis and respiration"]
            },
            {
              id: "AC9S8B02",
              strand: "Biology",
              topic: "Classification",
              contentDescription: "describe the classification of living things and explain how binomial nomenclature is used",
              elaborations: ["explaining the kingdoms of living things", "using dichotomous keys", "applying binomial nomenclature"]
            }
          ],
          "Earth Science": [
            {
              id: "AC9S8E01",
              strand: "Earth Science",
              topic: "Plate Tectonics",
              contentDescription: "explain the movement of tectonic plates and describe the formation of landforms and geological events",
              elaborations: ["describing plate boundaries and their effects", "explaining earthquake and volcano formation", "relating plate movement to landforms"]
            }
          ]
        },
        achievementStandard: "Students explain light and sound using wave theory, describe simple circuits, explain chemical reactions and periodic table patterns, describe photosynthesis and respiration, classify living things, and explain plate tectonics."
      },
      "9": {
        year: 9,
        strands: {
          "Physics": [
            {
              id: "AC9S9U01",
              strand: "Physics",
              topic: "Newton's Laws",
              contentDescription: "describe and predict motion using Newton's three laws and explain the relationship between force, mass and acceleration",
              elaborations: ["applying Newton's first law (inertia)", "using F = ma for calculations", "explaining action-reaction pairs"]
            },
            {
              id: "AC9S9U02",
              strand: "Physics",
              topic: "Energy Transfer",
              contentDescription: "describe energy conservation and transformation, and explain how energy efficiency is calculated",
              elaborations: ["calculating energy transformations", "explaining conservation of energy", "determining efficiency of systems"]
            }
          ],
          "Chemistry": [
            {
              id: "AC9S9C01",
              strand: "Chemistry",
              topic: "Atomic Structure",
              contentDescription: "describe the structure of atoms, including protons, neutrons and electrons, and explain how elements are represented in the periodic table",
              elaborations: ["describing subatomic particles", "explaining isotope notation", "relating electron configuration to periodic table"]
            },
            {
              id: "AC9S9C02",
              strand: "Chemistry",
              topic: "Chemical Bonding",
              contentDescription: "explain how atoms bond to form molecules and ionic compounds, and describe the properties of these substances",
              elaborations: ["explaining ionic bonding", "describing covalent bonding", "relating bonding to properties"]
            },
            {
              id: "AC9S9C03",
              strand: "Chemistry",
              topic: "Chemical Reactions",
              contentDescription: "write balanced chemical equations for reactions and describe factors that affect reaction rate",
              elaborations: ["writing skeleton and balanced equations", "explaining factors affecting rate (temperature, concentration, catalyst)", "calculating reaction rates"]
            }
          ],
          "Biology": [
            {
              id: "AC9S9B01",
              strand: "Biology",
              topic: "DNA and Inheritance",
              contentDescription: "explain the structure of DNA and its role in inheritance, and describe patterns of inheritance",
              elaborations: ["describing DNA structure and replication", "explaining genes and alleles", "predicting offspring traits using Punnett squares"]
            },
            {
              id: "AC9S9B02",
              strand: "Biology",
              topic: "Evolution",
              contentDescription: "explain the theory of evolution by natural selection and describe evidence that supports it",
              elaborations: ["describing natural selection", "explaining adaptation and speciation", "identifying evidence for evolution (fossils, comparative anatomy)"]
            }
          ],
          "Earth Science": [
            {
              id: "AC9S9E01",
              strand: "Earth Science",
              topic: "Climate Science",
              contentDescription: "explain the greenhouse effect and describe human impacts on climate, including the carbon cycle",
              elaborations: ["explaining the greenhouse effect mechanism", "describing the carbon cycle", "analysing human impacts on climate"]
            }
          ]
        },
        achievementStandard: "Students apply Newton's laws to predict motion, describe energy transformation, explain atomic structure and bonding, write balanced equations, explain inheritance and evolution, and describe climate science and the greenhouse effect."
      },
      "10": {
        year: 10,
        strands: {
          "Physics": [
            {
              id: "AC9S10U01",
              strand: "Physics",
              topic: "Waves and Fields",
              contentDescription: "describe the wave nature of light, sound and electromagnetic radiation, and explain fields as a way to describe forces at a distance",
              elaborations: ["comparing longitudinal and transverse waves", "explaining electromagnetic spectrum", "describing gravitational and electric fields"]
            },
            {
              id: "AC9S10U02",
              strand: "Physics",
              topic: "Electric and Magnetic Fields",
              contentDescription: "explain how electric currents produce magnetic fields and describe applications including motors and generators",
              elaborations: ["explaining electromagnetism", "describing electric motors and generators", "calculating magnetic force on moving charges"]
            },
            {
              id: "AC9S10U03",
              strand: "Physics",
              topic: "Special Relativity",
              contentDescription: "describe Einstein's theory of special relativity, including time dilation and length contraction at speeds approaching the speed of light",
              elaborations: ["explaining time dilation", "describing length contraction", "calculating using the Lorentz factor"]
            }
          ],
          "Chemistry": [
            {
              id: "AC9S10C01",
              strand: "Chemistry",
              topic: "Atomic Theory",
              contentDescription: "explain the development of atomic theory and describe the quantum mechanical model of the atom",
              elaborations: ["describing Bohr model limitations", "explaining electron configuration using quantum numbers", "relating electron arrangement to chemical properties"]
            },
            {
              id: "AC9S10C02",
              strand: "Chemistry",
              topic: "Chemical Equilibrium",
              contentDescription: "explain chemical equilibrium and calculate equilibrium constants, including for acid-base reactions",
              elaborations: ["describing reversible reactions", "writing equilibrium constant expressions", "applying Le Chatelier's principle"]
            },
            {
              id: "AC9S10C03",
              strand: "Chemistry",
              topic: "Organic Chemistry",
              contentDescription: "describe the structure and naming of organic compounds, including alkanes, alkenes, alcohols and carboxylic acids",
              elaborations: ["naming hydrocarbon isomers", "describing functional groups", "explaining polymerisation reactions"]
            }
          ],
          "Biology": [
            {
              id: "AC9S10B01",
              strand: "Biology",
              topic: "Homeostasis",
              contentDescription: "explain how the body maintains homeostasis through feedback mechanisms, including temperature, blood glucose and water balance",
              elaborations: ["describing negative feedback loops", "explaining thermoregulation", "describing hormonal regulation of glucose"]
            },
            {
              id: "AC9S10B02",
              strand: "Biology",
              topic: "Immune System",
              contentDescription: "describe the immune system and explain how vaccinations provide immunity",
              elaborations: ["describing innate and adaptive immunity", "explaining how vaccines work", "analysing immune responses"]
            },
            {
              id: "AC9S10B03",
              strand: "Biology",
              topic: "Biotechnology",
              contentDescription: "describe applications of DNA technology, including genetic engineering and DNA sequencing",
              elaborations: ["explaining PCR and gel electrophoresis", "describing genetic modification", "analysing ethical implications of biotechnology"]
            }
          ],
          "Earth Science": [
            {
              id: "AC9S10E01",
              strand: "Earth Science",
              topic: "宇宙论",
              contentDescription: "describe the evidence for the Big Bang theory and the formation of elements in stars",
              elaborations: ["explaining evidence for the Big Bang", "describing stellar nucleosynthesis", "explaining the age and scale of the universe"]
            },
            {
              id: "AC9S10E02",
              strand: "Earth Science",
              topic: "地球系统",
              contentDescription: "describe how Earth's spheres interact and explain the water, carbon and nitrogen cycles",
              elaborations: ["explaining interactions between biosphere, hydrosphere, atmosphere and lithosphere", "describing carbon and nitrogen cycles", "analysing human impacts on Earth systems"]
            }
          ]
        },
        achievementStandard: "Students explain wave phenomena, electromagnetic induction and special relativity. They describe atomic theory, chemical equilibrium and organic chemistry. They explain homeostasis, immunity and biotechnology. They describe the Big Bang, Earth's systems and biogeochemical cycles."
      }
    }
  },
  "Digital Technologies": {
    subject: "Digital Technologies",
    learningArea: "Technologies",
    yearLevels: {
      "7": {
        year: 7,
        strands: {
          "Data and Information": [
            {
              id: "AC9TDI7D01",
              strand: "Data and Information",
              topic: "Data Representation",
              contentDescription: "explain how digital systems represent data using binary and represent text using different encoding systems",
              elaborations: ["converting between decimal and binary", "explaining ASCII and Unicode encoding", "describing how images and sound are represented digitally"]
            },
            {
              id: "AC9TDI7D02",
              strand: "Data and Information",
              topic: "Data Analysis",
              contentDescription: "collect, clean and visualise data from digital sources to identify patterns and inform decisions",
              elaborations: ["using spreadsheets to analyse data", "creating charts and graphs from data", "cleaning and preparing data for analysis"]
            }
          ],
          "Creating Digital Solutions": [
            {
              id: "AC9TDI7K01",
              strand: "Creating Digital Solutions",
              topic: "Algorithms",
              contentDescription: "design and trace algorithms using pseudocode and flowcharts, including iteration and selection",
              elaborations: ["writing pseudocode for simple algorithms", "drawing flowcharts for decision-making", "using loops in algorithms"]
            },
            {
              id: "AC9TDI7K02",
              strand: "Creating Digital Solutions",
              topic: "Programming",
              contentDescription: "implement and modify programs using a programming language, including input, output and control structures",
              elaborations: ["writing programs with user input", "using if-else statements for decisions", "implementing loops in code"]
            }
          ]
        },
        achievementStandard: "Students explain how digital systems represent data, collect and visualise data, design algorithms and implement basic programs."
      },
      "8": {
        year: 8,
        strands: {
          "Data and Information": [
            {
              id: "AC9TDI8D01",
              strand: "Data and Information",
              topic: "Data Security",
              contentDescription: "explain how data is transmitted and secured in networks, and describe methods to protect digital systems",
              elaborations: ["describing how data is transmitted over networks", "explaining encryption and cybersecurity basics", "identifying threats to digital systems"]
            },
            {
              id: "AC9TDI8D02",
              strand: "Data and Information",
              topic: "Data Systems",
              contentDescription: "explain the relationship between data, information and knowledge, and evaluate data quality for decision-making",
              elaborations: ["distinguishing between data, information and knowledge", "evaluating data quality and reliability", "using data to inform decisions"]
            }
          ],
          "Creating Digital Solutions": [
            {
              id: "AC9TDI8K01",
              strand: "Creating Digital Solutions",
              topic: "Advanced Algorithms",
              contentDescription: "design and implement algorithms using nested iteration and multiple selection structures",
              elaborations: ["using nested loops in algorithms", "implementing complex selection structures", "tracing and debugging algorithms"]
            },
            {
              id: "AC9TDI8K02",
              strand: "Creating Digital Solutions",
              topic: "Object-Oriented Programming",
              contentDescription: "describe the relationship between objects and classes, and implement programs using classes and objects",
              elaborations: ["defining classes with attributes and methods", "creating objects from classes", "using constructors and encapsulation"]
            }
          ]
        },
        achievementStandard: "Students explain data transmission and security, evaluate data quality, design complex algorithms and implement object-oriented programs."
      },
      "9": {
        year: 9,
        strands: {
          "Data and Information": [
            {
              id: "AC9TDI9D01",
              strand: "Data and Information",
              topic: "Data Analysis",
              contentDescription: "analyse and interpret data using big data concepts and techniques to identify patterns and inform decisions",
              elaborations: ["processing large datasets", "identifying trends in data", "using data analytics techniques"]
            },
            {
              id: "AC9TDI9D02",
              strand: "Data and Information",
              topic: "Data Privacy",
              contentDescription: "explain privacy and security requirements for data, and evaluate the ethical implications of data collection and use",
              elaborations: ["describing data privacy principles", "evaluating data collection practices", "analysing ethical implications"]
            }
          ],
          "Creating Digital Solutions": [
            {
              id: "AC9TDI9K01",
              strand: "Creating Digital Solutions",
              topic: "Software Development",
              contentDescription: "design and develop software solutions using appropriate algorithms and data structures, and use version control",
              elaborations: ["using appropriate data structures for problems", "implementing version control for projects", "applying software development lifecycle"]
            },
            {
              id: "AC9TDI9K02",
              strand: "Creating Digital Solutions",
              topic: "Interactive Solutions",
              contentDescription: "create interactive solutions for defined purposes, incorporating user experience principles and appropriate programming techniques",
              elaborations: ["applying user experience design principles", "creating interactive interfaces", "testing and evaluating solutions"]
            }
          ]
        },
        achievementStandard: "Students analyse big data, evaluate data privacy implications, design software solutions with appropriate data structures and create interactive solutions."
      },
      "10": {
        year: 10,
        strands: {
          "Data and Information": [
            {
              id: "AC9TDI10D01",
              strand: "Data and Information",
              topic: "Database Systems",
              contentDescription: "design and implement relational databases using SQL, including queries, relationships and normalisation",
              elaborations: ["creating database schemas", "writing SQL queries", "normalising databases to reduce redundancy"]
            },
            {
              id: "AC9TDI10D02",
              strand: "Data and Information",
              topic: "Data Analytics",
              contentDescription: "apply data analytics techniques, including machine learning concepts, to interpret and visualise data",
              elaborations: ["applying machine learning to data", "visualising data for insights", "interpreting analytical results"]
            }
          ],
          "Creating Digital Solutions": [
            {
              id: "AC9TDI10K01",
              strand: "Creating Digital Solutions",
              topic: "Systems Development",
              contentDescription: "design and develop comprehensive digital solutions, including testing, documentation and evaluation",
              elaborations: ["applying software engineering practices", "writing technical documentation", "testing and evaluating solutions"]
            },
            {
              id: "AC9TDI10K02",
              strand: "Creating Digital Solutions",
              topic: "Emerging Technologies",
              contentDescription: "investigate emerging digital technologies and evaluate their applications and implications",
              elaborations: ["exploring AI and machine learning", "investigating IoT and automation", "evaluating social implications"]
            }
          ]
        },
        achievementStandard: "Students design and implement relational databases, apply data analytics and machine learning, develop comprehensive digital solutions and evaluate emerging technologies."
      }
    }
  }
};
