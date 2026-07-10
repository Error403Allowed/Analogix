export interface CurriculumTopic {
  id: string;
  strand: string;
  topic: string;
  contentDescription: string;
  elaborations: string[];
}

export interface CurriculumYearLevel {
  year: number;
  strands: {
    [strand: string]: CurriculumTopic[];
  };
  achievementStandard: string;
}

export interface CurriculumSubject {
  subject: string;
  learningArea: string;
  yearLevels: {
    [year: string]: CurriculumYearLevel;
  };
}

export const ACARA_CURRICULUM: Record<string, CurriculumSubject> = {
  Mathematics: {
    subject: "Mathematics",
    learningArea: "Mathematics",
    yearLevels: {
      "7": {
        year: 7,
        strands: {
          "Number": [
            {
              id: "AC9M7N01",
              strand: "Number",
              topic: "Integers",
              contentDescription: "apply knowledge of integers to add, subtract, multiply and divide integers, using appropriate strategies",
              elaborations: ["using patterns and strategies to add and subtract integers", "using models to multiply and divide integers", "exploring efficient mental strategies for integer operations"]
            },
            {
              id: "AC9M7N02",
              strand: "Number",
              topic: "Powers and Exponents",
              contentDescription: "establish the exponent rules for multiplying and dividing powers, and the power of a power",
              elaborations: ["recognising that 2^3 × 2^4 = 2^7 and 2^6 ÷ 2^3 = 2^3", "using the exponent rules to simplify expressions", "connecting to scientific notation"]
            },
            {
              id: "AC9M7N03",
              strand: "Number",
              topic: "Rational Numbers",
              contentDescription: "add, subtract, multiply and divide rational numbers, using efficient strategies and expressing as fractions in simplest form",
              elaborations: ["using number lines to add and subtract rational numbers", "using models for multiplying fractions", "converting between mixed numbers and improper fractions"]
            },
            {
              id: "AC9M7N04",
              strand: "Number",
              topic: "Percentage Applications",
              contentDescription: "calculate percentage increase and decrease, and compare quantities using percentages",
              elaborations: ["solving problems involving discounts and markups", "comparing prices using percentage differences", "calculating population growth and decline"]
            }
          ],
          "Algebra": [
            {
              id: "AC9M7A01",
              strand: "Algebra",
              topic: "Patterning",
              contentDescription: "describe relationships between variables in terms of differences and ratios, and use patterns and graphs to create rules",
              elaborations: ["identifying patterns in tables and graphs", "describing relationships between variables", "creating rules from patterns"]
            },
            {
              id: "AC9M7A02",
              strand: "Algebra",
              topic: "Linear Equations",
              contentDescription: "solve one-step linear equations using concrete, pictorial and symbolic methods",
              elaborations: ["using balance scales to model equations", "substituting values into formulas", "checking solutions to equations"]
            },
            {
              id: "AC9M7A03",
              strand: "Algebra",
              topic: "Algebraic Expressions",
              contentDescription: "generate and simplify expressions by collecting like terms, using the distributive property, and expanding simple bracketsexpand simple brackets",
              elaborations: ["identifying like terms in expressions", "using the distributive law a(b + c) = ab + ac", "evaluating expressions for given values"]
            }
          ],
          "Measurement": [
            {
              id: "AC9M7M01",
              strand: "Measurement",
              topic: "Area and Perimeter",
              contentDescription: "calculate areas of composite shapes and perimeter of composite figures, using appropriate units",
              elaborations: ["finding area of rectangles, triangles and circles", "calculating perimeter of composite shapes", "converting between square metres and square centimetres"]
            },
            {
              id: "AC9M7M02",
              strand: "Measurement",
              topic: "Volume",
              contentDescription: "calculate the volume of rectangular and triangular prisms, using appropriate units",
              elaborations: ["using the formula V = l × w × h for rectangular prisms", "connecting volume to capacity", "solving problems involving the volume of composite solids"]
            },
            {
              id: "AC9M7M03",
              strand: "Measurement",
              topic: "Time",
              contentDescription: "solve problems involving duration, including using 12- and 24-hour time, and time zones",
              elaborations: ["calculating elapsed time across time zones", "converting between 12-hour and 24-hour time", "solving problems involving timetables"]
            }
          ],
          "Geometry": [
            {
              id: "AC9M7G01",
              strand: "Geometry",
              topic: "Angles",
              contentDescription: "identify corresponding, alternate and co-interior angles, and use these to solve problems involving transversals on parallel lines",
              elaborations: ["identifying parallel and transversal lines", "calculating angles using angle relationships", "solving problems with parallel lines"]
            },
            {
              id: "AC9M7G02",
              strand: "Geometry",
              topic: "Triangles",
              contentDescription: "classify triangles, quadrilaterals and other polygons, and apply angle sum properties to find unknown angles",
              elaborations: ["using the angle sum of triangles (180°)", "classifying triangles by sides and angles", "solving problems with quadrilateral angle sums"]
            },
            {
              id: "AC9M7G03",
              strand: "Geometry",
              topic: "Construction",
              contentDescription: "construct and annotate triangles and quadrilaterals using digital tools, given measurements",
              elaborations: ["using geometry software to construct shapes", "constructing triangles given side lengths", "identifying congruent triangles"]
            }
          ],
          "Statistics": [
            {
              id: "AC9M7ST01",
              strand: "Statistics",
              topic: "Data Collection",
              contentDescription: "collect and record categorical and numerical data from primary and secondary sources",
              elaborations: ["designing surveys to collect data", "using spreadsheets to record data", "selecting appropriate data sources"]
            },
            {
              id: "AC9M7ST02",
              strand: "Statistics",
              topic: "Data Representation",
              contentDescription: "construct and compare dot plots and stem-and-leaf plots, using digital tools for large datasets",
              elaborations: ["creating dot plots for small datasets", "using stem-and-leaf plots for grouped data", "comparing different data displays"]
            },
            {
              id: "AC9M7ST03",
              strand: "Statistics",
              topic: "Statistics Measures",
              contentDescription: "calculate mean, median and mode for datasets and describe the relationship between them",
              elaborations: ["calculating measures of centre for datasets", "comparing datasets using statistics", "identifying when each measure is most appropriate"]
            }
          ],
          "Probability": [
            {
              id: "AC9M7P01",
              strand: "Probability",
              topic: "Probability Concepts",
              contentDescription: "describe the complement of an event using appropriate language and calculate its probability",
              elaborations: ["identifying sample spaces for simple experiments", "calculating probability of complement events", "using probability scale from 0 to 1"]
            },
            {
              id: "AC9M7P02",
              strand: "Probability",
              topic: "Experimental Probability",
              contentDescription: "conduct repeated chance experiments to predict relative frequency and compare predictions with observed results",
              elaborations: ["running simulations with large trials", "comparing experimental and theoretical probability", "explaining differences in results"]
            }
          ]
        },
        achievementStandard: "Students solve problems involving integers, fractions, decimals and percentages. They describe relationships between variables and create rules for patterns. They calculate area and volume of simple shapes and solve problems involving time. They classify triangles and quadrilaterals and solve problems involving angles on parallel lines. They collect data, construct graphs and calculate measures of centre."
      },
      "8": {
        year: 8,
        strands: {
          "Number": [
            {
              id: "AC9M8N01",
              strand: "Number",
              topic: "Real Numbers",
              contentDescription: "use rational numbers to solve problems, including those involving financial contexts, and check the reasonableness of answers",
              elaborations: ["working with very large and very small numbers", "rounding to appropriate accuracy", "solving financial mathematics problems"]
            },
            {
              id: "AC9M8N02",
              strand: "Number",
              topic: "Index Laws",
              contentDescription: "apply the exponent laws to numerical expressions with integer exponents, and expand and factorise algebraic expressions",
              elaborations: ["using zero and negative exponents", "applying all exponent laws to simplify expressions", "expanding and factoring with negative coefficients"]
            },
            {
              id: "AC9M8N03",
              strand: "Number",
              topic: "Square Roots and Surds",
              contentDescription: "apply the square root law to simplify perfect squares and approximate square roots of non-perfect squares",
              elaborations: ["recognising perfect squares and cubes", "using √(a²) = |a| for simplification", "rationalising denominators with surds"]
            }
          ],
          "Algebra": [
            {
              id: "AC9M8A01",
              strand: "Algebra",
              topic: "Linear Equations",
              contentDescription: "solve linear equations involving the distributive property, variables on both sides, and equations with brackets",
              elaborations: ["solving multi-step linear equations", "writing equations from word problems", "checking solutions"]
            },
            {
              id: "AC9M8A02",
              strand: "Algebra",
              topic: "Linear Relationships",
              contentDescription: "graph linear relationships on the Cartesian plane, and derive the equation from the graph and from a table of values",
              elaborations: ["finding gradient and intercept from graphs", "writing equations in y = mx + c form", "parallel and perpendicular lines"]
            },
            {
              id: "AC9M8A03",
              strand: "Algebra",
              topic: "Factorisation",
              contentDescription: "factorise algebraic expressions by taking out the highest common factor, and use expansion to verify",
              elaborations: ["factoring using the highest common factor", "checking factorisation by expansion", "simplifying algebraic fractions"]
            }
          ],
          "Measurement": [
            {
              id: "AC9M8M01",
              strand: "Measurement",
              topic: "Area of Composite Shapes",
              contentDescription: "solve problems involving the areas of composite shapes, including those with sectors, using appropriate units",
              elaborations: ["finding area of shapes with circular parts", "calculating area of irregular shapes", "converting between area units"]
            },
            {
              id: "AC9M8M02",
              strand: "Measurement",
              topic: "Surface Area and Volume",
              contentDescription: "calculate the surface area and volume of cylinders, right prisms and composite solids, using appropriate units",
              elaborations: ["using formulas for cylinders and prisms", "solving problems with composite solids", "choosing appropriate units"]
            },
            {
              id: "AC9M8M03",
              strand: "Measurement",
              topic: "Scale and Similarity",
              contentDescription: "use the gradient of a line segment to solve problems involving rates and scale drawings",
              elaborations: ["interpreting scale drawings", "calculating gradients in real contexts", "solving problems involving direct proportion"]
            }
          ],
          "Geometry": [
            {
              id: "AC9M8G01",
              strand: "Geometry",
              topic: "Congruence",
              contentDescription: "demonstrate that triangles are congruent using the SAS, SSS and RHS tests, and use these to solve problems",
              elaborations: ["identining sufficient information for congruence", "writing proofs using congruence", "applying congruence to find unknown angles and sides"]
            },
            {
              id: "AC9M8G02",
              strand: "Geometry",
              topic: "Geometric Transformations",
              contentDescription: "apply transformations (translation, reflection, rotation, dilation) to geometric figures using digital tools",
              elaborations: ["performing transformations on the coordinate plane", "describing transformations in geometry", "identifying transformations in artwork and design"]
            },
            {
              id: "AC9M8G03",
              strand: "Geometry",
              topic: "Pythagoras Theorem",
              contentDescription: "apply Pythagoras theorem to solve problems involving right-angled triangles, including in composite shapes",
              elaborations: ["calculating unknown sides in right triangles", "applying Pythagoras in 3D problems", "checking if a triangle is right-angled"]
            }
          ],
          "Statistics": [
            {
              id: "AC9M8ST01",
              strand: "Statistics",
              topic: "Bivariate Data",
              contentDescription: "construct a scatterplot to identify and describe the relationship between two numerical variables",
              elaborations: ["identifying positive, negative and no correlation", "drawing lines of best fit", "interpreting bivariate data"]
            },
            {
              id: "AC9M8ST02",
              strand: "Statistics",
              topic: "Summary Statistics",
              contentDescription: "calculate and compare mean, median, range and interquartile range for datasets, using digital tools",
              elaborations: ["using calculators for large datasets", "interpreting box plots", "comparing datasets using summary statistics"]
            }
          ],
          "Probability": [
            {
              id: "AC9M8P01",
              strand: "Probability",
              topic: "Probability Rules",
              contentDescription: "list all outcomes for two-step experiments and calculate probabilities using fractions and percentages",
              elaborations: ["using tree diagrams for two-step experiments", "calculating probability of compound events", "using Venn diagrams for probability"]
            }
          ]
        },
        achievementStandard: "Students apply exponent laws to simplify expressions and solve linear equations. They graph linear relationships and interpret key features. They calculate areas and volumes of composite shapes. They demonstrate triangle congruence and apply Pythagoras theorem. They construct and interpret scatter plots and calculate summary statistics."
      },
      "9": {
        year: 9,
        strands: {
          "Number": [
            {
              id: "AC9M9N01",
              strand: "Number",
              topic: "Real Numbers",
              contentDescription: "recognise that the real number system includes the rational numbers and the irrational numbers, and solve problems involving real numbers using digital tools",
              elaborations: ["distinguishing between rational and irrational numbers", "placing numbers on the real number line", "using digital tools for calculations with irrational numbers"]
            },
            {
              id: "AC9M9N02",
              strand: "Number",
              topic: "Scientific Notation",
              contentDescription: "use scientific notation to represent very large and very small numbers, and perform calculations with them",
              elaborations: ["converting between standard and scientific notation", "performing operations with numbers in scientific notation", "applying to real-world contexts like astronomy and microbiology"]
            },
            {
              id: "AC9M9N03",
              strand: "Number",
              topic: "Surds",
              contentDescription: "perform operations with surds, including expansion, factorisation and rationalising the denominator",
              elaborations: ["simplifying surd expressions", "adding and subtracting surds", "rationalising binomial surd denominators"]
            }
          ],
          "Algebra": [
            {
              id: "AC9M9A01",
              strand: "Algebra",
              topic: "Linear Equations",
              contentDescription: "solve linear equations with integer coefficients where the unknown appears on both sides, and equations with brackets",
              elaborations: ["solving equations with variables on both sides", "solving equations with parentheses", "forming and solving linear equations from contexts"]
            },
            {
              id: "AC9M9A02",
              strand: "Algebra",
              topic: "Linear Inequalities",
              contentDescription: "solve linear inequalities in one variable, and represent the solution on a number line",
              elaborations: ["solving one-step and two-step inequalities", "graphing solution sets on number lines", "solving compound inequalities"]
            },
            {
              id: "AC9M9A03",
              strand: "Algebra",
              topic: "Quadratic Expressions",
              contentDescription: "factorise quadratic expressions, including difference of squares and perfect squares, and use expansion to verify",
              elaborations: ["factoring x² + bx + c", "factoring ax² + bx + c", "factoring difference of squares: a² - b² = (a+b)(a-b)"]
            },
            {
              id: "AC9M9A04",
              strand: "Algebra",
              topic: "Quadratic Equations",
              contentDescription: "solve quadratic equations using null factor law, completing the square and the quadratic formula",
              elaborations: ["solving using null factor law", "completing the square", "using the quadratic formula x = (-b ± √(b²-4ac))/2a"]
            }
          ],
          "Measurement": [
            {
              id: "AC9M9M01",
              strand: "Measurement",
              topic: "Trigonometry",
              contentDescription: "apply trigonometry to solve right-angled triangle problems, including those involving direction and angles of elevation and depression",
              elaborations: ["using sin, cos and tan to find sides", "using sin⁻¹, cos⁻¹, tan⁻¹ to find angles", "solving problems with angles of elevation and depression"]
            },
            {
              id: "AC9M9M02",
              strand: "Measurement",
              topic: "Area and Volume",
              contentDescription: "calculate the surface area and volume of pyramids, cones and spheres, using appropriate units",
              elaborations: ["using formulas for pyramids, cones and spheres", "solving problems with composite solids", "selecting appropriate units and conversions"]
            },
            {
              id: "AC9M9M03",
              strand: "Measurement",
              topic: "Similarity",
              contentDescription: "apply similarity to solve problems involving scale factors, area ratios and volume ratios",
              elaborations: ["using scale factors in similarity", "calculating area and volume ratios from linear scale factors", "solving problems with similar figures"]
            }
          ],
          "Geometry": [
            {
              id: "AC9M9G01",
              strand: "Geometry",
              topic: "Angle Properties",
              contentDescription: "prove and apply the angle properties of triangles and quadrilaterals, and related circle properties",
              elaborations: ["proving angle sum of triangles", "proving properties of isosceles and equilateral triangles", "applying angle in semi-circle theorem"]
            },
            {
              id: "AC9M9G02",
              strand: "Geometry",
              topic: "Circle Geometry",
              contentDescription: "apply angle and chord properties of circles to prove circle theorems and solve problems",
              elaborations: ["using the theorem: angle subtended by an arc is constant", "proving equal chords subtend equal angles", "solving problems with cyclic quadrilaterals"]
            }
          ],
          "Statistics": [
            {
              id: "AC9M9ST01",
              strand: "Statistics",
              topic: "Data Representation",
              contentDescription: "construct and interpret box plots and use them to compare datasets, including using 5-number summaries",
              elaborations: ["constructing box plots from data", "interpreting quartiles and interquartile range", "comparing datasets using box plots"]
            },
            {
              id: "AC9M9ST02",
              strand: "Statistics",
              topic: "Statistical Inference",
              contentDescription: "conduct statistical investigations, including random sampling, to gather and interpret data",
              elaborations: ["designing fair samples", "using technology for data analysis", "drawing conclusions from statistical investigations"]
            },
            {
              id: "AC9M9ST03",
              strand: "Statistics",
              topic: "Bivariate Analysis",
              contentDescription: "use technology to fit a least-squares line to data, and use the line to make predictions",
              elaborations: ["calculating equation of line of best fit", "interpreting gradient and intercept in context", "evaluating reliability of predictions"]
            }
          ],
          "Probability": [
            {
              id: "AC9M9P01",
              strand: "Probability",
              topic: "Probability Rules",
              contentDescription: "use the language and notation of conditional probability, including P(A|B), and solve problems involving two-way tables and Venn diagrams",
              elaborations: ["calculating conditional probability P(A|B)", "using two-way tables for probability", "solving problems with Venn diagrams"]
            }
          ]
        },
        achievementStandard: "Students recognise real numbers and perform operations with surds. They solve linear equations and inequalities, and quadratic equations using multiple methods. They apply trigonometry and calculate surface area and volume of 3D shapes. They prove circle theorems and use statistical investigation to analyse data. They calculate conditional probability."
      },
      "10": {
        year: 10,
        strands: {
          "Number": [
            {
              id: "AC9M10N01",
              strand: "Number",
              topic: "Finance",
              contentDescription: "solve problems involving simple and compound interest, and investment using the formula A = P(1 + r/n)^(nt)",
              elaborations: ["calculating simple interest using I = Prt", "calculating compound interest using A = P(1 + r/n)^(nt)", "comparing investment options"]
            },
            {
              id: "AC9M10N02",
              strand: "Number",
              topic: "Logarithms",
              contentDescription: "define logarithms as indices and establish the relationship log(a) + log(b) = log(ab), and use this to solve problems",
              elaborations: ["converting between logarithmic and exponential forms", "using laws of logarithms to simplify expressions", "solving exponential equations using logarithms"]
            },
            {
              id: "AC9M10N03",
              strand: "Number",
              topic: "Exponential Functions",
              contentDescription: "graph exponential functions and solve exponential equations using logarithms, including in authentic contexts",
              elaborations: ["graphing y = a^x for various a", "solving exponential growth and decay problems", "modelling with exponential functions"]
            }
          ],
          "Algebra": [
            {
              id: "AC9M10A01",
              strand: "Algebra",
              topic: "Linear and Quadratic Functions",
              contentDescription: "solve simultaneous linear equations graphically, numerically and algebraically using various techniques",
              elaborations: ["solving by substitution", "solving by elimination", "interpreting solutions in context"]
            },
            {
              id: "AC9M10A02",
              strand: "Algebra",
              topic: "Parabolic Functions",
              contentDescription: "graph parabolas using key features (vertex, axis of symmetry, intercepts) and solve quadratic equations",
              elaborations: ["finding vertex from completing the square", "graphing using intercept form", "solving quadratic equations graphically"]
            },
            {
              id: "AC9M10A03",
              strand: "Algebra",
              topic: "Polynomial Functions",
              contentDescription: "expand and factorise polynomial expressions, and use the factor theorem to determine roots",
              elaborations: ["dividing polynomials", "using the factor theorem to find factors", "sketching polynomial functions"]
            }
          ],
          "Measurement": [
            {
              id: "AC9M10M01",
              strand: "Measurement",
              topic: "Trigonometry",
              contentDescription: "solve problems involving non-right angled triangles using the sine rule, cosine rule and area formula",
              elaborations: ["using sine rule: a/sin A = b/sin B = c/sin C", "using cosine rule: c² = a² + b² - 2ab cos C", "calculating area using ½ab sin C"]
            },
            {
              id: "AC9M10M02",
              strand: "Measurement",
              topic: "Rates and Ratios",
              contentDescription: "solve problems involving rates, ratios and direct and inverse proportion, including in context",
              elaborations: ["working with rates in various contexts", "solving problems with direct proportion", "solving problems with inverse proportion"]
            }
          ],
          "Geometry": [
            {
              id: "AC9M10G01",
              strand: "Geometry",
              topic: "Coordinate Geometry",
              contentDescription: "apply coordinate geometry to solve problems, including those involving parallel and perpendicular lines",
              elaborations: ["finding equations of parallel lines", "finding equations of perpendicular lines", "calculating distances and midpoints"]
            },
            {
              id: "AC9M10G02",
              strand: "Geometry",
              topic: "Circle Geometry",
              contentDescription: "prove results about chords and arcs in circles, including the chord theorem and angle in the alternate segment",
              elaborations: ["proving equal chords are equidistant from centre", "proving angle in alternate segment theorem", "solving problems with circle theorems"]
            }
          ],
          "Statistics": [
            {
              id: "AC9M10ST01",
              strand: "Statistics",
              topic: "Normal Distribution",
              contentDescription: "use the standard deviation to compare datasets and make informal statements about the mean and the normal distribution",
              elaborations: ["calculating mean and standard deviation", "interpreting normal distribution properties", "using z-scores to compare values"]
            },
            {
              id: "AC9M10ST02",
              strand: "Statistics",
              topic: "Hypothesis Testing",
              contentDescription: "conduct random sampling, use sample data to make predictions about the population and interpret results",
              elaborations: ["designing sampling methods", "calculating confidence intervals", "drawing conclusions from sample data"]
            }
          ],
          "Probability": [
            {
              id: "AC9M10P01",
              strand: "Probability",
              topic: "Probability Distributions",
              contentDescription: "use probability distributions to model continuous random variables, including the normal distribution",
              elaborations: ["using normal distribution for probabilities", "calculating probabilities using z-scores", "modelling with normal distribution"]
            },
            {
              id: "AC9M10P02",
              strand: "Probability",
              topic: "Sampling and Inference",
              contentDescription: "use the central limit theorem to make inferences about population means and proportions",
              elaborations: ["calculating sampling distribution of means", "using confidence intervals", "making predictions about populations"]
            }
          ]
        },
        achievementStandard: "Students solve problems involving simple and compound interest and exponential functions. They solve simultaneous equations and graph linear and quadratic functions. They apply trigonometric rules to non-right triangles. They prove circle theorems and use coordinate geometry. They interpret normal distribution and conduct statistical investigations. They use probability distributions and the central limit theorem for inference."
      },
      "11": {
        year: 11,
        strands: {
          "Functions and Algebra": [
            {
              id: "AC-M11-FA01",
              strand: "Functions and Algebra",
              topic: "Working with Functions",
              contentDescription: "examine the concept of a function and distinguish between relations and functions, use function notation, describe features of graphs of functions",
              elaborations: ["identifying functions from mappings, tables and graphs", "using and interpreting function notation f(x)", "analysing intercepts, gradients, asymptotes and domain/range"]
            },
            {
              id: "AC-M11-FA02",
              strand: "Functions and Algebra",
              topic: "Exponential Functions",
              contentDescription: "work with exponential functions, their graphs and applications, including exponential growth and decay",
              elaborations: ["graphing exponential functions", "solving exponential equations", "applying exponential models to real scenarios"]
            },
            {
              id: "AC-M11-FA03",
              strand: "Functions and Algebra",
              topic: "Logarithmic Functions",
              contentDescription: "understand the relationship between exponential and logarithmic functions, properties of logarithms and their applications",
              elaborations: ["converting between exponential and logarithmic forms", "applying logarithm laws", "solving logarithmic equations"]
            },
            {
              id: "AC-M11-FA04",
              strand: "Functions and Algebra",
              topic: "Trigonometric Functions",
              contentDescription: "work with trigonometric functions, their graphs and applications, including the unit circle and trigonometric equations",
              elaborations: ["using the unit circle for trigonometric values", "graphing sine, cosine and tangent functions", "solving trigonometric equations"]
            }
          ],
          "Calculus": [
            {
              id: "AC-M11-C01",
              strand: "Calculus",
              topic: "Introduction to Differentiation",
              contentDescription: "understand the concept of a gradient and the derivative as a rate of change, use differentiation techniques",
              elaborations: ["finding gradient of secants and tangents", "understanding limit definition of derivative", "deriving basic differentiation rules"]
            },
            {
              id: "AC-M11-C02",
              strand: "Calculus",
              topic: "Differentiation Rules",
              contentDescription: "apply differentiation rules including chain rule, product rule and quotient rule",
              elaborations: ["differentiating polynomial, exponential and trigonometric functions", "applying chain rule to composite functions", "using product and quotient rules"]
            },
            {
              id: "AC-M11-C03",
              strand: "Calculus",
              topic: "Applications of Differentiation",
              contentDescription: "apply differentiation to solve problems including stationary points, optimisation and curve sketching",
              elaborations: ["finding and classifying stationary points", "solving optimisation problems", "sketching curves using derivative information"]
            }
          ],
          "Probability and Statistics": [
            {
              id: "AC-M11-PS01",
              strand: "Probability and Statistics",
              topic: "Discrete Probability Distributions",
              contentDescription: "understand discrete random variables, probability distributions, expected value and variance",
              elaborations: ["defining discrete random variables", "calculating probability distributions", "computing expectation and variance"]
            },
            {
              id: "AC-M11-PS02",
              strand: "Probability and Statistics",
              topic: "Bernoulli Trials and Binomial Distribution",
              contentDescription: "examine Bernoulli trials, the binomial distribution and its applications",
              elaborations: ["identifying Bernoulli trials", "calculating binomial probabilities", "applying binomial distribution to real problems"]
            }
          ]
        },
        achievementStandard: "Students examine functions and their graphs, including exponential, logarithmic and trigonometric functions. They understand the concept of differentiation and apply differentiation rules. They solve problems involving stationary points, optimisation and curve sketching. They work with discrete probability distributions and the binomial distribution."
      },
      "12": {
        year: 12,
        strands: {
          "Further Functions and Calculus": [
            {
              id: "AC-M12-FC01",
              strand: "Further Functions and Calculus",
              topic: "Integration",
              contentDescription: "understand integration as the reverse of differentiation, apply integration techniques and understand the Fundamental Theorem of Calculus",
              elaborations: ["integrating polynomial, exponential and trigonometric functions", "using substitution and integration by parts", "understanding the relationship between integration and differentiation"]
            },
            {
              id: "AC-M12-FC02",
              strand: "Further Functions and Calculus",
              topic: "Applications of Integration",
              contentDescription: "apply integration to find areas under curves, volumes of solids of revolution and solve practical problems",
              elaborations: ["calculating area under curves", "finding volumes of solids of revolution", "solving kinematic problems"]
            },
            {
              id: "AC-M12-FC03",
              strand: "Further Functions and Calculus",
              topic: "Differential Equations",
              contentDescription: "form and solve differential equations, including exponential growth and decay models",
              elaborations: ["solving separable differential equations", "modelling growth and decay", "applying differential equations to real scenarios"]
            }
          ],
          "Trigonometric Functions and Calculus": [
            {
              id: "AC-M12-TC01",
              strand: "Trigonometric Functions and Calculus",
              topic: "Advanced Trigonometry",
              contentDescription: "work with advanced trigonometric identities, equations and applications of trigonometric functions and their calculus",
              elaborations: ["proving and using trigonometric identities", "solving complex trigonometric equations", "differentiating and integrating trigonometric functions"]
            },
            {
              id: "AC-M12-TC02",
              strand: "Trigonometric Functions and Calculus",
              topic: "Trigonometric Graphs and Applications",
              contentDescription: "analyse and graph trigonometric functions and apply calculus to trigonometric models",
              elaborations: ["graphing transformed trigonometric functions", "modelling periodic phenomena", "applying calculus to trigonometric problems"]
            }
          ],
          "Probability and Statistics": [
            {
              id: "AC-M12-PS01",
              strand: "Probability and Statistics",
              topic: "Normal Distribution",
              contentDescription: "understand the normal distribution, z-scores, standard normal distribution and applications",
              elaborations: ["using normal distribution tables", "calculating probabilities using normal distribution", "applying normal distribution to real data"]
            },
            {
              id: "AC-M12-PS02",
              strand: "Probability and Statistics",
              topic: "Sampling and Estimation",
              contentDescription: "examine sampling distributions, confidence intervals and hypothesis testing",
              elaborations: ["understanding central limit theorem", "constructing confidence intervals", "conducting hypothesis tests"]
            },
            {
              id: "AC-M12-PS03",
              strand: "Probability and Statistics",
              topic: "Linear Regression",
              contentDescription: "analyse bivariate data, fit linear regression models and interpret results",
              elaborations: ["calculating regression coefficients", "interpreting correlation and causation", "using technology for regression analysis"]
            }
          ],
          "Financial Mathematics": [
            {
              id: "AC-M12-FM01",
              strand: "Financial Mathematics",
              topic: "Loans and Annuities",
              contentDescription: "understand and apply financial mathematics for loans, annuities and perpetuities",
              elaborations: ["calculating loan repayments", "analysing annuity investments", "solving problems involving amortization"]
            },
            {
              id: "AC-M12-FM02",
              strand: "Financial Mathematics",
              topic: "Investment and Depreciation",
              contentDescription: "examine investment options, depreciation methods and financial decision making",
              elaborations: ["comparing investment returns", "calculating depreciation", "making financial decisions"]
            }
          ]
        },
        achievementStandard: "Students apply integration techniques to solve problems involving areas and volumes. They solve differential equations and apply them to real-world models. They work with the normal distribution, confidence intervals and hypothesis testing. They apply financial mathematics to loans, annuities and investments."
      }
    }
  },
  English: {
    subject: "English",
    learningArea: "English",
    yearLevels: {
      "7": {
        year: 7,
        strands: {
          "Literature": [
            {
              id: "AC9E7LE01",
              strand: "Literature",
              topic: "Responding to Literature",
              contentDescription: "explain how characters, settings and events contribute to meaning in texts, drawing on knowledge of context, genre and structure",
              elaborations: ["analysing how characters develop through a text", "explaining how setting creates mood and meaning", "identifying how events build tension or create themes"]
            },
            {
              id: "AC9E7LE02",
              strand: "Literature",
              topic: "Creating Literature",
              contentDescription: "create texts using language and visual features appropriate to purpose, audience and context",
              elaborations: ["selecting appropriate language for audience", "using visual features to enhance meaning", "adapting text for different purposes"]
            }
          ],
          "Language": [
            {
              id: "AC9E7LA01",
              strand: "Language",
              topic: "Language for Learning",
              contentDescription: "analyse how language features are used to create meaning in informational and persuasive texts",
              elaborations: ["identifying language features of informative texts", "analysing persuasive techniques", "examining how language creates audience engagement"]
            },
            {
              id: "AC9E7LA02",
              strand: "Language",
              topic: "Grammar and Vocabulary",
              contentDescription: "analyse and explain the effect of language choices on audiences, including technical language, modality and bias",
              elaborations: ["examining how technical language establishes authority", "analysing modality choices", "identifying bias in language"]
            }
          ],
          "Literacy": [
            {
              id: "AC9E7LC01",
              strand: "Literacy",
              topic: "Comprehending Texts",
              contentDescription: "navigate, read and view texts with increasing complexity and explain how language and visual features shape meaning",
              elaborations: ["using reading strategies for different text types", "analysing how visual features support meaning", "comparing texts on similar topics"]
            },
            {
              id: "AC9E7LC02",
              strand: "Literacy",
              topic: "Creating Texts",
              contentDescription: "plan, create and edit literary texts that experiment with language features and structures for different purposes",
              elaborations: ["planning texts for specific purposes", "experimenting with language features", "editing for clarity and impact"]
            }
          ]
        },
        achievementStandard: "Students explain how characters, settings and events contribute to meaning. They analyse language features and explain their effect on audiences. They navigate texts and explain how language and visual features create meaning. They create texts that experiment with language features for purpose and audience."
      },
      "8": {
        year: 8,
        strands: {
          "Literature": [
            {
              id: "AC9E8LE01",
              strand: "Literature",
              topic: "Analysing Literature",
              contentDescription: "analyse how the use of narrative devices, point of view and literary language shape meaning in texts",
              elaborations: ["identifying narrative devices like foreshadowing", "analysing first and third person perspectives", "examining how literary language creates effects"]
            },
            {
              id: "AC9E8LE02",
              strand: "Literature",
              topic: "Creating Literature",
              contentDescription: "create imaginative, informative and persuasive texts that draw on personal experience and wider research",
              elaborations: ["using personal experiences in creative writing", "incorporating research into texts", "adapting writing for different purposes"]
            }
          ],
          "Language": [
            {
              id: "AC9E8LA01",
              strand: "Language",
              topic: "Text Analysis",
              contentDescription: "analyse how language choices build characterisation, create tone and mood, and shape the perspective of readers",
              elaborations: ["examining how language builds characters", "analysing how tone is created through word choice", "identifying author's perspective"]
            },
            {
              id: "AC9E8LA02",
              strand: "Language",
              topic: "Persuasive Language",
              contentDescription: "analyse the ways language is used to persuade and influence audiences in media texts",
              elaborations: ["identifying persuasive techniques in advertising", "analysing how rhetoric is used in speeches", "evaluating evidence and language in media"]
            }
          ],
          "Literacy": [
            {
              id: "AC9E8LC01",
              strand: "Literacy",
              topic: "Critical Reading",
              contentDescription: "interpret, synthesise and evaluate information from multiple sources to develop points of view",
              elaborations: ["comparing information across sources", "evaluating credibility of sources", "developing informed opinions"]
            },
            {
              id: "AC9E8LC02",
              strand: "Literacy",
              topic: "Writing Development",
              contentDescription: "plan, draft and publish increasingly sophisticated analytical texts that demonstrate understanding of content and audience",
              elaborations: ["planning analytical essays", "drafting with audience in mind", "refining writing for clarity"]
            }
          ]
        },
        achievementStandard: "Students analyse narrative devices and language choices in texts. They create texts that draw on personal experience and research. They analyse how language is used to persuade and influence. They interpret and synthesise information from multiple sources to develop viewpoints. They plan and draft analytical texts."
      },
      "9": {
        year: 9,
        strands: {
          "Literature": [
            {
              id: "AC9E9LE01",
              strand: "Literature",
              topic: "Literary Analysis",
              contentDescription: "analyse how texts represent different perspectives, values and ideologies, and how this affects interpretation",
              elaborations: ["comparing perspectives in texts", "identifying authorial bias and ideology", "evaluating how perspective shapes meaning"]
            },
            {
              id: "AC9E9LE02",
              strand: "Literature",
              topic: "Creative Writing",
              contentDescription: "create texts that experiment with style, structure and literary features to achieve specific effects",
              elaborations: ["experimenting with narrative voice", "using stylistic devices intentionally", "creating purposeful text structures"]
            }
          ],
          "Language": [
            {
              id: "AC9E9LA01",
              strand: "Language",
              topic: "Critical Language Analysis",
              contentDescription: "analyse how language is used to position audiences and how different interpretations arise from textual details",
              elaborations: ["identifying how texts position readers", "analysing subtext and implication", "evaluating different interpretations"]
            },
            {
              id: "AC9E9LA02",
              strand: "Language",
              topic: "Rhetoric and Argument",
              contentDescription: "analyse how rhetoric and persuasive language are used in speeches and texts to influence audiences",
              elaborations: ["identifying rhetorical devices", "analysing persuasive techniques in speeches", "evaluating effectiveness of persuasion"]
            }
          ],
          "Literacy": [
            {
              id: "AC9E9LC01",
              strand: "Literacy",
              topic: "Independent Reading",
              contentDescription: "read and view texts independently and critically to develop personal opinions and make connections",
              elaborations: ["engaging with complex texts", "forming personal responses to texts", "making connections between texts"]
            },
            {
              id: "AC9E9LC02",
              strand: "Literacy",
              topic: "Extended Writing",
              contentDescription: "plan, draft and refine sophisticated analytical and creative texts that demonstrate control over content, structure and language",
              elaborations: ["planning extended analytical essays", "refining language for effect", "editing for coherence and cohesion"]
            }
          ]
        },
        achievementStandard: "Students analyse how texts represent different perspectives and values. They create texts that experiment with style for specific effects. They analyse how language positions audiences and how rhetoric influences. They read independently and develop personal opinions. They plan and refine sophisticated analytical and creative texts."
      },
      "10": {
        year: 10,
        strands: {
          "Literature": [
            {
              id: "AC9E10LE01",
              strand: "Literature",
              topic: "Comparative Analysis",
              contentDescription: "analyse and compare how texts represent ideas, values and perspectives, and evaluate the effectiveness of representation",
              elaborations: ["comparing representations across texts", "evaluating how values are represented", "assessing effectiveness of representation"]
            },
            {
              id: "AC9E10LE02",
              strand: "Literature",
              topic: "Literary Craft",
              contentDescription: "create sustained literary texts that experiment with form, style and literary devices for deliberate effects",
              elaborations: ["experimenting with innovative forms", "using literary devices purposefully", "creating cohesive stylistic effects"]
            }
          ],
          "Language": [
            {
              id: "AC9E10LA01",
              strand: "Language",
              topic: "Discourse Analysis",
              contentDescription: "analyse how discourse structures and language patterns construct meaning and position audiences",
              elaborations: ["identifying discourse patterns", "analysing how language constructs meaning", "examining how positioning occurs through language"]
            },
            {
              id: "AC9E10LA02",
              strand: "Language",
              topic: "Advanced Persuasion",
              contentDescription: "analyse and evaluate the effectiveness of sophisticated persuasive techniques, including loaded language, logical appeals and appeals to values",
              elaborations: ["identifying sophisticated persuasive devices", "evaluating logical and emotional appeals", "assessing overall persuasive effectiveness"]
            }
          ],
          "Literacy": [
            {
              id: "AC9E10LC01",
              strand: "Literacy",
              topic: "Advanced Interpretation",
              contentDescription: "read, view and listen to complex texts critically and analytically to develop and justify interpretations",
              elaborations: ["engaging with high-level texts", "developing justified interpretations", "synthesising multiple perspectives"]
            },
            {
              id: "AC9E10LC02",
              strand: "Literacy",
              topic: "Professional Writing",
              contentDescription: "plan, draft and publish polished analytical, creative and persuasive texts that demonstrate control over complex ideas and language",
              elaborations: ["planning sophisticated texts", "polishing writing for impact", "demonstrating control over complex language"]
            }
          ]
        },
        achievementStandard: "Students analyse how texts represent ideas and perspectives and evaluate representation effectiveness. They create sustained literary texts with deliberate stylistic effects. They analyse discourse structures and evaluate sophisticated persuasion. They read complex texts critically and justify interpretations. They plan and publish polished sophisticated texts."
      },
      "11": {
        year: 11,
        strands: {
          "Reading and Viewing": [
            {
              id: "AC-E11-R01",
              strand: "Reading and Viewing",
              topic: "Critical Analysis",
              contentDescription: "analyse and evaluate how texts construct meaning, position audiences and represent ideas, values and perspectives",
              elaborations: ["analysing authorial choices and their effects", "evaluating how texts position readers", "examining representation of ideas and values"]
            },
            {
              id: "AC-E11-R02",
              strand: "Reading and Viewing",
              topic: "Comparative Study",
              contentDescription: "compare and contrast texts, analyzing how similar ideas are represented across different contexts and genres",
              elaborations: ["comparing representations across texts", "analysing context and its influence", "evaluating effectiveness of representation"]
            },
            {
              id: "AC-E11-R03",
              strand: "Reading and Viewing",
              topic: "Texts and Society",
              contentDescription: "analyse how texts reflect social, historical and cultural contexts and how they represent identity and experience",
              elaborations: ["examining context and representation", "analysing how texts reflect identity", "evaluating cultural positioning"]
            }
          ],
          "Writing and Speaking": [
            {
              id: "AC-E11-W01",
              strand: "Writing and Speaking",
              topic: "Analytical Writing",
              contentDescription: "compose sustained analytical essays that evaluate texts, construct arguments and demonstrate sophisticated understanding",
              elaborations: ["developing sustained arguments", "supporting analysis with textual evidence", "demonstrating sophisticated understanding"]
            },
            {
              id: "AC-E11-W02",
              strand: "Writing and Speaking",
              topic: "Creative Composition",
              contentDescription: "create innovative, imaginative and cohesive texts that experiment with form, voice and stylistic choices",
              elaborations: ["experimenting with form and style", "creating distinctive voice", "developing cohesive creative works"]
            },
            {
              id: "AC-E11-W03",
              strand: "Writing and Speaking",
              topic: "Persuasion and Advocacy",
              contentDescription: "compose persuasive texts that utilise sophisticated rhetorical strategies and logical argumentation",
              elaborations: ["employing sophisticated persuasive techniques", "building logical arguments", "adapting persuasive strategies to audience"]
            }
          ],
          "Language Study": [
            {
              id: "AC-E11-L01",
              strand: "Language Study",
              topic: "Language and Power",
              contentDescription: "analyse how language choices construct and negotiate power relationships, social positions and institutional authority",
              elaborations: ["examining language and power structures", "analysing how authority is constructed", "evaluating institutional language"]
            },
            {
              id: "AC-E11-L02",
              strand: "Language Study",
              topic: "Intertextuality",
              contentDescription: "analyse how texts draw upon, respond to and transform other texts, and how meaning is constructed through intertextual connections",
              elaborations: ["identifying intertextual connections", "analysing how texts transform others", "evaluating the effect of intertextuality"]
            }
          ]
        },
        achievementStandard: "Students analyse how texts construct meaning and position audiences. They compare texts and analyse how ideas are represented across contexts. They compose sustained analytical essays and innovative creative texts. They employ sophisticated persuasive techniques. They analyse language and power, and intertextual connections."
      },
      "12": {
        year: 12,
        strands: {
          "Reading and Viewing": [
            {
              id: "AC-E12-R01",
              strand: "Reading and Viewing",
              topic: "Advanced Critical Analysis",
              contentDescription: "undertake sophisticated analysis of complex texts, evaluating multiple interpretations and constructing independent interpretations",
              elaborations: ["evaluating multiple interpretations", "constructing independent arguments", "analysing complex textual features"]
            },
            {
              id: "AC-E12-R02",
              strand: "Reading and Viewing",
              topic: "Literature and Identity",
              contentDescription: "analyse how literature explores identity, experience and meaning, and how texts represent diverse perspectives and voices",
              elaborations: ["examining representation of identity", "analysing diverse perspectives", "evaluating how literature constructs meaning"]
            },
            {
              id: "AC-E12-R03",
              strand: "Reading and Viewing",
              topic: "Global Texts",
              contentDescription: "analyse and evaluate texts from different cultural contexts, examining how culture shapes meaning and representation",
              elaborations: ["comparing texts across cultures", "examining cultural context and meaning", "evaluating representation across cultures"]
            }
          ],
          "Writing and Speaking": [
            {
              id: "AC-E12-W01",
              strand: "Writing and Speaking",
              topic: "Extended Analytical Composition",
              contentDescription: "compose sustained, sophisticated analytical essays that demonstrate independent thinking, nuanced evaluation and masterful control of language",
              elaborations: ["demonstrating independent interpretation", "maintaining sophisticated analysis", "exhibiting masterful language control"]
            },
            {
              id: "AC-E12-W02",
              strand: "Writing and Speaking",
              topic: "Imaginative Writing",
              contentDescription: "create sustained, innovative imaginative texts that demonstrate sophisticated control of narrative techniques, voice and stylistic choices",
              elaborations: ["demonstrating narrative control", "creating distinctive voice", "employing sophisticated stylistic techniques"]
            },
            {
              id: "AC-E12-W03",
              strand: "Writing and Speaking",
              topic: "Modular Writing",
              contentDescription: "adapt writing for different purposes, audiences and contexts, demonstrating flexibility in style and register",
              elaborations: ["adapting style for purpose", "varying register for audience", "responding to different contexts"]
            }
          ],
          "Language and Representation": [
            {
              id: "AC-E12-L01",
              strand: "Language and Representation",
              topic: "Representation and Reality",
              contentDescription: "analyse how language constructs representations of reality, how texts make meaning and how readers interpret representation",
              elaborations: ["examining language and representation", "analysing how texts construct reality", "evaluating reader interpretation"]
            },
            {
              id: "AC-E12-L02",
              strand: "Language and Representation",
              topic: "Discourse Analysis",
              contentDescription: "undertake advanced discourse analysis, examining how language shapes knowledge, power and social structures",
              elaborations: ["analysing discourse and power", "examining how language shapes knowledge", "evaluating social structures in language"]
            },
            {
              id: "AC-E12-L03",
              strand: "Language and Representation",
              topic: "Meta-language",
              contentDescription: "apply sophisticated understanding of how language works to critically evaluate and create texts for specific purposes",
              elaborations: ["using meta-language analytically", "evaluating language choices critically", "creating texts with sophisticated language awareness"]
            }
          ]
        },
        achievementStandard: "Students undertake sophisticated analysis of complex texts and construct independent interpretations. They compose sustained analytical essays and innovative imaginative texts. They adapt writing for different purposes and audiences. They analyse how language constructs representations and shapes discourse."
      }
    }
  },
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
  },
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

