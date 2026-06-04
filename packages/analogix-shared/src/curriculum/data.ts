import type {
  CurriculumSubject,
  GradeCurriculum,
  CurriculumStrand,
  CurriculumTopic,
} from "./types.js";

// ──────────────────────────────────────────────
// Maths (year 7–12)
// ──────────────────────────────────────────────

const mathGrade7: GradeCurriculum = {
  grade: 7,
  strands: [
    {
      id: "number",
      name: "Number",
      description: "Integers, powers, rational numbers and percentages",
      topics: [
        { id: "AC9M7N01", name: "Integers", description: "Apply knowledge of integers to add, subtract, multiply and divide integers, using appropriate strategies", keyTerms: ["integer", "positive", "negative", "absolute value"] },
        { id: "AC9M7N02", name: "Powers and Exponents", description: "Establish the exponent rules for multiplying and dividing powers, and the power of a power", keyTerms: ["exponent", "power", "base"] },
        { id: "AC9M7N03", name: "Rational Numbers", description: "Add, subtract, multiply and divide rational numbers, expressing as fractions in simplest form", keyTerms: ["rational", "fraction", "numerator", "denominator"] },
        { id: "AC9M7N04", name: "Percentage Applications", description: "Calculate percentage increase and decrease, compare quantities using percentages", keyTerms: ["percentage", "increase", "decrease", "discount"] },
      ],
    },
    {
      id: "algebra",
      name: "Algebra",
      description: "Patterning, linear equations and algebraic expressions",
      topics: [
        { id: "AC9M7A01", name: "Patterning", description: "Describe relationships between variables in terms of differences and ratios, use patterns and graphs to create rules", keyTerms: ["pattern", "variable", "relationship", "rule"] },
        { id: "AC9M7A02", name: "Linear Equations", description: "Solve one-step linear equations using concrete, pictorial and symbolic methods", keyTerms: ["equation", "solve", "balance"] },
        { id: "AC9M7A03", name: "Algebraic Expressions", description: "Generate and simplify expressions by collecting like terms, using the distributive property", keyTerms: ["expression", "like terms", "distributive", "expand"] },
      ],
    },
    {
      id: "measurement",
      name: "Measurement",
      description: "Area, perimeter, volume and time",
      topics: [
        { id: "AC9M7M01", name: "Area and Perimeter", description: "Calculate areas of composite shapes and perimeter of composite figures", keyTerms: ["area", "perimeter", "composite", "unit"] },
        { id: "AC9M7M02", name: "Volume", description: "Calculate the volume of rectangular and triangular prisms", keyTerms: ["volume", "prism", "capacity"] },
        { id: "AC9M7M03", name: "Time", description: "Solve problems involving duration, 12/24-hour time and time zones", keyTerms: ["time", "duration", "time zone"] },
      ],
    },
    {
      id: "geometry",
      name: "Geometry",
      description: "Angles, triangles and constructions",
      topics: [
        { id: "AC9M7G01", name: "Angles", description: "Identify corresponding, alternate and co-interior angles; solve problems with transversals on parallel lines", keyTerms: ["angle", "parallel", "transversal", "corresponding"] },
        { id: "AC9M7G02", name: "Triangles", description: "Classify triangles, quadrilaterals and polygons; apply angle sum properties", keyTerms: ["triangle", "quadrilateral", "polygon", "angle sum"] },
        { id: "AC9M7G03", name: "Construction", description: "Construct and annotate triangles and quadrilaterals using digital tools", keyTerms: ["construct", "annotate", "geometry software"] },
      ],
    },
    {
      id: "statistics",
      name: "Statistics",
      description: "Data collection, representation and measures",
      topics: [
        { id: "AC9M7ST01", name: "Data Collection", description: "Collect and record categorical and numerical data from primary and secondary sources", keyTerms: ["data", "survey", "spreadsheet"] },
        { id: "AC9M7ST02", name: "Data Representation", description: "Construct and compare dot plots and stem-and-leaf plots", keyTerms: ["dot plot", "stem-and-leaf", "graph"] },
        { id: "AC9M7ST03", name: "Statistics Measures", description: "Calculate mean, median and mode; describe the relationship between them", keyTerms: ["mean", "median", "mode", "average"] },
      ],
    },
    {
      id: "probability",
      name: "Probability",
      description: "Probability concepts and experimental probability",
      topics: [
        { id: "AC9M7P01", name: "Probability Concepts", description: "Describe the complement of an event and calculate its probability", keyTerms: ["probability", "event", "complement", "sample space"] },
        { id: "AC9M7P02", name: "Experimental Probability", description: "Conduct repeated chance experiments to predict relative frequency", keyTerms: ["experiment", "frequency", "trial", "simulation"] },
      ],
    },
  ],
};

const mathGrade8: GradeCurriculum = {
  grade: 8,
  strands: [
    {
      id: "number",
      name: "Number",
      description: "Real numbers, index laws and surds",
      topics: [
        { id: "AC9M8N01", name: "Real Numbers", description: "Use rational numbers to solve problems, including financial contexts", keyTerms: ["rational", "financial", "rounding"] },
        { id: "AC9M8N02", name: "Index Laws", description: "Apply exponent laws to numerical expressions with integer exponents", keyTerms: ["exponent", "law", "index"] },
        { id: "AC9M8N03", name: "Square Roots and Surds", description: "Apply the square root law to simplify perfect squares and approximate square roots", keyTerms: ["square root", "surd", "radical"] },
      ],
    },
    {
      id: "algebra",
      name: "Algebra",
      description: "Linear equations, relationships and factorisation",
      topics: [
        { id: "AC9M8A01", name: "Linear Equations", description: "Solve linear equations with variables on both sides and brackets", keyTerms: ["equation", "variable", "bracket"] },
        { id: "AC9M8A02", name: "Linear Relationships", description: "Graph linear relationships; derive equations from graphs and tables", keyTerms: ["graph", "gradient", "intercept", "linear"] },
        { id: "AC9M8A03", name: "Factorisation", description: "Factorise algebraic expressions by taking out the highest common factor", keyTerms: ["factor", "HCF", "expand", "verify"] },
      ],
    },
    {
      id: "measurement",
      name: "Measurement",
      description: "Area of composite shapes, surface area and scale",
      topics: [
        { id: "AC9M8M01", name: "Area of Composite Shapes", description: "Solve problems involving areas of composite shapes, including sectors", keyTerms: ["area", "composite", "sector"] },
        { id: "AC9M8M02", name: "Surface Area and Volume", description: "Calculate surface area and volume of cylinders, prisms and composite solids", keyTerms: ["surface area", "volume", "cylinder", "prism"] },
        { id: "AC9M8M03", name: "Scale and Similarity", description: "Use gradients to solve problems involving rates and scale drawings", keyTerms: ["scale", "gradient", "rate", "proportion"] },
      ],
    },
    {
      id: "geometry",
      name: "Geometry",
      description: "Congruence, transformations and Pythagoras",
      topics: [
        { id: "AC9M8G01", name: "Congruence", description: "Demonstrate triangle congruence using SAS, SSS and RHS tests", keyTerms: ["congruence", "triangle", "proof"] },
        { id: "AC9M8G02", name: "Geometric Transformations", description: "Apply translation, reflection, rotation and dilation to geometric figures", keyTerms: ["translation", "reflection", "rotation", "dilation"] },
        { id: "AC9M8G03", name: "Pythagoras Theorem", description: "Apply Pythagoras theorem to solve problems involving right-angled triangles", keyTerms: ["Pythagoras", "hypotenuse", "right angle"] },
      ],
    },
    {
      id: "statistics",
      name: "Statistics",
      description: "Bivariate data and summary statistics",
      topics: [
        { id: "AC9M8ST01", name: "Bivariate Data", description: "Construct scatterplots; identify and describe relationships between two numerical variables", keyTerms: ["scatterplot", "correlation", "bivariate"] },
        { id: "AC9M8ST02", name: "Summary Statistics", description: "Calculate and compare mean, median, range and interquartile range", keyTerms: ["IQR", "range", "box plot"] },
      ],
    },
    {
      id: "probability",
      name: "Probability",
      description: "Two-step experiments",
      topics: [
        { id: "AC9M8P01", name: "Probability Rules", description: "List outcomes for two-step experiments; calculate probabilities using fractions and percentages", keyTerms: ["two-step", "tree diagram", "Venn diagram"] },
      ],
    },
  ],
};

