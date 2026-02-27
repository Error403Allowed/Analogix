/**
 * Formula sheets for Australian high school subjects.
 * Each sheet contains formulas relevant to the given subject,
 * optionally filtered by state syllabus where they differ significantly.
 */

export interface Formula {
  name: string;
  latex: string;          // LaTeX string for rendering
  description: string;
  topic: string;
}

export interface FormulaSheet {
  subjectId: string;
  label: string;
  formulas: Formula[];
}

const FORMULA_SHEETS: FormulaSheet[] = [
  {
    subjectId: "math",
    label: "Mathematics",
    formulas: [
      { topic: "Algebra", name: "Quadratic Formula", latex: "x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", description: "Solves ax² + bx + c = 0" },
      { topic: "Algebra", name: "Difference of Two Squares", latex: "a^2 - b^2 = (a+b)(a-b)", description: "Factorising shortcut" },
      { topic: "Calculus", name: "Power Rule (Differentiation)", latex: "\\dfrac{d}{dx}[x^n] = nx^{n-1}", description: "Derivative of a power function" },
      { topic: "Calculus", name: "Power Rule (Integration)", latex: "\\int x^n \\, dx = \\dfrac{x^{n+1}}{n+1} + C", description: "Antiderivative of a power function" },
      { topic: "Calculus", name: "Chain Rule", latex: "\\dfrac{dy}{dx} = \\dfrac{dy}{du} \\cdot \\dfrac{du}{dx}", description: "Derivative of composite functions" },
      { topic: "Trigonometry", name: "Sine Rule", latex: "\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C}", description: "Relates sides and angles of any triangle" },
      { topic: "Trigonometry", name: "Cosine Rule", latex: "c^2 = a^2 + b^2 - 2ab\\cos C", description: "Generalisation of Pythagoras" },
      { topic: "Trigonometry", name: "Area of a Triangle", latex: "A = \\dfrac{1}{2}ab\\sin C", description: "When two sides and included angle are known" },
      { topic: "Trigonometry", name: "Pythagorean Identity", latex: "\\sin^2\\theta + \\cos^2\\theta = 1", description: "Fundamental trig identity" },
      { topic: "Statistics", name: "Mean", latex: "\\bar{x} = \\dfrac{\\sum x_i}{n}", description: "Average of a data set" },
      { topic: "Statistics", name: "Standard Deviation", latex: "s = \\sqrt{\\dfrac{\\sum(x_i - \\bar{x})^2}{n-1}}", description: "Spread of data around the mean" },
      { topic: "Statistics", name: "z-score", latex: "z = \\dfrac{x - \\mu}{\\sigma}", description: "Standardised value" },
      { topic: "Sequences", name: "Arithmetic Sequence (nth term)", latex: "T_n = a + (n-1)d", description: "a = first term, d = common difference" },
      { topic: "Sequences", name: "Geometric Sequence (nth term)", latex: "T_n = ar^{n-1}", description: "a = first term, r = common ratio" },
      { topic: "Sequences", name: "Sum of Arithmetic Series", latex: "S_n = \\dfrac{n}{2}(2a + (n-1)d)", description: "Sum of first n terms" },
      { topic: "Sequences", name: "Sum of Geometric Series", latex: "S_n = \\dfrac{a(1 - r^n)}{1 - r}", description: "Sum of first n terms (r ≠ 1)" },
      { topic: "Finance", name: "Compound Interest", latex: "A = P\\left(1 + \\dfrac{r}{n}\\right)^{nt}", description: "A = final amount, P = principal, r = annual rate" },
    ],
  },
  {
    subjectId: "physics",
    label: "Physics",
    formulas: [
      { topic: "Mechanics", name: "Newton's Second Law", latex: "F = ma", description: "Net force equals mass times acceleration" },
      { topic: "Mechanics", name: "Work", latex: "W = Fs\\cos\\theta", description: "Force times displacement times cosine of angle" },
      { topic: "Mechanics", name: "Kinetic Energy", latex: "E_k = \\dfrac{1}{2}mv^2", description: "Energy of motion" },
      { topic: "Mechanics", name: "Gravitational Potential Energy", latex: "E_p = mgh", description: "Energy due to height in a gravitational field" },
      { topic: "Mechanics", name: "Power", latex: "P = \\dfrac{W}{t} = Fv", description: "Rate of energy transfer" },
      { topic: "Kinematics", name: "SUVAT — v = u + at", latex: "v = u + at", description: "Final velocity with constant acceleration" },
      { topic: "Kinematics", name: "SUVAT — s = ut + ½at²", latex: "s = ut + \\dfrac{1}{2}at^2", description: "Displacement with constant acceleration" },
      { topic: "Kinematics", name: "SUVAT — v² = u² + 2as", latex: "v^2 = u^2 + 2as", description: "Velocity-displacement relation" },
      { topic: "Waves", name: "Wave Speed", latex: "v = f\\lambda", description: "Speed equals frequency times wavelength" },
      { topic: "Waves", name: "Period and Frequency", latex: "T = \\dfrac{1}{f}", description: "Period is the reciprocal of frequency" },
      { topic: "Electricity", name: "Ohm's Law", latex: "V = IR", description: "Voltage equals current times resistance" },
      { topic: "Electricity", name: "Electric Power", latex: "P = VI = I^2R = \\dfrac{V^2}{R}", description: "Power dissipated in a circuit" },
      { topic: "Electricity", name: "Charge", latex: "Q = It", description: "Charge equals current times time" },
      { topic: "Gravity", name: "Universal Gravitation", latex: "F = \\dfrac{Gm_1m_2}{r^2}", description: "Gravitational force between two masses" },
      { topic: "Gravity", name: "Gravitational Field Strength", latex: "g = \\dfrac{GM}{r^2}", description: "Field strength at distance r from mass M" },
      { topic: "Thermodynamics", name: "Specific Heat Capacity", latex: "Q = mc\\Delta T", description: "Heat energy = mass × specific heat × temp change" },
    ],
  },
  {
    subjectId: "chemistry",
    label: "Chemistry",
    formulas: [
      { topic: "Stoichiometry", name: "Moles", latex: "n = \\dfrac{m}{M}", description: "n = moles, m = mass (g), M = molar mass (g/mol)" },
      { topic: "Stoichiometry", name: "Concentration", latex: "c = \\dfrac{n}{V}", description: "c = concentration (mol/L), V = volume (L)" },
      { topic: "Stoichiometry", name: "Moles from volume (gas)", latex: "n = \\dfrac{PV}{RT}", description: "Ideal gas law" },
      { topic: "Acids & Bases", name: "pH", latex: "\\text{pH} = -\\log_{10}[\\text{H}^+]", description: "Measure of acidity" },
      { topic: "Acids & Bases", name: "pOH", latex: "\\text{pOH} = -\\log_{10}[\\text{OH}^-]", description: "Measure of basicity" },
      { topic: "Acids & Bases", name: "pH + pOH", latex: "\\text{pH} + \\text{pOH} = 14", description: "At 25°C in water" },
      { topic: "Thermochemistry", name: "Enthalpy Change", latex: "\\Delta H = H_{\\text{products}} - H_{\\text{reactants}}", description: "Heat of reaction" },
      { topic: "Thermochemistry", name: "Heat of Reaction", latex: "q = mc\\Delta T", description: "Heat transfer in calorimetry" },
      { topic: "Equilibrium", name: "Equilibrium Constant", latex: "K_{eq} = \\dfrac{[\\text{products}]^x}{[\\text{reactants}]^y}", description: "Ratio of product to reactant concentrations at equilibrium" },
      { topic: "Electrochemistry", name: "Faraday's Law", latex: "m = \\dfrac{ItM}{nF}", description: "Mass deposited in electrolysis. F = 96,485 C/mol" },
    ],
  },
  {
    subjectId: "biology",
    label: "Biology",
    formulas: [
      { topic: "Genetics", name: "Hardy-Weinberg Equilibrium", latex: "p^2 + 2pq + q^2 = 1", description: "Allele frequency in a stable population" },
      { topic: "Ecology", name: "Population Growth (Exponential)", latex: "\\dfrac{dN}{dt} = rN", description: "r = growth rate, N = population size" },
      { topic: "Ecology", name: "Population Growth (Logistic)", latex: "\\dfrac{dN}{dt} = rN\\left(\\dfrac{K-N}{K}\\right)", description: "K = carrying capacity" },
      { topic: "Photosynthesis", name: "Overall Equation", latex: "6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{light}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2", description: "Net photosynthesis reaction" },
      { topic: "Respiration", name: "Aerobic Respiration", latex: "\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\rightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{ATP}", description: "Complete glucose oxidation" },
    ],
  },
  {
    subjectId: "economics",
    label: "Economics",
    formulas: [
      { topic: "Macroeconomics", name: "GDP (Expenditure Approach)", latex: "\\text{GDP} = C + I + G + (X - M)", description: "C=consumption, I=investment, G=government, X-M=net exports" },
      { topic: "Macroeconomics", name: "Inflation (CPI)", latex: "\\text{CPI} = \\dfrac{\\text{Cost of basket (current year)}}{\\text{Cost of basket (base year)}} \\times 100", description: "Consumer Price Index" },
      { topic: "Macroeconomics", name: "Unemployment Rate", latex: "U = \\dfrac{\\text{Unemployed}}{\\text{Labour force}} \\times 100", description: "Percentage of labour force without work" },
      { topic: "Microeconomics", name: "Price Elasticity of Demand", latex: "\\text{PED} = \\dfrac{\\%\\Delta Q_d}{\\%\\Delta P}", description: "Responsiveness of demand to price change" },
      { topic: "Microeconomics", name: "Price Elasticity of Supply", latex: "\\text{PES} = \\dfrac{\\%\\Delta Q_s}{\\%\\Delta P}", description: "Responsiveness of supply to price change" },
    ],
  },
];

/**
 * Get the formula sheet for a given subject.
 */
export const getFormulaSheet = (subjectId: string): FormulaSheet | null =>
  FORMULA_SHEETS.find(s => s.subjectId === subjectId) || null;

/**
 * Get a compact text representation of the formula sheet for injection into AI prompts.
 */
export const getFormulaSheetContext = (subjectId: string): string => {
  const sheet = getFormulaSheet(subjectId);
  if (!sheet) return "";
  const lines = sheet.formulas.map(f => `• ${f.name}: ${f.description}`);
  return `Formula sheet for ${sheet.label}:\n${lines.join("\n")}`;
};

export default FORMULA_SHEETS;