export const ACARA_SUBJECTS = [
  "Mathematics",
  "English",
  "Science",
  "Digital Technologies",
  "HASS",
  "History",
  "Geography",
  "Economics",
  "Business",
  "Civics",
  "Physics",
  "Chemistry",
  "Biology",
  "Design and Technologies",
  "Visual Arts",
  "Music",
  "Health and Physical Education",
  "Languages",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Economics",
  "Business"
];

export const SENIOR_SUBJECTS = [
  { id: "mathematics_advanced", label: "Mathematics Advanced", years: [11, 12], states: ["NSW"] },
  { id: "mathematics_extension_1", label: "Mathematics Extension 1", years: [11, 12], states: ["NSW"] },
  { id: "mathematics_extension_2", label: "Mathematics Extension 2", years: [12], states: ["NSW"] },
  { id: "mathematical_methods", label: "Mathematical Methods", years: [11, 12], states: ["VIC", "QLD", "WA", "SA"] },
  { id: "specialist_mathematics", label: "Specialist Mathematics", years: [11, 12], states: ["VIC", "QLD", "WA", "SA"] },
  { id: "further_mathematics", label: "Further Mathematics", years: [12], states: ["VIC", "WA"] },
  { id: "english_advanced", label: "English Advanced", years: [11, 12], states: ["NSW"] },
  { id: "english_extension_1", label: "English Extension 1", years: [11, 12], states: ["NSW"] },
  { id: "english_extension_2", label: "English Extension 2", years: [12], states: ["NSW"] },
  { id: "english_standard", label: "English Standard", years: [11, 12], states: ["NSW"] },
  { id: "biology", label: "Biology", years: [11, 12], states: ["ALL"] },
  { id: "chemistry", label: "Chemistry", years: [11, 12], states: ["ALL"] },
  { id: "physics", label: "Physics", years: [11, 12], states: ["ALL"] },
  { id: "economics", label: "Economics", years: [11, 12], states: ["ALL"] },
  { id: "business_studies", label: "Business Studies", years: [11, 12], states: ["ALL"] },
  { id: "modern_history", label: "Modern History", years: [11, 12], states: ["ALL"] },
  { id: "geography", label: "Geography", years: [11, 12], states: ["ALL"] },
  { id: "pdhpe", label: "PDHPE", years: [11, 12], states: ["NSW"] },
  { id: "french", label: "French", years: [11, 12], states: ["ALL"] },
  { id: "japanese", label: "Japanese", years: [11, 12], states: ["ALL"] },
  { id: "mandarin", label: "Mandarin", years: [11, 12], states: ["ALL"] }
];

export const STATE_CURRICULUM_DOCUMENTS: Record<string, string> = {
  NSW: "NESA (New South Wales Education Standards Authority) - HSC and Stage 6 syllabi",
  VIC: "VCED (Victorian Curriculum and Assessment Authority) - VCE and Victorian Curriculum",
  QLD: "QCAA (Queensland Curriculum and Assessment Authority) - QCE and senior secondary syllabi",
  SA: "SACE (South Australian Certificate of Education) - SACE and South Australian Curriculum",
  WA: "SCSA (Schools Curriculum and Standards Authority) - WACE and Western Australian Curriculum",
  TAS: "TASC (Tasmanian Assessment, Standards and Certification) - TCE and Tasmanian Curriculum",
  NT: "DCM (Department of Education - Northern Territory) - NT curriculum",
  ACT: "BSSS (Board of Senior Secondary Studies) - ACT senior secondary curriculum"
};