const mathGrade9: GradeCurriculum = {
  grade: 9,
  strands: [
    { id: "number", name: "Number", description: "Real numbers, scientific notation and surds", topics: [
      { id: "AC9M9N01", name: "Real Numbers", description: "Recognise the real number system includes rational and irrational numbers", keyTerms: ["real", "rational", "irrational"] },
      { id: "AC9M9N02", name: "Scientific Notation", description: "Use scientific notation to represent very large and very small numbers", keyTerms: ["scientific notation", "standard form", "exponent"] },
      { id: "AC9M9N03", name: "Surds", description: "Perform operations with surds, including expansion, factorisation and rationalising", keyTerms: ["surd", "rationalise", "expand"] },
    ] },
    { id: "algebra", name: "Algebra", description: "Linear equations, inequalities, quadratics", topics: [
      { id: "AC9M9A01", name: "Linear Equations", description: "Solve linear equations with integer coefficients where the unknown appears on both sides", keyTerms: ["linear", "equation", "both sides"] },
      { id: "AC9M9A02", name: "Linear Inequalities", description: "Solve linear inequalities and represent the solution on a number line", keyTerms: ["inequality", "number line", "solution set"] },
      { id: "AC9M9A03", name: "Quadratic Expressions", description: "Factorise quadratic expressions including difference of squares and perfect squares", keyTerms: ["quadratic", "factor", "difference of squares"] },
      { id: "AC9M9A04", name: "Quadratic Equations", description: "Solve quadratic equations using null factor law, completing the square and the quadratic formula", keyTerms: ["quadratic formula", "completing the square", "null factor"] },
    ] },
    { id: "measurement", name: "Measurement", description: "Trigonometry, area/volume and similarity", topics: [
      { id: "AC9M9M01", name: "Trigonometry", description: "Apply trigonometry to solve right-angled triangle problems", keyTerms: ["sine", "cosine", "tangent", "elevation"] },
      { id: "AC9M9M02", name: "Area and Volume", description: "Calculate surface area and volume of pyramids, cones and spheres", keyTerms: ["pyramid", "cone", "sphere", "surface area"] },
      { id: "AC9M9M03", name: "Similarity", description: "Apply similarity involving scale factors, area ratios and volume ratios", keyTerms: ["similar", "scale factor", "ratio"] },
    ] },
    { id: "geometry", name: "Geometry", description: "Angle properties and circle geometry", topics: [
      { id: "AC9M9G01", name: "Angle Properties", description: "Prove and apply angle properties of triangles, quadrilaterals and circles", keyTerms: ["angle sum", "isosceles", "semi-circle"] },
      { id: "AC9M9G02", name: "Circle Geometry", description: "Apply angle and chord properties of circles; prove circle theorems", keyTerms: ["circle theorem", "chord", "subtend", "cyclic"] },
    ] },
    { id: "statistics", name: "Statistics", description: "Box plots and statistical investigation", topics: [
      { id: "AC9M9ST01", name: "Data Representation", description: "Construct and interpret box plots using 5-number summaries", keyTerms: ["box plot", "quartile", "five-number"] },
      { id: "AC9M9ST02", name: "Statistical Inference", description: "Conduct statistical investigations including random sampling", keyTerms: ["sampling", "investigation", "inference"] },
      { id: "AC9M9ST03", name: "Bivariate Analysis", description: "Use technology to fit a least-squares line and make predictions", keyTerms: ["regression", "least-squares", "prediction"] },
    ] },
    { id: "probability", name: "Probability", description: "Conditional probability", topics: [
      { id: "AC9M9P01", name: "Probability Rules", description: "Use conditional probability notation P(A|B); solve problems with two-way tables and Venn diagrams", keyTerms: ["conditional", "P(A|B)", "two-way table"] },
    ] },
  ],
};

const mathGrade10: GradeCurriculum = {
  grade: 10,
  strands: [
    { id: "number", name: "Number", description: "Finance, logarithms and exponentials", topics: [
      { id: "AC9M10N01", name: "Finance", description: "Solve problems involving simple and compound interest", keyTerms: ["interest", "compound", "principal", "A = P(1+r/n)^(nt)"] },
      { id: "AC9M10N02", name: "Logarithms", description: "Define logarithms as indices; establish log laws", keyTerms: ["logarithm", "log", "log(a)+log(b)=log(ab)"] },
      { id: "AC9M10N03", name: "Exponential Functions", description: "Graph exponential functions; solve exponential equations using logarithms", keyTerms: ["exponential", "growth", "decay"] },
    ] },
    { id: "algebra", name: "Algebra", description: "Simultaneous equations, parabolas and polynomials", topics: [
      { id: "AC9M10A01", name: "Linear and Quadratic Functions", description: "Solve simultaneous linear equations graphically, numerically and algebraically", keyTerms: ["simultaneous", "substitution", "elimination"] },
      { id: "AC9M10A02", name: "Parabolic Functions", description: "Graph parabolas using vertex, axis of symmetry and intercepts", keyTerms: ["parabola", "vertex", "axis of symmetry"] },
      { id: "AC9M10A03", name: "Polynomial Functions", description: "Expand and factorise polynomial expressions; use the factor theorem", keyTerms: ["polynomial", "factor theorem", "root"] },
    ] },
    { id: "measurement", name: "Measurement", description: "Non-right trigonometry and rates", topics: [
      { id: "AC9M10M01", name: "Trigonometry", description: "Solve non-right angled triangles using sine rule, cosine rule and area formula", keyTerms: ["sine rule", "cosine rule", "area"] },
      { id: "AC9M10M02", name: "Rates and Ratios", description: "Solve problems involving rates, ratios, direct and inverse proportion", keyTerms: ["rate", "ratio", "proportion"] },
    ] },
    { id: "geometry", name: "Geometry", description: "Coordinate geometry and circle geometry", topics: [
      { id: "AC9M10G01", name: "Coordinate Geometry", description: "Apply coordinate geometry; parallel and perpendicular lines", keyTerms: ["coordinate", "parallel", "perpendicular", "midpoint"] },
      { id: "AC9M10G02", name: "Circle Geometry", description: "Prove results about chords and arcs; angle in alternate segment", keyTerms: ["chord", "arc", "alternate segment"] },
    ] },
    { id: "statistics", name: "Statistics", description: "Normal distribution and hypothesis testing", topics: [
      { id: "AC9M10ST01", name: "Normal Distribution", description: "Use standard deviation to compare datasets; normal distribution properties", keyTerms: ["normal", "standard deviation", "z-score"] },
      { id: "AC9M10ST02", name: "Hypothesis Testing", description: "Conduct random sampling; use sample data to make predictions", keyTerms: ["sampling", "confidence interval", "inference"] },
    ] },
    { id: "probability", name: "Probability", description: "Probability distributions and central limit theorem", topics: [
      { id: "AC9M10P01", name: "Probability Distributions", description: "Use probability distributions to model continuous random variables", keyTerms: ["distribution", "normal", "random variable"] },
      { id: "AC9M10P02", name: "Sampling and Inference", description: "Use the central limit theorem to make inferences", keyTerms: ["CLT", "sampling distribution", "inference"] },
    ] },
  ],
};

