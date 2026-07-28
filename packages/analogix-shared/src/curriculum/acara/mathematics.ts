import type { CurriculumSubject } from "./types.js";

export const Mathematics: Record<string, CurriculumSubject> = {
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
  }
};
