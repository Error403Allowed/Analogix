import type { GraphQLContext } from "../context.js";

interface Topic {
  id: string;
  strand: string;
  topic: string;
  contentDescription: string;
  elaborations: string[];
}

interface YearLevel {
  year: number;
  strands: Record<string, Topic[]>;
  achievementStandard: string;
}

interface Subject {
  subject: string;
  learningArea: string;
  yearLevels: Record<string, YearLevel>;
}

const DATA: Record<string, Subject> = {
  Mathematics: {
    subject: "Mathematics",
    learningArea: "Mathematics",
    yearLevels: {
      "7": {
        year: 7,
        strands: {
          "Number": [
            { id: "AC9M7N01", strand: "Number", topic: "Integers", contentDescription: "apply knowledge of integers to add, subtract, multiply and divide integers, using appropriate strategies", elaborations: ["using patterns to add/subtract integers", "using models to multiply/divide integers", "exploring efficient mental strategies"] },
            { id: "AC9M7N02", strand: "Number", topic: "Powers and Exponents", contentDescription: "establish the exponent rules for multiplying and dividing powers, and the power of a power", elaborations: ["recognising 2³×2⁴=2⁷ and 2⁶÷2³=2³", "using exponent rules to simplify", "connecting to scientific notation"] },
            { id: "AC9M7N03", strand: "Number", topic: "Rational Numbers", contentDescription: "add, subtract, multiply and divide rational numbers, using efficient strategies", elaborations: ["using number lines", "models for multiplying fractions", "converting mixed numbers and improper fractions"] },
            { id: "AC9M7N04", strand: "Number", topic: "Percentage Applications", contentDescription: "calculate percentage increase and decrease, and compare quantities using percentages", elaborations: ["solving discount/markup problems", "comparing prices using percentages", "calculating population change"] },
            { id: "AC9M7N05", strand: "Number", topic: "Financial Maths", contentDescription: "investigate and calculate 'best buys' and solve problems involving money", elaborations: ["comparing unit prices", "calculating profit and loss", "budgeting with percentages"] },
            { id: "AC9M7N06", strand: "Number", topic: "Prime Factorisation", contentDescription: "identify and describe the properties of prime, composite, square and triangular numbers", elaborations: ["using factor trees for prime factorisation", "finding HCF and LCM", "exploring square and triangular numbers"] },
            { id: "AC9M7N07", strand: "Number", topic: "Approximation", contentDescription: "round decimals to a specified number of decimal places, connect fractions, decimals and percentages", elaborations: ["rounding and truncating decimals", "converting between fraction/decimal/percentage", "understanding terminating and recurring decimals"] },
          ],
          "Algebra": [
            { id: "AC9M7A01", strand: "Algebra", topic: "Patterning", contentDescription: "describe relationships between variables using patterns and graphs", elaborations: ["identifying patterns in tables and graphs", "describing variable relationships", "creating rules from patterns"] },
            { id: "AC9M7A02", strand: "Algebra", topic: "Linear Equations", contentDescription: "solve one-step linear equations using concrete, pictorial and symbolic methods", elaborations: ["balance scales to model equations", "substituting values into formulas", "checking solutions"] },
            { id: "AC9M7A03", strand: "Algebra", topic: "Formulas", contentDescription: "substitute values into formulas and determine unknown values", elaborations: ["using formulas for area/perimeter", "evaluating algebraic expressions", "solving word problems with formulas"] },
            { id: "AC9M7A04", strand: "Algebra", topic: "Linear Relationships", contentDescription: "plot ordered pairs on a Cartesian plane and interpret linear relationships", elaborations: ["creating tables of values", "plotting points on the Cartesian plane", "identifying linear patterns from graphs"] },
          ],
          "Measurement": [
            { id: "AC9M7M01", strand: "Measurement", topic: "Perimeter and Area", contentDescription: "solve problems involving the perimeter and area of composite shapes", elaborations: ["calculating perimeter of composite shapes", "using formulas for area of triangles/quadrilaterals", "converting between area units"] },
            { id: "AC9M7M02", strand: "Measurement", topic: "Volume", contentDescription: "calculate the volume of rectangular prisms and investigate capacity", elaborations: ["using V = lwh formula", "converting between mL and cm³", "solving capacity problems"] },
            { id: "AC9M7M03", strand: "Measurement", topic: "Time", contentDescription: "solve problems involving duration, including 12- and 24-hour time", elaborations: ["calculating time intervals", "converting 12/24 hour time", "solving travel time problems"] },
            { id: "AC9M7M04", strand: "Measurement", topic: "Circles", contentDescription: "investigate the relationship between circumference and diameter, and calculate circumference", elaborations: ["exploring π as ratio", "calculating circumference", "solving problems involving circles"] },
          ],
          "Space": [
            { id: "AC9M7SP01", strand: "Space", topic: "Angles", contentDescription: "classify angles, identify angle relationships and solve angle problems", elaborations: ["classifying acute/obtuse/reflex/right angles", "identifying vertically opposite/alternate/corresponding angles", "solving angle problems in diagrams"] },
            { id: "AC9M7SP02", strand: "Space", topic: "Geometric Drawings", contentDescription: "draw triangles and quadrilaterals using given conditions", elaborations: ["using protractors and rulers", "constructing triangles given side/angle conditions", "exploring properties of special quadrilaterals"] },
            { id: "AC9M7SP03", strand: "Space", topic: "Transformations", contentDescription: "describe translations, reflections and rotations on the Cartesian plane", elaborations: ["translating points and shapes", "reflecting across axes", "rotating about the origin"] },
          ],
          "Statistics": [
            { id: "AC9M7ST01", strand: "Statistics", topic: "Data Collection", contentDescription: "plan and conduct statistical investigations using appropriate sampling methods", elaborations: ["designing survey questions", "distinguishing population and sample", "using random sampling techniques"] },
            { id: "AC9M7ST02", strand: "Statistics", topic: "Data Representation", contentDescription: "construct dot plots, stem-and-leaf plots and histograms", elaborations: ["creating dot plots for small data sets", "constructing stem-and-leaf plots", "building histograms with equal intervals"] },
            { id: "AC9M7ST03", strand: "Statistics", topic: "Data Interpretation", contentDescription: "interpret data displays and calculate measures of centre and spread", elaborations: ["calculating mean, median, mode and range", "comparing distributions", "identifying outliers"] },
          ],
          "Probability": [
            { id: "AC9M7P01", strand: "Probability", topic: "Chance Experiments", contentDescription: "construct and use sample spaces to determine probabilities", elaborations: ["listing outcomes of chance experiments", "calculating theoretical probability", "comparing experimental and theoretical probability"] },
            { id: "AC9M7P02", strand: "Probability", topic: "Probability Scale", contentDescription: "describe probabilities using fractions, decimals and percentages on a scale", elaborations: ["placing events on probability scale", "using language of chance", "understanding complementary events"] },
          ],
        },
        achievementStandard: "By the end of Year 7, students solve problems involving integers, percentages and ratios. They use algebraic variables to represent quantities and solve linear equations. Students calculate areas and volumes, classify angles, and describe transformations. They construct data displays and determine probabilities.",
      },
      "8": {
        year: 8,
        strands: {
          "Number": [
            { id: "AC9M8N01", strand: "Number", topic: "Real Numbers", contentDescription: "compare and order real numbers, including irrational numbers", elaborations: ["distinguishing rational and irrational numbers", "ordering on a number line", "approximating square roots"] },
            { id: "AC9M8N02", strand: "Number", topic: "Squares and Roots", contentDescription: "calculate squares, square roots, cubes and cube roots", elaborations: ["memorising square numbers", "estimating square roots", "using prime factorisation for roots"] },
            { id: "AC9M8N03", strand: "Number", topic: "Rates and Ratios", contentDescription: "solve problems involving rates and ratios", elaborations: ["simplifying ratios", "solving problems using rates", "converting between units of speed"] },
            { id: "AC9M8N04", strand: "Number", topic: "Proportional Reasoning", contentDescription: "solve problems involving direct proportion and the unitary method", elaborations: ["using unitary method", "solving proportion problems", "applying to currency conversion"] },
          ],
          "Algebra": [
            { id: "AC9M8A01", strand: "Algebra", topic: "Algebraic Expressions", contentDescription: "expand and factorise algebraic expressions", elaborations: ["expanding brackets", "factorising using common factors", "simplifying algebraic fractions"] },
            { id: "AC9M8A02", strand: "Algebra", topic: "Linear Equations", contentDescription: "solve multi-step linear equations and inequalities", elaborations: ["solving equations with pronumerals on both sides", "solving inequalities", "representing solutions on a number line"] },
            { id: "AC9M8A03", strand: "Algebra", topic: "Graphing", contentDescription: "sketch linear graphs using intercepts and gradient", elaborations: ["finding x and y intercepts", "calculating gradient", "sketching from y = mx + c"] },
          ],
          "Measurement": [
            { id: "AC9M8M01", strand: "Measurement", topic: "Area", contentDescription: "calculate the area of circles and composite shapes", elaborations: ["using πr² for circles", "composite areas using addition and subtraction", "solving practical problems"] },
            { id: "AC9M8M02", strand: "Measurement", topic: "Volume", contentDescription: "calculate the volume of prisms and cylinders", elaborations: ["using V = Ah", "volume of cylinders", "converting between volume and capacity"] },
            { id: "AC9M8M03", strand: "Measurement", topic: "Pythagoras", contentDescription: "use Pythagoras' theorem to find unknown side lengths in right-angled triangles", elaborations: ["proving Pythagoras' theorem", "calculating hypotenuse", "finding shorter sides"] },
          ],
          "Space": [
            { id: "AC9M8SP01", strand: "Space", topic: "Congruence", contentDescription: "identify congruent shapes and use congruence to solve problems", elaborations: ["testing congruence using matching sides/angles", "using SSS/SAS/AAS/RHS tests", "solving problems with congruent triangles"] },
            { id: "AC9M8SP02", strand: "Space", topic: "Enlargement", contentDescription: "describe and apply enlargements and reductions using scale factors", elaborations: ["enlarging shapes by a scale factor", "determining centre of enlargement", "using scale factors in maps"] },
          ],
          "Statistics": [
            { id: "AC9M8ST01", strand: "Statistics", topic: "Bivariate Data", contentDescription: "investigate relationships between two variables in bivariate data", elaborations: ["creating scatter plots", "describing correlation", "distinguishing correlation from causation"] },
          ],
          "Probability": [
            { id: "AC9M8P01", strand: "Probability", topic: "Two-step Experiments", contentDescription: "determine probabilities of two-step experiments using tree diagrams and arrays", elaborations: ["constructing tree diagrams", "using arrays for two-step experiments", "calculating probabilities of combined events"] },
          ],
        },
        achievementStandard: "By the end of Year 8, students solve problems involving rates, ratios and proportions. They expand and factorise algebraic expressions and solve multi-step linear equations. Students calculate areas of circles and volumes of prisms, apply Pythagoras' theorem, and identify congruent shapes. They construct scatter plots and determine probabilities of two-step events.",
      },
      "9": {
        year: 9,
        strands: {
          "Number": [
            { id: "AC9M9N01", strand: "Number", topic: "Scientific Notation", contentDescription: "express numbers in scientific notation and perform operations", elaborations: ["converting between standard and scientific notation", "multiplying/dividing in scientific notation", "using calculators with scientific notation"] },
            { id: "AC9M9N02", strand: "Number", topic: "Financial Maths", contentDescription: "solve problems involving simple interest, compound interest and depreciation", elaborations: ["calculating simple interest", "introducing compound interest", "solving depreciation problems"] },
          ],
          "Algebra": [
            { id: "AC9M9A01", strand: "Algebra", topic: "Indices", contentDescription: "extend exponent rules to include negative and zero powers", elaborations: ["understanding a⁰ = 1", "using negative exponents", "simplifying expressions with mixed exponents"] },
            { id: "AC9M9A02", strand: "Algebra", topic: "Quadratics", contentDescription: "expand binomial products and factorise monic quadratic expressions", elaborations: ["expanding (a+b)(c+d)", "factorising x² + bx + c", "solving quadratic equations by factorisation"] },
            { id: "AC9M9A03", strand: "Algebra", topic: "Inequalities", contentDescription: "solve linear inequalities and sketch their solutions on a number line", elaborations: ["solving multi-step inequalities", "representing on a number line", "solving compound inequalities"] },
            { id: "AC9M9A04", strand: "Algebra", topic: "Simultaneous Equations", contentDescription: "solve pairs of simultaneous linear equations graphically and algebraically", elaborations: ["solving graphically", "using substitution method", "using elimination method"] },
          ],
          "Measurement": [
            { id: "AC9M9M01", strand: "Measurement", topic: "Surface Area", contentDescription: "calculate the surface area of prisms, cylinders and composite solids", elaborations: ["nets of prisms", "surface area of cylinders", "composite solids"] },
            { id: "AC9M9M02", strand: "Measurement", topic: "Trigonometry", contentDescription: "use trigonometric ratios to find unknown sides and angles in right-angled triangles", elaborations: ["introducing sin, cos, tan", "using calculators for trig ratios", "solving right-angled triangle problems"] },
          ],
          "Space": [
            { id: "AC9M9SP01", strand: "Space", topic: "Similarity", contentDescription: "identify and test similar figures using matching ratios and scale factors", elaborations: ["testing similarity using matching ratios", "solving problems with similar triangles", "applying to shadow/reflection problems"] },
            { id: "AC9M9SP02", strand: "Space", topic: "Geometry Proof", contentDescription: "deduce geometric properties and provide simple proofs", elaborations: ["proving angle sum of a triangle", "proving exterior angle theorem", "deducing properties of special quadrilaterals"] },
          ],
          "Statistics": [
            { id: "AC9M9ST01", strand: "Statistics", topic: "Data Analysis", contentDescription: "compare data sets using measures of spread, including interquartile range", elaborations: ["calculating IQR and range", "constructing box plots", "comparing distributions using measures"] },
            { id: "AC9M9ST02", strand: "Statistics", topic: "Sampling", contentDescription: "explore the role of random sampling in making inferences about populations", elaborations: ["understanding sampling variability", "making inferences from samples", "evaluating survey methods"] },
          ],
          "Probability": [
            { id: "AC9M9P01", strand: "Probability", topic: "Conditional Probability", contentDescription: "calculate relative frequencies and estimate probabilities for events", elaborations: ["using relative frequency", "simulating chance experiments", "law of large numbers"] },
          ],
        },
        achievementStandard: "By the end of Year 9, students solve financial maths problems and work with scientific notation. They expand binomials, factorise quadratics and solve simultaneous equations. Students use trigonometry, calculate surface areas, and prove geometric relationships. They compare data using IQR and box plots, and estimate probabilities using relative frequency.",
      },
      "10": {
        year: 10,
        strands: {
          "Number": [
            { id: "AC9M10N01", strand: "Number", topic: "Logarithms", contentDescription: "introduce logarithms as inverse of exponentiation", elaborations: ["converting exponential to logarithmic form", "using logarithm laws", "solving simple logarithmic equations"] },
          ],
          "Algebra": [
            { id: "AC9M10A01", strand: "Algebra", topic: "Advanced Quadratics", contentDescription: "factorise non-monic quadratics and solve quadratic equations", elaborations: ["factorising ax²+bx+c", "solving using quadratic formula", "solving by completing the square"] },
            { id: "AC9M10A02", strand: "Algebra", topic: "Non-linear Graphs", contentDescription: "sketch parabolas, hyperbolas and exponential functions", elaborations: ["sketching y = x² and transformations", "reciprocal functions y = a/x", "exponential growth and decay curves"] },
            { id: "AC9M10A03", strand: "Algebra", topic: "Algebraic Fractions", contentDescription: "simplify and solve equations involving algebraic fractions", elaborations: ["simplifying rational expressions", "solving equations with algebraic fractions", "finding restricted values"] },
          ],
          "Measurement": [
            { id: "AC9M10M01", strand: "Measurement", topic: "Circle Geometry", contentDescription: "apply circle theorems and calculate arc lengths and sector areas", elaborations: ["angle at centre theorem", "arc length formula", "area of sectors and segments"] },
            { id: "AC9M10M02", strand: "Measurement", topic: "Non-right Trigonometry", contentDescription: "use sine rule, cosine rule and area formula for non-right triangles", elaborations: ["sine rule for sides and angles", "cosine rule", "area = ½ab sin C"] },
          ],
          "Space": [
            { id: "AC9M10SP01", strand: "Space", topic: "Vectors", contentDescription: "represent vectors in the plane and perform vector operations", elaborations: ["representing vectors as directed line segments", "adding and subtracting vectors", "multiplying by a scalar"] },
          ],
          "Statistics": [
            { id: "AC9M10ST01", strand: "Statistics", topic: "Normal Distribution", contentDescription: "explore the normal distribution and apply to data sets", elaborations: ["understanding bell-shaped distributions", "using 68-95-99.7 rule", "calculating z-scores"] },
          ],
          "Probability": [
            { id: "AC9M10P01", strand: "Probability", topic: "Independent Events", contentDescription: "determine probabilities of compound events using multiplication rule", elaborations: ["distinguishing independent and dependent events", "using P(A∩B) = P(A)P(B)", "application to binomial situations"] },
          ],
        },
        achievementStandard: "By the end of Year 10, students solve problems involving logarithms and quadratic equations. They sketch non-linear functions and solve equations with algebraic fractions. Students apply circle theorems and solve non-right triangles using sine and cosine rules. They analyse data using normal distribution and calculate compound event probabilities.",
      },
      "11": {
        year: 11,
        strands: {
          "Functions": [
            { id: "AC9M11F01", strand: "Functions", topic: "Function Notation", contentDescription: "use function notation and describe key features of functions", elaborations: ["using f(x) notation", "domain and range", "transformations of functions"] },
            { id: "AC9M11F02", strand: "Functions", topic: "Polynomials", contentDescription: "sketch and analyse polynomial functions up to degree 4", elaborations: ["sketching cubic and quartic functions", "factor theorem and remainder theorem", "finding roots and turning points"] },
            { id: "AC9M11F03", strand: "Functions", topic: "Exponentials and Logs", contentDescription: "sketch and analyse exponential and logarithmic functions", elaborations: ["graphing y = aˣ and y = logₐx", "solving exponential equations", "applications to growth and decay"] },
            { id: "AC9M11F04", strand: "Functions", topic: "Trigonometric Functions", contentDescription: "sketch and analyse sine and cosine functions", elaborations: ["graphing y = sin x and y = cos x", "amplitude, period and phase shift", "solving trig equations in a given domain"] },
          ],
          "Calculus": [
            { id: "AC9M11C01", strand: "Calculus", topic: "Differentiation", contentDescription: "introduce the concept of the derivative and differentiate polynomial functions", elaborations: ["first principles approach", "power rule", "finding gradients at a point"] },
            { id: "AC9M11C02", strand: "Calculus", topic: "Applications of Derivatives", contentDescription: "apply differentiation to find stationary points and sketch curves", elaborations: ["finding stationary points", "determining nature of stationary points", "optimisation problems"] },
          ],
          "Statistics": [
            { id: "AC9M11ST01", strand: "Statistics", topic: "Probability Distributions", contentDescription: "use discrete and continuous probability distributions", elaborations: ["discrete probability functions", "binomial distribution", "introduction to normal distribution"] },
          ],
        },
        achievementStandard: "By the end of Year 11, students use function notation and analyse polynomial, exponential and trigonometric functions. They differentiate simple functions and apply derivatives to find stationary points and solve optimisation problems. Students work with probability distributions and the binomial distribution.",
      },
      "12": {
        year: 12,
        strands: {
          "Calculus": [
            { id: "AC9M12C01", strand: "Calculus", topic: "Integration", contentDescription: "integrate functions and calculate definite integrals", elaborations: ["reverse chain rule", "definite integrals and area", "fundamental theorem of calculus"] },
            { id: "AC9M12C02", strand: "Calculus", topic: "Advanced Integration", contentDescription: "integrate trigonometric, exponential and logarithmic functions", elaborations: ["integrating eˣ and 1/x", "integration by substitution", "areas between curves"] },
            { id: "AC9M12C03", strand: "Calculus", topic: "Further Differentiation", contentDescription: "differentiate trigonometric, exponential and logarithmic functions", elaborations: ["derivative of sin x, cos x, eˣ, ln x", "product and quotient rules", "chain rule"] },
            { id: "AC9M12C04", strand: "Calculus", topic: "Rate of Change", contentDescription: "model and solve problems involving rates of change", elaborations: ["related rates", "exponential growth and decay", "differential equations"] },
          ],
          "Functions": [
            { id: "AC9M12F01", strand: "Functions", topic: "Composite Functions", contentDescription: "form and analyse composite and inverse functions", elaborations: ["composition of functions", "inverse functions and graphs", "restricting domain for invertibility"] },
          ],
          "Statistics": [
            { id: "AC9M12ST01", strand: "Statistics", topic: "Statistical Inference", contentDescription: "use confidence intervals for population parameters", elaborations: ["sampling distributions", "constructing confidence intervals", "interpreting confidence intervals"] },
            { id: "AC9M12ST02", strand: "Statistics", topic: "Hypothesis Testing", contentDescription: "conduct simple hypothesis tests", elaborations: ["null and alternative hypotheses", "p-values and significance levels", "interpreting results in context"] },
          ],
        },
        achievementStandard: "By the end of Year 12, students integrate a range of functions and apply calculus to model rates of change. They differentiate trigonometric, exponential and logarithmic functions, and analyse composite and inverse functions. Students construct confidence intervals and conduct hypothesis tests.",
      },
    },
  },
};

export const curriculumResolvers = {
  Query: {
    curriculumSubjects: async (_: unknown, __: unknown, _ctx: GraphQLContext) => {
      return Object.values(DATA);
    },
    curriculumSubject: async (_: unknown, args: { subject: string }, _ctx: GraphQLContext) => {
      return DATA[args.subject] ?? null;
    },
  },
};