const mathGrade11: GradeCurriculum = {
  grade: 11,
  strands: [
    { id: "functions", name: "Functions and Algebra", description: "Functions, exponentials, logarithms and trigonometry", topics: [
      { id: "AC-M11-FA01", name: "Working with Functions", description: "Examine the concept of a function; use function notation", keyTerms: ["function", "domain", "range", "asymptote"] },
      { id: "AC-M11-FA02", name: "Exponential Functions", description: "Work with exponential functions, graphs and applications", keyTerms: ["exponential", "growth", "decay"] },
      { id: "AC-M11-FA03", name: "Logarithmic Functions", description: "Understand the relationship between exponential and logarithmic functions", keyTerms: ["logarithm", "inverse", "log laws"] },
      { id: "AC-M11-FA04", name: "Trigonometric Functions", description: "Work with trig functions, graphs and the unit circle", keyTerms: ["sine", "cosine", "tangent", "unit circle"] },
    ] },
    { id: "calculus", name: "Calculus", description: "Introduction to differentiation and applications", topics: [
      { id: "AC-M11-C01", name: "Introduction to Differentiation", description: "Understand gradient and derivative as a rate of change", keyTerms: ["derivative", "gradient", "rate of change"] },
      { id: "AC-M11-C02", name: "Differentiation Rules", description: "Apply chain rule, product rule and quotient rule", keyTerms: ["chain rule", "product rule", "quotient rule"] },
      { id: "AC-M11-C03", name: "Applications of Differentiation", description: "Solve problems including stationary points, optimisation and curve sketching", keyTerms: ["stationary point", "optimisation", "curve sketch"] },
    ] },
    { id: "probability-stats", name: "Probability and Statistics", description: "Discrete probability and binomial distribution", topics: [
      { id: "AC-M11-PS01", name: "Discrete Probability Distributions", description: "Understand discrete random variables, probability distributions, expected value and variance", keyTerms: ["discrete", "expected value", "variance"] },
      { id: "AC-M11-PS02", name: "Bernoulli Trials and Binomial Distribution", description: "Examine Bernoulli trials and the binomial distribution", keyTerms: ["Bernoulli", "binomial", "trial"] },
    ] },
  ],
};

const mathGrade12: GradeCurriculum = {
  grade: 12,
  strands: [
    { id: "calculus-advanced", name: "Further Functions and Calculus", description: "Integration, applications and differential equations", topics: [
      { id: "AC-M12-FC01", name: "Integration", description: "Understand integration as the reverse of differentiation; FTC", keyTerms: ["integral", "FTC", "antiderivative"] },
      { id: "AC-M12-FC02", name: "Applications of Integration", description: "Find areas under curves, volumes of revolution", keyTerms: ["area", "volume", "revolution"] },
      { id: "AC-M12-FC03", name: "Differential Equations", description: "Form and solve differential equations; growth and decay models", keyTerms: ["differential equation", "separable", "growth"] },
    ] },
    { id: "trig-calc", name: "Trigonometric Functions and Calculus", description: "Advanced trig and calculus", topics: [
      { id: "AC-M12-TC01", name: "Advanced Trigonometry", description: "Work with advanced trig identities, equations and calculus", keyTerms: ["identity", "equation", "differentiate"] },
      { id: "AC-M12-TC02", name: "Trigonometric Graphs and Applications", description: "Analyse and graph transformed trig functions", keyTerms: ["graph", "transform", "periodic"] },
    ] },
    { id: "stats-advanced", name: "Probability and Statistics", description: "Normal distribution, sampling, regression", topics: [
      { id: "AC-M12-PS01", name: "Normal Distribution", description: "Understand the normal distribution, z-scores and applications", keyTerms: ["normal", "z-score", "standard normal"] },
      { id: "AC-M12-PS02", name: "Sampling and Estimation", description: "Examine sampling distributions, confidence intervals and hypothesis testing", keyTerms: ["confidence interval", "hypothesis test", "CLT"] },
      { id: "AC-M12-PS03", name: "Linear Regression", description: "Analyse bivariate data, fit linear regression models", keyTerms: ["regression", "correlation", "least squares"] },
    ] },
    { id: "financial", name: "Financial Mathematics", description: "Loans, annuities and investment", topics: [
      { id: "AC-M12-FM01", name: "Loans and Annuities", description: "Understand and apply financial mathematics for loans and annuities", keyTerms: ["loan", "annuity", "perpetuity"] },
      { id: "AC-M12-FM02", name: "Investment and Depreciation", description: "Examine investment options and depreciation methods", keyTerms: ["investment", "depreciation", "amortisation"] },
    ] },
  ],
};

// ──────────────────────────────────────────────
// Raw data — full curriculum tree
// ──────────────────────────────────────────────

export const CURRICULUM_DATA: CurriculumSubject[] = [
  {
    id: "math",
    name: "Mathematics",
    color: "#6366f1",
    icon: "sigma",
    grades: [mathGrade7, mathGrade8, mathGrade9, mathGrade10, mathGrade11, mathGrade12],
  },
  {
    id: "english",
    name: "English",
    color: "#ec4899",
    icon: "book-open-variant",
    grades: [
      {
        grade: 7, strands: [
          { id: "lit7", name: "Literature", description: "Responding to and creating literature", topics: [
            { id: "AC9E7LE01", name: "Responding to Literature", description: "Explain how characters, settings and events contribute to meaning", keyTerms: ["character", "setting", "theme", "genre"] },
            { id: "AC9E7LE02", name: "Creating Literature", description: "Create texts using language and visual features appropriate to purpose and audience", keyTerms: ["purpose", "audience", "visual features"] },
          ] },
          { id: "lang7", name: "Language", description: "Language for learning", topics: [
            { id: "AC9E7LA01", name: "Language for Learning", description: "Analyse how language features create meaning in informational and persuasive texts", keyTerms: ["language features", "informative", "persuasive"] },
            { id: "AC9E7LA02", name: "Grammar and Vocabulary", description: "Analyse the effect of language choices including technical language, modality and bias", keyTerms: ["modality", "bias", "technical language"] },
          ] },
          { id: "litcy7", name: "Literacy", description: "Comprehending and creating texts", topics: [
            { id: "AC9E7LC01", name: "Comprehending Texts", description: "Navigate and read texts with increasing complexity; explain how language and visual features shape meaning", keyTerms: ["comprehension", "visual literacy", "reading strategies"] },
            { id: "AC9E7LC02", name: "Creating Texts", description: "Plan, create and edit literary texts that experiment with language features", keyTerms: ["plan", "edit", "experiment"] },
          ] },
        ],
      },
      {
        grade: 8, strands: [
          { id: "lit8", name: "Literature", description: "Analysing literature", topics: [
            { id: "AC9E8LE01", name: "Analysing Literature", description: "Analyse how narrative devices, point of view and literary language shape meaning", keyTerms: ["narrative", "point of view", "foreshadowing"] },
            { id: "AC9E8LE02", name: "Creating Literature", description: "Create imaginative, informative and persuasive texts drawing on personal experience and research", keyTerms: ["imaginative", "research", "purpose"] },
          ] },
          { id: "lang8", name: "Language", description: "Text analysis and persuasion", topics: [
            { id: "AC9E8LA01", name: "Text Analysis", description: "Analyse how language choices build characterisation, create tone and mood", keyTerms: ["characterisation", "tone", "mood"] },
            { id: "AC9E8LA02", name: "Persuasive Language", description: "Analyse how language is used to persuade and influence audiences", keyTerms: ["persuasion", "rhetoric", "media"] },
          ] },
          { id: "litcy8", name: "Literacy", description: "Critical reading and writing", topics: [
            { id: "AC9E8LC01", name: "Critical Reading", description: "Interpret, synthesise and evaluate information from multiple sources", keyTerms: ["synthesis", "evaluate", "credibility"] },
            { id: "AC9E8LC02", name: "Writing Development", description: "Plan, draft and publish increasingly sophisticated analytical texts", keyTerms: ["draft", "publish", "analytical"] },
          ] },
        ],
      },
      {
        grade: 9, strands: [
          { id: "lit9", name: "Literature", description: "Literary analysis and creative writing", topics: [
            { id: "AC9E9LE01", name: "Literary Analysis", description: "Analyse how texts represent different perspectives, values and ideologies", keyTerms: ["perspective", "ideology", "interpretation"] },
            { id: "AC9E9LE02", name: "Creative Writing", description: "Create texts that experiment with style, structure and literary features", keyTerms: ["style", "voice", "structure"] },
          ] },
          { id: "lang9", name: "Language", description: "Critical language analysis and rhetoric", topics: [
            { id: "AC9E9LA01", name: "Critical Language Analysis", description: "Analyse how language positions audiences and how different interpretations arise", keyTerms: ["positioning", "subtext", "implication"] },
            { id: "AC9E9LA02", name: "Rhetoric and Argument", description: "Analyse how rhetoric and persuasive language influence audiences", keyTerms: ["rhetoric", "argument", "speech"] },
          ] },
          { id: "litcy9", name: "Literacy", description: "Independent reading and extended writing", topics: [
            { id: "AC9E9LC01", name: "Independent Reading", description: "Read and view texts independently and critically", keyTerms: ["independent", "critical", "response"] },
            { id: "AC9E9LC02", name: "Extended Writing", description: "Plan, draft and refine sophisticated analytical and creative texts", keyTerms: ["sophisticated", "coherence", "cohesion"] },
          ] },
        ],
      },
      {
        grade: 10, strands: [
          { id: "lit10", name: "Literature", description: "Comparative analysis and literary craft", topics: [
            { id: "AC9E10LE01", name: "Comparative Analysis", description: "Analyse and compare how texts represent ideas, values and perspectives", keyTerms: ["compare", "represent", "evaluate"] },
            { id: "AC9E10LE02", name: "Literary Craft", description: "Create sustained literary texts that experiment with form, style and literary devices", keyTerms: ["form", "device", "sustained"] },
          ] },
          { id: "lang10", name: "Language", description: "Discourse analysis and advanced persuasion", topics: [
            { id: "AC9E10LA01", name: "Discourse Analysis", description: "Analyse how discourse structures and language patterns construct meaning", keyTerms: ["discourse", "structure", "position"] },
            { id: "AC9E10LA02", name: "Advanced Persuasion", description: "Analyse sophisticated persuasive techniques including loaded language and logical appeals", keyTerms: ["loaded language", "appeal", "evaluate"] },
          ] },
          { id: "litcy10", name: "Literacy", description: "Advanced interpretation and professional writing", topics: [
            { id: "AC9E10LC01", name: "Advanced Interpretation", description: "Read complex texts critically and analytically to develop justified interpretations", keyTerms: ["interpret", "justify", "complex"] },
            { id: "AC9E10LC02", name: "Professional Writing", description: "Plan, draft and publish polished analytical, creative and persuasive texts", keyTerms: ["polish", "control", "sophisticated"] },
          ] },
        ],
      },
      {
        grade: 11, strands: [
          { id: "read11", name: "Reading and Viewing", description: "Critical analysis, comparative study, texts and society", topics: [
            { id: "AC-E11-R01", name: "Critical Analysis", description: "Analyse how texts construct meaning, position audiences and represent ideas", keyTerms: ["meaning", "position", "representation"] },
            { id: "AC-E11-R02", name: "Comparative Study", description: "Compare and contrast texts across different contexts and genres", keyTerms: ["compare", "context", "genre"] },
            { id: "AC-E11-R03", name: "Texts and Society", description: "Analyse how texts reflect social, historical and cultural contexts", keyTerms: ["context", "identity", "culture"] },
          ] },
          { id: "write11", name: "Writing and Speaking", description: "Analytical, creative and persuasive composition", topics: [
            { id: "AC-E11-W01", name: "Analytical Writing", description: "Compose sustained analytical essays that evaluate texts and construct arguments", keyTerms: ["essay", "argument", "evidence"] },
            { id: "AC-E11-W02", name: "Creative Composition", description: "Create innovative, imaginative texts experimenting with form and voice", keyTerms: ["creative", "voice", "experiment"] },
            { id: "AC-E11-W03", name: "Persuasion and Advocacy", description: "Compose persuasive texts using sophisticated rhetorical strategies", keyTerms: ["persuasion", "rhetoric", "advocacy"] },
          ] },
          { id: "lang11", name: "Language Study", description: "Language and power, intertextuality", topics: [
            { id: "AC-E11-L01", name: "Language and Power", description: "Analyse how language constructs power relationships and social positions", keyTerms: ["power", "authority", "institution"] },
            { id: "AC-E11-L02", name: "Intertextuality", description: "Analyse how texts draw upon and transform other texts", keyTerms: ["intertextuality", "allusion", "transformation"] },
          ] },
        ],
      },
      {
        grade: 12, strands: [
          { id: "read12", name: "Reading and Viewing", description: "Advanced critical analysis, identity and global texts", topics: [
            { id: "AC-E12-R01", name: "Advanced Critical Analysis", description: "Undertake sophisticated analysis of complex texts; evaluate multiple interpretations", keyTerms: ["sophisticated", "interpretation", "independent"] },
            { id: "AC-E12-R02", name: "Literature and Identity", description: "Analyse how literature explores identity, experience and meaning", keyTerms: ["identity", "diversity", "perspective"] },
            { id: "AC-E12-R03", name: "Global Texts", description: "Analyse texts from different cultural contexts", keyTerms: ["global", "culture", "representation"] },
          ] },
          { id: "write12", name: "Writing and Speaking", description: "Extended analytical, imaginative and modular writing", topics: [
            { id: "AC-E12-W01", name: "Extended Analytical Composition", description: "Compose sustained sophisticated analytical essays", keyTerms: ["essay", "nuanced", "masterful"] },
            { id: "AC-E12-W02", name: "Imaginative Writing", description: "Create sustained innovative imaginative texts", keyTerms: ["narrative", "voice", "stylish"] },
            { id: "AC-E12-W03", name: "Modular Writing", description: "Adapt writing for different purposes, audiences and contexts", keyTerms: ["adapt", "register", "flexibility"] },
          ] },
          { id: "lang12", name: "Language and Representation", description: "Representation, discourse and metalanguage", topics: [
            { id: "AC-E12-L01", name: "Representation and Reality", description: "Analyse how language constructs representations of reality", keyTerms: ["representation", "reality", "meaning"] },
            { id: "AC-E12-L02", name: "Discourse Analysis", description: "Undertake advanced discourse analysis", keyTerms: ["discourse", "power", "knowledge"] },
            { id: "AC-E12-L03", name: "Metalanguage", description: "Apply sophisticated understanding of how language works", keyTerms: ["metalanguage", "critique", "awareness"] },
          ] },
        ],
      },
    ],
  },
  {
    id: "science",
    name: "Science",
    color: "#22c55e",
    icon: "flask",
    grades: [
      {
        grade: 7, strands: [
          { id: "sciphys7", name: "Physics", description: "Forces, motion and energy", topics: [
            { id: "AC9S7U01", name: "Forces and Motion", description: "Describe and predict the effect of forces on the motion of objects", keyTerms: ["force", "gravity", "friction", "motion"] },
            { id: "AC9S7U02", name: "Energy", description: "Describe the relationship between temperature and particle movement; heat transfer", keyTerms: ["energy", "heat", "temperature", "convection"] },
          ] },
          { id: "scichem7", name: "Chemistry", description: "Particle theory and mixtures", topics: [
            { id: "AC9S7C01", name: "Particle Theory", description: "Describe the particle nature of matter and explain properties of solids, liquids and gases", keyTerms: ["particle", "state", "change of state"] },
            { id: "AC9S7C02", name: "Pure Substances", description: "Distinguish between pure substances and mixtures; describe separation methods", keyTerms: ["pure", "mixture", "filtration", "evaporation"] },
          ] },
          { id: "scibio7", name: "Biology", description: "Cells and ecosystems", topics: [
            { id: "AC9S7B01", name: "Cells", description: "Describe the structure and function of cells as the basic unit of living things", keyTerms: ["cell", "organelle", "plant", "animal"] },
            { id: "AC9S7B02", name: "Ecosystems", description: "Describe interactions in food webs; explain matter and energy flow", keyTerms: ["ecosystem", "food web", "energy"] },
          ] },
          { id: "sciearth7", name: "Earth Science", description: "Earth's resources", topics: [
            { id: "AC9S7E01", name: "Earth's Resources", description: "Describe renewable and non-renewable resources; evaluate sustainability practices", keyTerms: ["renewable", "non-renewable", "sustainability"] },
          ] },
        ],
      },
      {
        grade: 8, strands: [
          { id: "sciphys8", name: "Physics", description: "Light, sound and electricity", topics: [
            { id: "AC9S8U01", name: "Light and Sound", description: "Explain how light and sound are produced, transmitted and detected", keyTerms: ["wave", "light", "sound", "reflection"] },
            { id: "AC9S8U02", name: "Electricity", description: "Explain how electric currents are produced; describe simple circuit components", keyTerms: ["circuit", "current", "voltage", "resistance"] },
          ] },
          { id: "scichem8", name: "Chemistry", description: "Chemical reactions and periodic table", topics: [
            { id: "AC9S8C01", name: "Chemical Reactions", description: "Describe chemical reactions as rearrangements of atoms", keyTerms: ["reaction", "equation", "reactant", "product"] },
            { id: "AC9S8C02", name: "Periodic Table", description: "Describe the structure of the periodic table; explain patterns in element properties", keyTerms: ["periodic table", "group", "period", "element"] },
          ] },
          { id: "scibio8", name: "Biology", description: "Cell processes and classification", topics: [
            { id: "AC9S8B01", name: "Cell Processes", description: "Explain photosynthesis and respiration", keyTerms: ["photosynthesis", "respiration", "equation"] },
            { id: "AC9S8B02", name: "Classification", description: "Describe the classification of living things; binomial nomenclature", keyTerms: ["classification", "kingdom", "binomial"] },
          ] },
          { id: "sciearth8", name: "Earth Science", description: "Plate tectonics", topics: [
            { id: "AC9S8E01", name: "Plate Tectonics", description: "Explain tectonic plate movement; describe formation of landforms", keyTerms: ["plate", "tectonic", "earthquake", "volcano"] },
          ] },
        ],
      },
      {
        grade: 9, strands: [
          { id: "sciphys9", name: "Physics", description: "Newton's laws and energy transfer", topics: [
            { id: "AC9S9U01", name: "Newton's Laws", description: "Describe and predict motion using Newton's three laws", keyTerms: ["inertia", "F=ma", "action-reaction"] },
            { id: "AC9S9U02", name: "Energy Transfer", description: "Describe energy conservation and transformation; calculate efficiency", keyTerms: ["conservation", "transformation", "efficiency"] },
          ] },
          { id: "scichem9", name: "Chemistry", description: "Atomic structure, bonding and reactions", topics: [
            { id: "AC9S9C01", name: "Atomic Structure", description: "Describe the structure of atoms; protons, neutrons and electrons", keyTerms: ["atom", "proton", "neutron", "electron"] },
            { id: "AC9S9C02", name: "Chemical Bonding", description: "Explain how atoms bond to form molecules and ionic compounds", keyTerms: ["ionic", "covalent", "bond"] },
            { id: "AC9S9C03", name: "Chemical Reactions", description: "Write balanced chemical equations; describe factors affecting rate", keyTerms: ["equation", "rate", "catalyst"] },
          ] },
          { id: "scibio9", name: "Biology", description: "DNA, inheritance and evolution", topics: [
            { id: "AC9S9B01", name: "DNA and Inheritance", description: "Explain DNA structure and its role in inheritance", keyTerms: ["DNA", "gene", "allele", "Punnett"] },
            { id: "AC9S9B02", name: "Evolution", description: "Explain the theory of evolution by natural selection", keyTerms: ["evolution", "natural selection", "adaptation"] },
          ] },
          { id: "sciearth9", name: "Earth Science", description: "Climate science", topics: [
            { id: "AC9S9E01", name: "Climate Science", description: "Explain the greenhouse effect and human impacts on climate", keyTerms: ["greenhouse", "climate", "carbon cycle"] },
          ] },
        ],
      },
      {
        grade: 10, strands: [
          { id: "sciphys10", name: "Physics", description: "Waves, fields and relativity", topics: [
            { id: "AC9S10U01", name: "Waves and Fields", description: "Describe the wave nature of light, sound and EM radiation; explain fields", keyTerms: ["wave", "EM spectrum", "field"] },
            { id: "AC9S10U02", name: "Electric and Magnetic Fields", description: "Explain how currents produce magnetic fields; motors and generators", keyTerms: ["electromagnetism", "motor", "generator"] },
            { id: "AC9S10U03", name: "Special Relativity", description: "Describe time dilation and length contraction at speeds approaching light", keyTerms: ["relativity", "time dilation", "Lorentz"] },
          ] },
          { id: "scichem10", name: "Chemistry", description: "Atomic theory, equilibrium and organic chemistry", topics: [
            { id: "AC9S10C01", name: "Atomic Theory", description: "Explain the development of atomic theory; quantum mechanical model", keyTerms: ["Bohr", "quantum", "electron config"] },
            { id: "AC9S10C02", name: "Chemical Equilibrium", description: "Explain chemical equilibrium and calculate equilibrium constants", keyTerms: ["equilibrium", "Le Chatelier", "K"] },
            { id: "AC9S10C03", name: "Organic Chemistry", description: "Describe the structure and naming of organic compounds", keyTerms: ["organic", "alkane", "alkene", "functional group"] },
          ] },
          { id: "scibio10", name: "Biology", description: "Homeostasis, immune system and biotechnology", topics: [
            { id: "AC9S10B01", name: "Homeostasis", description: "Explain how the body maintains homeostasis through feedback mechanisms", keyTerms: ["homeostasis", "feedback", "thermoregulation"] },
            { id: "AC9S10B02", name: "Immune System", description: "Describe the immune system and how vaccinations provide immunity", keyTerms: ["immune", "vaccine", "antibody"] },
            { id: "AC9S10B03", name: "Biotechnology", description: "Describe applications of DNA technology, including genetic engineering", keyTerms: ["PCR", "genetic engineering", "sequencing"] },
          ] },
          { id: "sciearth10", name: "Earth Science", description: "Big Bang and Earth systems", topics: [
            { id: "AC9S10E01", name: "Cosmology", description: "Describe evidence for the Big Bang and stellar nucleosynthesis", keyTerms: ["Big Bang", "nucleosynthesis", "universe"] },
            { id: "AC9S10E02", name: "Earth Systems", description: "Describe Earth's spheres and the water, carbon and nitrogen cycles", keyTerms: ["biosphere", "hydrosphere", "atmosphere"] },
          ] },
        ],
      },
    ],
  },
  {
    id: "digital-tech",
    name: "Digital Technologies",
    color: "#f59e0b",
    icon: "laptop",
    grades: [
      { grade: 7, strands: [
        { id: "data7", name: "Data and Information", description: "Data representation and analysis", topics: [
          { id: "AC9TDI7D01", name: "Data Representation", description: "Explain how digital systems represent data using binary", keyTerms: ["binary", "ASCII", "encoding"] },
          { id: "AC9TDI7D02", name: "Data Analysis", description: "Collect, clean and visualise data to identify patterns", keyTerms: ["analyse", "visualise", "spreadsheet"] },
        ] },
        { id: "code7", name: "Creating Digital Solutions", description: "Algorithms and programming", topics: [
          { id: "AC9TDI7K01", name: "Algorithms", description: "Design and trace algorithms using pseudocode and flowcharts", keyTerms: ["algorithm", "pseudocode", "flowchart"] },
          { id: "AC9TDI7K02", name: "Programming", description: "Implement and modify programs with input, output and control structures", keyTerms: ["program", "input", "output", "loop"] },
        ] },
      ] },
      { grade: 8, strands: [
        { id: "data8", name: "Data and Information", description: "Data security and systems", topics: [
          { id: "AC9TDI8D01", name: "Data Security", description: "Explain how data is transmitted and secured in networks", keyTerms: ["security", "encryption", "cybersecurity"] },
          { id: "AC9TDI8D02", name: "Data Systems", description: "Explain the relationship between data, information and knowledge", keyTerms: ["data", "information", "knowledge"] },
        ] },
        { id: "code8", name: "Creating Digital Solutions", description: "Advanced algorithms and OOP", topics: [
          { id: "AC9TDI8K01", name: "Advanced Algorithms", description: "Design and implement algorithms with nested iteration", keyTerms: ["nested", "iteration", "debug"] },
          { id: "AC9TDI8K02", name: "Object-Oriented Programming", description: "Describe the relationship between objects and classes", keyTerms: ["class", "object", "encapsulation"] },
        ] },
      ] },
      { grade: 9, strands: [
        { id: "data9", name: "Data and Information", description: "Data analysis and privacy", topics: [
          { id: "AC9TDI9D01", name: "Data Analysis", description: "Analyse data using big data concepts", keyTerms: ["big data", "analytics", "trend"] },
          { id: "AC9TDI9D02", name: "Data Privacy", description: "Explain privacy and security requirements for data", keyTerms: ["privacy", "ethics", "compliance"] },
        ] },
        { id: "code9", name: "Creating Digital Solutions", description: "Software development", topics: [
          { id: "AC9TDI9K01", name: "Software Development", description: "Design and develop solutions using appropriate data structures", keyTerms: ["SDLC", "version control", "data structure"] },
          { id: "AC9TDI9K02", name: "Interactive Solutions", description: "Create interactive solutions incorporating UX principles", keyTerms: ["UX", "interactive", "test"] },
        ] },
      ] },
      { grade: 10, strands: [
        { id: "data10", name: "Data and Information", description: "Databases and analytics", topics: [
          { id: "AC9TDI10D01", name: "Database Systems", description: "Design and implement relational databases using SQL", keyTerms: ["SQL", "database", "normalisation"] },
          { id: "AC9TDI10D02", name: "Data Analytics", description: "Apply data analytics techniques including machine learning", keyTerms: ["machine learning", "analytics", "visualisation"] },
        ] },
        { id: "code10", name: "Creating Digital Solutions", description: "Systems development and emerging tech", topics: [
          { id: "AC9TDI10K01", name: "Systems Development", description: "Design and develop comprehensive digital solutions", keyTerms: ["engineering", "documentation", "testing"] },
          { id: "AC9TDI10K02", name: "Emerging Technologies", description: "Investigate emerging digital technologies", keyTerms: ["AI", "IoT", "automation"] },
        ] },
      ] },
    ],
  },
  {
    id: "physics",
    name: "Physics",
    color: "#3b82f6",
    icon: "atom",
    grades: [
      {
        grade: 11, strands: [
          { id: "kin11", name: "Kinematics", description: "Motion in one and two dimensions", topics: [
            { id: "AC-P11-K01", name: "Motion in One Dimension", description: "Describe and analyse motion using equations of motion and graphs", keyTerms: ["displacement", "velocity", "acceleration"] },
            { id: "AC-P11-K02", name: "Motion in Two Dimensions", description: "Describe and analyse projectile and circular motion", keyTerms: ["projectile", "circular", "trajectory"] },
          ] },
          { id: "dyn11", name: "Dynamics", description: "Newton's laws and momentum", topics: [
            { id: "AC-P11-D01", name: "Newton's Laws", description: "Apply Newton's laws including friction and inclined planes", keyTerms: ["friction", "incline", "free body"] },
            { id: "AC-P11-D02", name: "Momentum", description: "Describe and apply concepts of momentum, impulse and conservation", keyTerms: ["momentum", "impulse", "collision"] },
          ] },
          { id: "energy11", name: "Energy and Work", description: "Work, energy and power", topics: [
            { id: "AC-P11-E01", name: "Work and Energy", description: "Describe and calculate work, kinetic energy and potential energy", keyTerms: ["work", "kinetic", "potential"] },
            { id: "AC-P11-E02", name: "Power", description: "Describe and calculate power", keyTerms: ["power", "rate", "watt"] },
          ] },
          { id: "wave11", name: "Waves", description: "Wave properties and sound", topics: [
            { id: "AC-P11-W01", name: "Wave Properties", description: "Describe and analyse wave properties", keyTerms: ["wavelength", "frequency", "amplitude"] },
            { id: "AC-P11-W02", name: "Sound", description: "Describe and analyse sound waves", keyTerms: ["sound", "Doppler", "pitch"] },
          ] },
          { id: "elec11", name: "Electric Fields", description: "Electric force and potential", topics: [
            { id: "AC-P11-EF01", name: "Electric Force", description: "Describe and calculate electric force and field strength", keyTerms: ["Coulomb", "field", "charge"] },
            { id: "AC-P11-EF02", name: "Electric Potential", description: "Describe and calculate electric potential and potential difference", keyTerms: ["potential", "voltage", "energy"] },
          ] },
        ],
      },
      {
        grade: 12, strands: [
          { id: "fields12", name: "Gravitational and Electric Fields", description: "Advanced field theory", topics: [
            { id: "AC-P12-G01", name: "Gravitational Fields", description: "Describe and analyse gravitational fields", keyTerms: ["gravity", "field", "potential"] },
            { id: "AC-P12-G02", name: "Electric Fields", description: "Describe and analyse electric fields in detail", keyTerms: ["electric field", "energy", "pattern"] },
          ] },
          { id: "em12", name: "Electromagnetism", description: "Magnetism, induction and applications", topics: [
            { id: "AC-P12-EM01", name: "Magnetic Fields", description: "Describe magnetic fields and the motor effect", keyTerms: ["magnetic", "motor", "force"] },
            { id: "AC-P12-EM02", name: "Electromagnetic Induction", description: "Describe electromagnetic induction, Faraday's law and Lenz's law", keyTerms: ["induction", "Faraday", "Lenz"] },
            { id: "AC-P12-EM03", name: "Applications", description: "Analyse generators, transformers and induced EMF", keyTerms: ["generator", "transformer", "EMF"] },
          ] },
          { id: "quantum12", name: "Quantum Physics", description: "Wave-particle duality, photoelectric effect and atomic models", topics: [
            { id: "AC-P12-Q01", name: "Wave-Particle Duality", description: "Explain wave-particle duality", keyTerms: ["duality", "photon", "de Broglie"] },
            { id: "AC-P12-Q02", name: "Photoelectric Effect", description: "Describe the photoelectric effect", keyTerms: ["photoelectric", "work function", "threshold"] },
            { id: "AC-P12-Q03", name: "Atomic Models", description: "Describe the Bohr model and atomic energy levels", keyTerms: ["Bohr", "energy level", "spectral"] },
          ] },
          { id: "rel12", name: "Special Relativity", description: "Relativity postulates and effects", topics: [
            { id: "AC-P12-SR01", name: "Relativity Postulates", description: "Explain the postulates of special relativity", keyTerms: ["Einstein", "inertial", "light speed"] },
            { id: "AC-P12-SR02", name: "Relativistic Effects", description: "Calculate time dilation and length contraction", keyTerms: ["time dilation", "length contraction", "gamma"] },
            { id: "AC-P12-SR03", name: "Mass-Energy Equivalence", description: "Describe and apply E = mc²", keyTerms: ["E=mc²", "mass defect", "nuclear"] },
          ] },
          { id: "nuc12", name: "Nuclear Physics", description: "Nuclear structure, radioactivity and reactions", topics: [
            { id: "AC-P12-N01", name: "Nuclear Structure", description: "Describe nuclear structure and binding energy", keyTerms: ["nucleus", "binding energy", "stability"] },
            { id: "AC-P12-N02", name: "Radioactivity", description: "Describe alpha, beta and gamma decay", keyTerms: ["alpha", "beta", "gamma", "half-life"] },
            { id: "AC-P12-N03", name: "Nuclear Reactions", description: "Describe nuclear fission and fusion", keyTerms: ["fission", "fusion", "nucleosynthesis"] },
          ] },
        ],
      },
    ],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    color: "#10b981",
    icon: "flask-round-bottom",
    grades: [
      { grade: 11, strands: [
        { id: "atomic11", name: "Atomic Structure", description: "Quantum theory and periodicity", topics: [
          { id: "AC-C11-AS01", name: "Quantum Theory", description: "Explain quantum theory and electron configuration", keyTerms: ["orbital", "quantum number", "electron config"] },
          { id: "AC-C11-AS02", name: "Periodicity", description: "Analyse periodic trends", keyTerms: ["periodic trend", "ionisation energy", "radius"] },
        ] },
        { id: "bond11", name: "Chemical Bonding", description: "Ionic, covalent and intermolecular forces", topics: [
          { id: "AC-C11-BS01", name: "Ionic and Covalent", description: "Explain ionic and covalent bonding", keyTerms: ["ionic", "covalent", "electronegativity"] },
          { id: "AC-C11-BS02", name: "Intermolecular Forces", description: "Describe intermolecular forces", keyTerms: ["van der Waals", "hydrogen bond", "dipole"] },
        ] },
        { id: "stoi11", name: "Stoichiometry", description: "Mole concept and equations", topics: [
          { id: "AC-C11-ST01", name: "Mole Concept", description: "Explain the mole concept", keyTerms: ["mole", "Avogadro", "molar mass"] },
          { id: "AC-C11-ST02", name: "Chemical Equations", description: "Write and balance chemical equations", keyTerms: ["balance", "limiting reagent", "yield"] },
        ] },
        { id: "rxn11", name: "Reactions", description: "Types of reactions and redox", topics: [
          { id: "AC-C11-RX01", name: "Types of Reactions", description: "Describe types of chemical reactions", keyTerms: ["synthesis", "decomposition", "redox"] },
          { id: "AC-C11-RX02", name: "Oxidation and Reduction", description: "Explain oxidation and reduction", keyTerms: ["oxidation", "reduction", "half-equation"] },
        ] },
        { id: "energy11c", name: "Energy Changes", description: "Enthalpy and reaction rates", topics: [
          { id: "AC-C11-EC01", name: "Enthalpy", description: "Describe and calculate enthalpy changes", keyTerms: ["enthalpy", "Hess's law", "exothermic"] },
          { id: "AC-C11-EC02", name: "Reaction Rates", description: "Explain factors affecting reaction rates", keyTerms: ["rate", "collision theory", "activation energy"] },
        ] },
      ] },
      { grade: 12, strands: [
        { id: "equil12", name: "Equilibrium", description: "Chemical equilibrium and acids/bases", topics: [
          { id: "AC-C12-EQ01", name: "Chemical Equilibrium", description: "Explain chemical equilibrium", keyTerms: ["equilibrium", "K", "Le Chatelier"] },
          { id: "AC-C12-EQ02", name: "Acids and Bases", description: "Describe acid-base theories", keyTerms: ["pH", "buffer", "titration"] },
        ] },
        { id: "org12", name: "Organic Chemistry", description: "Organic compounds and reactions", topics: [
          { id: "AC-C12-OC01", name: "Organic Compounds", description: "Describe organic compounds", keyTerms: ["functional group", "isomer", "IUPAC"] },
          { id: "AC-C12-OC02", name: "Organic Reactions", description: "Describe reactions of organic compounds", keyTerms: ["mechanism", "substitution", "addition"] },
        ] },
        { id: "elec12", name: "Electrochemistry", description: "Galvanic and electrolytic cells", topics: [
          { id: "AC-C12-EL01", name: "Galvanic Cells", description: "Explain galvanic cells", keyTerms: ["cell potential", "E°", "Nernst"] },
          { id: "AC-C12-EL02", name: "Electrolytic Cells", description: "Explain electrolytic cells", keyTerms: ["electrolysis", "Faraday", "industrial"] },
        ] },
        { id: "anal12", name: "Chemical Analysis", description: "Qualitative and quantitative analysis", topics: [
          { id: "AC-C12-CA01", name: "Qualitative Analysis", description: "Describe qualitative analysis", keyTerms: ["cation", "anion", "flame test"] },
          { id: "AC-C12-CA02", name: "Quantitative Analysis", description: "Describe quantitative analysis", keyTerms: ["titration", "concentration", "spectroscopy"] },
        ] },
      ] },
    ],
  },
  {
    id: "biology",
    name: "Biology",
    color: "#84cc16",
    icon: "dna",
    grades: [
      { grade: 11, strands: [
        { id: "cell11", name: "Cells", description: "Cell structure and membrane transport", topics: [
          { id: "AC-B11-CE01", name: "Cell Structure", description: "Describe cell structure and function", keyTerms: ["organelle", "membrane", "specialisation"] },
          { id: "AC-B11-CE02", name: "Exchange of Materials", description: "Explain exchange of materials across membranes", keyTerms: ["diffusion", "osmosis", "active transport"] },
        ] },
        { id: "energy11b", name: "Energy", description: "Photosynthesis and cellular respiration", topics: [
          { id: "AC-B11-EL01", name: "Photosynthesis", description: "Describe photosynthesis", keyTerms: ["light reactions", "Calvin cycle", "chloroplast"] },
          { id: "AC-B11-EL02", name: "Cellular Respiration", description: "Describe cellular respiration", keyTerms: ["aerobic", "anaerobic", "ATP"] },
        ] },
        { id: "homeo11", name: "Homeostasis", description: "Homeostatic principles and control systems", topics: [
          { id: "AC-B11-HS01", name: "Homeostatic Principles", description: "Explain the principles of homeostasis", keyTerms: ["feedback", "negative", "positive"] },
          { id: "AC-B11-HS02", name: "Control Systems", description: "Describe the nervous and endocrine systems", keyTerms: ["nerve", "hormone", "synapse"] },
        ] },
        { id: "div11", name: "Diversity", description: "Classification and biodiversity", topics: [
          { id: "AC-B11-DC01", name: "Classification", description: "Describe biological classification", keyTerms: ["taxonomy", "phylogeny", "cladogram"] },
          { id: "AC-B11-DC02", name: "Biodiversity", description: "Explain biodiversity", keyTerms: ["species richness", "conservation", "diversity"] },
        ] },
      ] },
      { grade: 12, strands: [
        { id: "gen12", name: "Genetics", description: "DNA, inheritance and gene technologies", topics: [
          { id: "AC-B12-GN01", name: "DNA and Gene Expression", description: "Describe DNA structure and gene expression", keyTerms: ["replication", "transcription", "translation"] },
          { id: "AC-B12-GN02", name: "Inheritance", description: "Explain patterns of inheritance", keyTerms: ["Mendel", "linkage", "polygenic"] },
          { id: "AC-B12-GN03", name: "Gene Technologies", description: "Describe DNA technologies", keyTerms: ["PCR", "cloning", "CRISPR"] },
        ] },
        { id: "evol12", name: "Evolution", description: "Mechanisms and evidence", topics: [
          { id: "AC-B12-EV01", name: "Mechanisms of Evolution", description: "Explain mechanisms of evolution", keyTerms: ["natural selection", "genetic drift", "speciation"] },
          { id: "AC-B12-EV02", name: "Evidence for Evolution", description: "Describe evidence for evolution", keyTerms: ["fossil", "homology", "molecular"] },
        ] },
        { id: "eco12", name: "Ecology", description: "Ecosystems, populations and conservation", topics: [
          { id: "AC-B12-EC01", name: "Ecosystem Dynamics", description: "Describe ecosystem dynamics", keyTerms: ["energy flow", "nutrient cycle", "productivity"] },
          { id: "AC-B12-EC02", name: "Population Ecology", description: "Explain population dynamics", keyTerms: ["carrying capacity", "growth", "limiting factor"] },
          { id: "AC-B12-EC03", name: "Conservation", description: "Describe conservation biology", keyTerms: ["conservation", "habitat", "biodiversity"] },
        ] },
      ] },
    ],
  },
  {
    id: "history",
    name: "History",
    color: "#a855f7",
    icon: "book-open-page-variant",
    grades: [
      { grade: 11, strands: [
        { id: "modhist11", name: "Modern History", description: "World War I and interwar period", topics: [
          { id: "AC-HI11-01", name: "World War I", description: "Analyse World War I", keyTerms: ["WWI", "treaty", "alliance"] },
          { id: "AC-HI11-02", name: "Interwar Period", description: "Describe the interwar period", keyTerms: ["Depression", "totalitarianism", "appeasement"] },
        ] },
      ] },
      { grade: 12, strands: [
        { id: "modhist12", name: "Modern History", description: "World War II, Cold War and social movements", topics: [
          { id: "AC-HI12-01", name: "World War II", description: "Analyse World War II", keyTerms: ["WWII", "Holocaust", "post-war"] },
          { id: "AC-HI12-02", name: "The Cold War", description: "Describe the Cold War era", keyTerms: ["Cold War", "nuclear", "USSR"] },
          { id: "AC-HI12-03", name: "Movements and Change", description: "Analyse social movements", keyTerms: ["civil rights", "feminism", "environment"] },
        ] },
      ] },
    ],
  },
  {
    id: "geography",
    name: "Geography",
    color: "#14b8a6",
    icon: "earth",
    grades: [
      { grade: 11, strands: [
        { id: "biophys11", name: "Biophysical", description: "Earth's surface, climate and ecosystems", topics: [
          { id: "AC-GE11-01", name: "Earth's Surface", description: "Analyse physical processes shaping Earth's surface", keyTerms: ["weathering", "erosion", "tectonic"] },
          { id: "AC-GE11-02", name: "Climate and Weather", description: "Analyse climate and weather systems", keyTerms: ["atmosphere", "current", "climate"] },
          { id: "AC-GE11-03", name: "Ecosystems", description: "Analyse ecosystem dynamics", keyTerms: ["energy flow", "succession", "nutrient"] },
        ] },
        { id: "human11", name: "Human", description: "Population and urbanisation", topics: [
          { id: "AC-GE11-04", name: "Population", description: "Analyse population distribution and growth", keyTerms: ["demographic transition", "migration", "population"] },
          { id: "AC-GE11-05", name: "Urbanisation", description: "Analyse urbanisation patterns", keyTerms: ["urban", "megacity", "growth"] },
        ] },
      ] },
      { grade: 12, strands: [
        { id: "sust12", name: "Sustainability", description: "Environmental challenges and solutions", topics: [
          { id: "AC-GE12-01", name: "Environmental Challenges", description: "Analyse global environmental challenges", keyTerms: ["climate change", "biodiversity loss", "resource"] },
          { id: "AC-GE12-02", name: "Sustainable Solutions", description: "Evaluate sustainable solutions", keyTerms: ["policy", "sustainable", "global"] },
        ] },
        { id: "inter12", name: "Interconnection", description: "Global networks", topics: [
          { id: "AC-GE12-03", name: "Global Networks", description: "Analyse global networks", keyTerms: ["trade", "globalisation", "interconnection"] },
        ] },
      ] },
    ],
  },
  {
    id: "economics",
    name: "Economics",
    color: "#0ea5e9",
    icon: "chart-line",
    grades: [
      { grade: 11, strands: [
        { id: "intro11", name: "Introduction", description: "Fundamental concepts and models", topics: [
          { id: "AC-EC11-01", name: "Fundamental Concepts", description: "Explain fundamental economic concepts", keyTerms: ["scarcity", "opportunity cost", "allocation"] },
          { id: "AC-EC11-02", name: "Economic Models", description: "Describe economic models", keyTerms: ["PPF", "efficiency", "trade-off"] },
        ] },
        { id: "micro11", name: "Microeconomics", description: "Demand, supply and market structures", topics: [
          { id: "AC-EC11-03", name: "Demand and Supply", description: "Explain demand and supply", keyTerms: ["demand", "supply", "elasticity"] },
          { id: "AC-EC11-04", name: "Market Structures", description: "Describe different market structures", keyTerms: ["competition", "monopoly", "oligopoly"] },
        ] },
        { id: "macro11", name: "Macroeconomics", description: "Macroeconomic concepts and AD/AS", topics: [
          { id: "AC-EC11-05", name: "Macroeconomic Concepts", description: "Describe macroeconomic indicators", keyTerms: ["GDP", "unemployment", "inflation"] },
          { id: "AC-EC11-06", name: "Aggregate Demand and Supply", description: "Explain aggregate demand and supply", keyTerms: ["AD", "AS", "equilibrium"] },
        ] },
      ] },
      { grade: 12, strands: [
        { id: "micro12", name: "Microeconomics", description: "Theory of the firm and labour markets", topics: [
          { id: "AC-EC12-01", name: "Theory of the Firm", description: "Explain the theory of the firm", keyTerms: ["production", "cost", "profit"] },
          { id: "AC-EC12-02", name: "Labour Markets", description: "Describe labour markets", keyTerms: ["wage", "labour", "employment"] },
        ] },
        { id: "macro12", name: "Macroeconomics", description: "Economic performance and policy", topics: [
          { id: "AC-EC12-03", name: "Economic Performance", description: "Analyse economic performance", keyTerms: ["growth", "fluctuation", "indicator"] },
          { id: "AC-EC12-04", name: "Fiscal Policy", description: "Explain fiscal policy", keyTerms: ["budget", "tax", "spending"] },
          { id: "AC-EC12-05", name: "Monetary Policy", description: "Explain monetary policy", keyTerms: ["interest rate", "money supply", "RBA"] },
        ] },
        { id: "int12", name: "International", description: "Trade and exchange rates", topics: [
          { id: "AC-EC12-06", name: "International Trade", description: "Explain international trade", keyTerms: ["comparative advantage", "tariff", "WTO"] },
          { id: "AC-EC12-07", name: "Exchange Rates", description: "Explain exchange rates", keyTerms: ["exchange rate", "BoP", "currency"] },
        ] },
      ] },
    ],
  },
  {
    id: "business",
    name: "Business",
    color: "#64748b",
    icon: "briefcase",
    grades: [
      { grade: 11, strands: [
        { id: "fund11", name: "Fundamentals", description: "Nature of business and types", topics: [
          { id: "AC-BU11-01", name: "Nature of Business", description: "Explain the nature and purpose of business", keyTerms: ["objective", "stakeholder", "economy"] },
          { id: "AC-BU11-02", name: "Business Types", description: "Compare different business structures", keyTerms: ["sole trader", "partnership", "company"] },
        ] },
        { id: "plan11", name: "Planning", description: "Business plans and market research", topics: [
          { id: "AC-BU11-03", name: "Business Plan Components", description: "Describe components of a business plan", keyTerms: ["executive summary", "projection", "analysis"] },
          { id: "AC-BU11-04", name: "Market Research", description: "Explain the importance of market research", keyTerms: ["research", "data", "survey"] },
        ] },
        { id: "mkt11", name: "Marketing", description: "Marketing fundamentals and consumer behaviour", topics: [
          { id: "AC-BU11-05", name: "Marketing Fundamentals", description: "Explain the marketing process", keyTerms: ["segmentation", "4Ps", "positioning"] },
          { id: "AC-BU11-06", name: "Consumer Behaviour", description: "Describe factors influencing consumer behaviour", keyTerms: ["buying motive", "decision", "trend"] },
        ] },
        { id: "fin11", name: "Finance", description: "Financial records and analysis", topics: [
          { id: "AC-BU11-07", name: "Financial Records", description: "Explain financial records and basic statements", keyTerms: ["income statement", "balance sheet", "cash flow"] },
          { id: "AC-BU11-08", name: "Financial Analysis", description: "Analyse financial performance using key ratios", keyTerms: ["profitability", "liquidity", "efficiency"] },
        ] },
      ] },
      { grade: 12, strands: [
        { id: "ops12", name: "Operations", description: "Operations management", topics: [
          { id: "AC-BU12-01", name: "Operations Management", description: "Explain operations management", keyTerms: ["production", "quality", "inventory"] },
        ] },
        { id: "fin12", name: "Finance", description: "Financial and risk management", topics: [
          { id: "AC-BU12-02", name: "Financial Management", description: "Explain financial management", keyTerms: ["financing", "investment", "budgeting"] },
          { id: "AC-BU12-03", name: "Risk Management", description: "Explain business risk and risk management strategies", keyTerms: ["risk", "insurance", "hedging"] },
        ] },
        { id: "strat12", name: "Strategy", description: "Strategic management and growth", topics: [
          { id: "AC-BU12-04", name: "Strategic Management", description: "Explain strategic management", keyTerms: ["competitive", "strategy", "implementation"] },
          { id: "AC-BU12-05", name: "Growth Strategies", description: "Describe strategies for business growth", keyTerms: ["organic", "merger", "acquisition"] },
        ] },
        { id: "hr12", name: "Human Resources", description: "Workforce planning and industrial relations", topics: [
          { id: "AC-BU12-06", name: "Workforce Planning", description: "Explain human resource management", keyTerms: ["recruitment", "training", "performance"] },
          { id: "AC-BU12-07", name: "Industrial Relations", description: "Explain workplace relations", keyTerms: ["legislation", "rights", "dispute"] },
        ] },
      ] },
    ],
  },
];
