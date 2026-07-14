import type { FormulaSheet, Formula } from "@analogix/shared/formulas";

interface RawFormula {
  id: string;
  name: string;
  latex: string;
  description: string;
}

function cat(name: string, items: { name: string; latex: string; description: string }[]): { name: string; formulas: RawFormula[] } {
  return {
    name,
    formulas: items.map((f, i) => ({ id: `${name.toLowerCase().replace(/\s+/g, "-")}-${i + 1}`, ...f })),
  };
}

const MATH_CATEGORIES = [
  cat("Algebra", [
    { name: "Quadratic Formula", latex: "x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", description: "Solves ax² + bx + c = 0" },
    { name: "Difference of Two Squares", latex: "a^2 - b^2 = (a+b)(a-b)", description: "Factorising shortcut" },
    { name: "Perfect Square (sum)", latex: "(a+b)^2 = a^2 + 2ab + b^2", description: "Expanding a squared sum" },
    { name: "Perfect Square (difference)", latex: "(a-b)^2 = a^2 - 2ab + b^2", description: "Expanding a squared difference" },
    { name: "Sum of Cubes", latex: "a^3 + b^3 = (a+b)(a^2 - ab + b^2)", description: "Factorising sum of cubes" },
    { name: "Difference of Cubes", latex: "a^3 - b^3 = (a-b)(a^2 + ab + b^2)", description: "Factorising difference of cubes" },
    { name: "Discriminant", latex: "\\Delta = b^2 - 4ac", description: "Determines nature of quadratic roots" },
    { name: "Vertex Form", latex: "y = a(x-h)^2 + k", description: "Parabola with vertex at (h, k)" },
    { name: "Logarithm Definition", latex: "\\log_a b = c \\iff a^c = b", description: "Relationship between log and exponent" },
    { name: "Log Product Rule", latex: "\\log_a(xy) = \\log_a x + \\log_a y", description: "Log of a product" },
    { name: "Log Quotient Rule", latex: "\\log_a\\!\\left(\\dfrac{x}{y}\\right) = \\log_a x - \\log_a y", description: "Log of a quotient" },
    { name: "Log Power Rule", latex: "\\log_a(x^n) = n\\log_a x", description: "Log of a power" },
    { name: "Change of Base", latex: "\\log_a b = \\dfrac{\\ln b}{\\ln a}", description: "Convert between log bases" },
    { name: "Binomial Theorem", latex: "(a+b)^n = \\sum_{k=0}^{n}\\binom{n}{k}a^{n-k}b^k", description: "Expansion of a binomial power" },
    { name: "Partial Fractions (distinct linear)", latex: "\\dfrac{A}{x-a} + \\dfrac{B}{x-b}", description: "Decompose rational expression" },
    { name: "Remainder Theorem", latex: "f(a) = \\text{remainder when } f(x) \\div (x-a)", description: "Find remainder without long division" },
    { name: "Factor Theorem", latex: "(x-a) \\text{ is a factor} \\iff f(a)=0", description: "Root ↔ factor equivalence" },
    { name: "Exponential Growth/Decay", latex: "A = A_0\\,e^{kt}", description: "k > 0 = growth; k < 0 = decay" },
    { name: "Vieta's Formulas (quadratic)", latex: "\\alpha+\\beta = -\\dfrac{b}{a},\\quad \\alpha\\beta = \\dfrac{c}{a}", description: "Sum and product of roots" },
    { name: "AM–GM Inequality", latex: "\\dfrac{a+b}{2} \\geq \\sqrt{ab}", description: "Arithmetic mean ≥ geometric mean" },
  ]),
  cat("Calculus", [
    { name: "Power Rule (Differentiation)", latex: "\\dfrac{d}{dx}[x^n] = nx^{n-1}", description: "Derivative of a power function" },
    { name: "Power Rule (Integration)", latex: "\\int x^n\\,dx = \\dfrac{x^{n+1}}{n+1} + C", description: "Antiderivative of a power function" },
    { name: "Chain Rule", latex: "\\dfrac{dy}{dx} = \\dfrac{dy}{du}\\cdot\\dfrac{du}{dx}", description: "Derivative of composite functions" },
    { name: "Product Rule", latex: "\\dfrac{d}{dx}[uv] = u'v + uv'", description: "Derivative of a product" },
    { name: "Quotient Rule", latex: "\\dfrac{d}{dx}\\!\\left[\\dfrac{u}{v}\\right] = \\dfrac{u'v - uv'}{v^2}", description: "Derivative of a quotient" },
    { name: "Derivative of sin", latex: "\\dfrac{d}{dx}[\\sin x] = \\cos x", description: "Trig derivative" },
    { name: "Derivative of cos", latex: "\\dfrac{d}{dx}[\\cos x] = -\\sin x", description: "Trig derivative" },
    { name: "Derivative of tan", latex: "\\dfrac{d}{dx}[\\tan x] = \\sec^2 x", description: "Trig derivative" },
    { name: "Derivative of eˣ", latex: "\\dfrac{d}{dx}[e^x] = e^x", description: "Exponential derivative" },
    { name: "Derivative of ln x", latex: "\\dfrac{d}{dx}[\\ln x] = \\dfrac{1}{x}", description: "Natural log derivative" },
    { name: "Definite Integral", latex: "\\int_a^b f(x)\\,dx = F(b) - F(a)", description: "Fundamental Theorem of Calculus" },
    { name: "Integration by Parts", latex: "\\int u\\,dv = uv - \\int v\\,du", description: "Integral analogue of product rule" },
    { name: "Integration by Substitution", latex: "\\int f(g(x))g'(x)\\,dx = \\int f(u)\\,du", description: "u-substitution technique" },
    { name: "Area Between Curves", latex: "A = \\int_a^b [f(x) - g(x)]\\,dx", description: "Area between two functions" },
    { name: "Volume of Revolution (disk)", latex: "V = \\pi\\int_a^b [f(x)]^2\\,dx", description: "Rotate y = f(x) about x-axis" },
    { name: "Trapezoidal Rule", latex: "\\int_a^b f(x)\\,dx \\approx \\dfrac{h}{2}[f(a)+2f(x_1)+\\cdots+f(b)]", description: "Numerical integration approximation" },
    { name: "L'Hôpital's Rule", latex: "\\lim_{x\\to a}\\dfrac{f(x)}{g(x)} = \\lim_{x\\to a}\\dfrac{f'(x)}{g'(x)}", description: "For 0/0 or ∞/∞ indeterminate forms" },
    { name: "Taylor Series", latex: "f(x) = \\sum_{n=0}^{\\infty}\\dfrac{f^{(n)}(a)}{n!}(x-a)^n", description: "Infinite polynomial approximation" },
    { name: "Newton's Method", latex: "x_{n+1} = x_n - \\dfrac{f(x_n)}{f'(x_n)}", description: "Iterative root-finding algorithm" },
  ]),
  cat("Trigonometry", [
    { name: "Sine", latex: "\\sin \\theta = \\dfrac{\\text{Opposite}}{\\text{Hypotenuse}}", description: "Relates sides and angles of a triangle" },
    { name: "Cosine", latex: "\\cos \\theta = \\dfrac{\\text{Adjacent}}{\\text{Hypotenuse}}", description: "Relates sides and angles of a triangle" },
    { name: "Tangent", latex: "\\tan \\theta = \\dfrac{\\text{Opposite}}{\\text{Adjacent}}", description: "Relates sides and angles of a triangle" },
    { name: "Sine Rule", latex: "\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C}", description: "Relates sides and angles of any triangle" },
    { name: "Cosine Rule", latex: "c^2 = a^2 + b^2 - 2ab\\cos C", description: "Generalisation of Pythagoras" },
    { name: "Area of a Triangle", latex: "A = \\dfrac{1}{2}ab\\sin C", description: "When two sides and included angle are known" },
    { name: "Pythagorean Identity", latex: "\\sin^2\\theta + \\cos^2\\theta = 1", description: "Fundamental trig identity" },
    { name: "Double Angle (sin)", latex: "\\sin 2\\theta = 2\\sin\\theta\\cos\\theta", description: "Double angle formula" },
    { name: "Double Angle (cos)", latex: "\\cos 2\\theta = \\cos^2\\theta - \\sin^2\\theta", description: "Double angle formula" },
    { name: "Compound Angle (sin)", latex: "\\sin(A\\pm B) = \\sin A\\cos B \\pm \\cos A\\sin B", description: "Addition formula" },
    { name: "Compound Angle (cos)", latex: "\\cos(A\\pm B) = \\cos A\\cos B \\mp \\sin A\\sin B", description: "Addition formula" },
    { name: "Arc Length", latex: "l = r\\theta", description: "Arc length where θ is in radians" },
    { name: "Sector Area", latex: "A = \\dfrac{1}{2}r^2\\theta", description: "Area of a sector" },
    { name: "Radians to Degrees", latex: "\\theta_{\\deg} = \\theta_{\\text{rad}} \\times \\dfrac{180}{\\pi}", description: "Unit conversion" },
  ]),
  cat("Statistics & Probability", [
    { name: "Mean", latex: "\\bar{x} = \\dfrac{\\sum x_i}{n}", description: "Average of a data set" },
    { name: "Standard Deviation (sample)", latex: "s = \\sqrt{\\dfrac{\\sum(x_i - \\bar{x})^2}{n-1}}", description: "Spread of data around the mean" },
    { name: "z-score", latex: "z = \\dfrac{x - \\mu}{\\sigma}", description: "Standardised value" },
    { name: "Correlation Coefficient", latex: "r = \\dfrac{\\sum(x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum(x_i-\\bar{x})^2\\sum(y_i-\\bar{y})^2}}", description: "Pearson's r" },
    { name: "Probability", latex: "P(A) = \\dfrac{\\text{favourable outcomes}}{\\text{total outcomes}}", description: "Basic probability" },
    { name: "Complementary Events", latex: "P(A') = 1 - P(A)", description: "Probability of the complement" },
    { name: "Addition Rule", latex: "P(A\\cup B) = P(A)+P(B)-P(A\\cap B)", description: "Probability of A or B" },
    { name: "Conditional Probability", latex: "P(A|B) = \\dfrac{P(A\\cap B)}{P(B)}", description: "Probability of A given B" },
    { name: "Binomial Probability", latex: "P(X=k) = \\binom{n}{k}p^k(1-p)^{n-k}", description: "Exactly k successes in n trials" },
    { name: "Bayes' Theorem", latex: "P(A|B) = \\dfrac{P(B|A)P(A)}{P(B)}", description: "Update probability with new evidence" },
    { name: "Normal Distribution PDF", latex: "f(x) = \\dfrac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}", description: "Bell curve probability density" },
    { name: "68–95–99.7 Rule", latex: "P(\\mu\\pm\\sigma)\\approx68\\%,\\; P(\\mu\\pm2\\sigma)\\approx95\\%,\\; P(\\mu\\pm3\\sigma)\\approx99.7\\%", description: "Empirical rule for normal distribution" },
  ]),
  cat("Sequences & Series", [
    { name: "Arithmetic nth Term", latex: "T_n = a + (n-1)d", description: "a = first term, d = common difference" },
    { name: "Geometric nth Term", latex: "T_n = ar^{n-1}", description: "a = first term, r = common ratio" },
    { name: "Sum of Arithmetic Series", latex: "S_n = \\dfrac{n}{2}(2a + (n-1)d)", description: "Sum of first n terms" },
    { name: "Sum of Geometric Series", latex: "S_n = \\dfrac{a(1-r^n)}{1-r}", description: "Sum of first n terms (r ≠ 1)" },
    { name: "Sum to Infinity", latex: "S_\\infty = \\dfrac{a}{1-r},\\quad |r|<1", description: "Infinite geometric series" },
  ]),
  cat("Vectors", [
    { name: "Vector Magnitude (2D)", latex: "|\\mathbf{a}| = \\sqrt{a_x^2 + a_y^2}", description: "Length of a 2D vector" },
    { name: "Dot Product", latex: "\\mathbf{a}\\cdot\\mathbf{b} = |\\mathbf{a}||\\mathbf{b}|\\cos\\theta", description: "Scalar product" },
    { name: "Angle Between Vectors", latex: "\\cos\\theta = \\dfrac{\\mathbf{a}\\cdot\\mathbf{b}}{|\\mathbf{a}||\\mathbf{b}|}", description: "Find angle using dot product" },
    { name: "Vector Equation of Line", latex: "\\mathbf{r} = \\mathbf{a} + t\\mathbf{d}", description: "Point a + scalar t × direction d" },
  ]),
  cat("Geometry", [
    { name: "Pythagoras' Theorem", latex: "c^2 = a^2 + b^2", description: "Right-angled triangle side lengths" },
    { name: "Circle Area", latex: "A = \\pi r^2", description: "Area of a circle" },
    { name: "Circle Circumference", latex: "C = 2\\pi r", description: "Perimeter of a circle" },
    { name: "Sphere Volume", latex: "V = \\dfrac{4}{3}\\pi r^3", description: "Volume of a sphere" },
    { name: "Cylinder Volume", latex: "V = \\pi r^2 h", description: "Volume of a cylinder" },
    { name: "Cone Volume", latex: "V = \\dfrac{1}{3}\\pi r^2 h", description: "Volume of a cone" },
    { name: "Distance Formula", latex: "d = \\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}", description: "Distance between two points" },
    { name: "Midpoint Formula", latex: "M = \\left(\\dfrac{x_1+x_2}{2},\\dfrac{y_1+y_2}{2}\\right)", description: "Midpoint between two points" },
    { name: "Gradient-Intercept Form", latex: "y = mx + b", description: "Equation of a straight line" },
  ]),
  cat("Finance", [
    { name: "Compound Interest", latex: "A = P\\!\\left(1+\\dfrac{r}{n}\\right)^{nt}", description: "A = final amount, P = principal" },
    { name: "Simple Interest", latex: "I = Prt", description: "Interest = principal × rate × time" },
    { name: "Present Value", latex: "PV = \\dfrac{FV}{(1+r)^n}", description: "Present value of a future amount" },
  ]),
  cat("Complex Numbers", [
    { name: "Imaginary Unit", latex: "i^2 = -1", description: "Definition of the imaginary unit" },
    { name: "Euler's Formula", latex: "e^{i\\theta} = \\cos\\theta + i\\sin\\theta", description: "Links e, trig and complex numbers" },
    { name: "de Moivre's Theorem", latex: "(r(\\cos\\theta+i\\sin\\theta))^n = r^n(\\cos n\\theta + i\\sin n\\theta)", description: "Powers of complex numbers" },
  ]),
  cat("Matrices", [
    { name: "Determinant (2×2)", latex: "\\det\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix} = ad - bc", description: "Determinant of a 2×2 matrix" },
    { name: "Inverse (2×2)", latex: "A^{-1} = \\dfrac{1}{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}", description: "Inverse of a 2×2 matrix" },
  ]),
  cat("Functions & Graphs", [
    { name: "Even Function", latex: "f(-x) = f(x)", description: "Symmetric about y-axis" },
    { name: "Odd Function", latex: "f(-x) = -f(x)", description: "Symmetric about origin" },
    { name: "Composite Function", latex: "(f \\circ g)(x) = f(g(x))", description: "Apply g first, then f" },
    { name: "Equation of a Circle", latex: "(x-h)^2 + (y-k)^2 = r^2", description: "Circle with centre (h,k) and radius r" },
  ]),
  cat("Number Theory & Proof", [
    { name: "GCD (Euclidean)", latex: "\\gcd(a,b) = \\gcd(b,\\, a\\bmod b)", description: "Euclidean algorithm for GCD" },
    { name: "Mathematical Induction", latex: "P(1)\\text{ true, }P(k)\\Rightarrow P(k+1) \\Rightarrow P(n)\\text{ for all }n\\in\\mathbb{N}", description: "Proof technique" },
  ]),
];

const PHYSICS_CATEGORIES = [
  cat("Kinematics", [
    { name: "v = u + at", latex: "v = u + at", description: "Final velocity with constant acceleration" },
    { name: "s = ut + ½at²", latex: "s = ut + \\tfrac{1}{2}at^2", description: "Displacement with constant acceleration" },
    { name: "v² = u² + 2as", latex: "v^2 = u^2 + 2as", description: "Velocity–displacement relation" },
    { name: "s = ½(u+v)t", latex: "s = \\tfrac{1}{2}(u+v)t", description: "Displacement using average velocity" },
    { name: "Projectile Range", latex: "R = \\dfrac{u^2\\sin 2\\theta}{g}", description: "Horizontal range on flat ground" },
    { name: "Projectile Max Height", latex: "H = \\dfrac{u^2\\sin^2\\theta}{2g}", description: "Maximum height of a projectile" },
    { name: "Circular Speed", latex: "v = \\dfrac{2\\pi r}{T}", description: "Speed in uniform circular motion" },
    { name: "Angular Velocity", latex: "\\omega = \\dfrac{2\\pi}{T} = 2\\pi f", description: "Radians per second" },
  ]),
  cat("Forces", [
    { name: "Newton's Second Law", latex: "F = ma", description: "Net force = mass × acceleration" },
    { name: "Weight", latex: "W = mg", description: "Gravitational force on a mass" },
    { name: "Friction", latex: "f = \\mu N", description: "μ = coefficient of friction, N = normal force" },
    { name: "Centripetal Force", latex: "F_c = \\dfrac{mv^2}{r} = m\\omega^2 r", description: "Force toward centre of circular path" },
    { name: "Momentum", latex: "p = mv", description: "Mass × velocity" },
    { name: "Impulse", latex: "J = F\\Delta t = \\Delta p", description: "Change in momentum" },
    { name: "Conservation of Momentum", latex: "m_1u_1 + m_2u_2 = m_1v_1 + m_2v_2", description: "Total momentum conserved in collisions" },
    { name: "Hooke's Law", latex: "F = -kx", description: "Restoring force in a spring" },
    { name: "Torque", latex: "\\tau = Fr\\sin\\theta", description: "Rotational force (moment)" },
  ]),
  cat("Energy", [
    { name: "Kinetic Energy", latex: "E_k = \\tfrac{1}{2}mv^2", description: "Energy of motion" },
    { name: "Gravitational PE", latex: "E_p = mgh", description: "Energy due to height" },
    { name: "Elastic PE", latex: "E_{sp} = \\tfrac{1}{2}kx^2", description: "Energy stored in a spring" },
    { name: "Work", latex: "W = Fs\\cos\\theta", description: "Force × displacement" },
    { name: "Power", latex: "P = \\dfrac{W}{t} = Fv", description: "Rate of energy transfer" },
    { name: "Efficiency", latex: "\\eta = \\dfrac{P_{\\text{out}}}{P_{\\text{in}}} \\times 100\\%", description: "Useful output / total input" },
    { name: "Conservation of Energy", latex: "E_k + E_p = \\text{constant}", description: "Mechanical energy conserved (no friction)" },
  ]),
  cat("Waves", [
    { name: "Wave Speed", latex: "v = f\\lambda", description: "Speed = frequency × wavelength" },
    { name: "Period & Frequency", latex: "T = \\dfrac{1}{f}", description: "Period = reciprocal of frequency" },
    { name: "Snell's Law", latex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2", description: "Refraction at a boundary" },
    { name: "Refractive Index", latex: "n = \\dfrac{c}{v}", description: "Speed of light in medium vs vacuum" },
    { name: "Doppler Effect", latex: "f' = f\\dfrac{v \\pm v_o}{v \\mp v_s}", description: "Observed frequency change due to motion" },
    { name: "Decibels", latex: "L = 10\\log_{10}\\!\\left(\\dfrac{I}{I_0}\\right)", description: "Sound level in dB" },
    { name: "Standing Wave (string)", latex: "f_n = \\dfrac{nv}{2L}", description: "nth harmonic of a string" },
  ]),
  cat("Electricity", [
    { name: "Ohm's Law", latex: "V = IR", description: "Voltage = current × resistance" },
    { name: "Electric Power", latex: "P = VI = I^2R = \\dfrac{V^2}{R}", description: "Power dissipated" },
    { name: "Resistors in Series", latex: "R_T = R_1 + R_2 + \\cdots", description: "Total resistance in series" },
    { name: "Resistors in Parallel", latex: "\\dfrac{1}{R_T} = \\dfrac{1}{R_1}+\\dfrac{1}{R_2}+\\cdots", description: "Total resistance in parallel" },
    { name: "Coulomb's Law", latex: "F = \\dfrac{kq_1q_2}{r^2}", description: "Force between two charges" },
    { name: "Electric Field", latex: "E = \\dfrac{F}{q} = \\dfrac{kQ}{r^2}", description: "Force per unit charge" },
    { name: "Magnetic Force on Wire", latex: "F = BIl\\sin\\theta", description: "Force on a current-carrying wire" },
    { name: "Magnetic Force on Charge", latex: "F = qvB\\sin\\theta", description: "Force on a moving charge" },
    { name: "Faraday's Law (EMF)", latex: "\\mathcal{E} = -N\\dfrac{\\Delta\\Phi}{\\Delta t}", description: "Induced EMF from changing flux" },
    { name: "Transformer Ratio", latex: "\\dfrac{V_s}{V_p} = \\dfrac{N_s}{N_p}", description: "Voltage ratio = turns ratio" },
  ]),
  cat("Gravity", [
    { name: "Universal Gravitation", latex: "F = \\dfrac{Gm_1m_2}{r^2}", description: "Force between two masses" },
    { name: "Gravitational Field Strength", latex: "g = \\dfrac{GM}{r^2}", description: "Field strength at distance r" },
    { name: "Orbital Speed", latex: "v = \\sqrt{\\dfrac{GM}{r}}", description: "Speed for circular orbit" },
    { name: "Orbital Period (Kepler III)", latex: "T^2 = \\dfrac{4\\pi^2 r^3}{GM}", description: "Period of a circular orbit" },
    { name: "Escape Velocity", latex: "v_e = \\sqrt{\\dfrac{2GM}{r}}", description: "Minimum speed to escape gravity" },
  ]),
  cat("Thermodynamics", [
    { name: "Specific Heat Capacity", latex: "Q = mc\\Delta T", description: "Heat = mass × specific heat × temperature change" },
    { name: "Latent Heat", latex: "Q = mL", description: "Heat for phase change" },
    { name: "Ideal Gas Law", latex: "PV = nRT", description: "P = pressure, V = volume, n = moles" },
    { name: "First Law of Thermodynamics", latex: "\\Delta U = Q - W", description: "Change in internal energy" },
  ]),
  cat("Nuclear", [
    { name: "Mass-Energy Equivalence", latex: "E = mc^2", description: "Einstein's famous relation" },
    { name: "Radioactive Decay", latex: "N = N_0 e^{-\\lambda t}", description: "Undecayed nuclei at time t" },
    { name: "Half-Life", latex: "t_{1/2} = \\dfrac{\\ln 2}{\\lambda}", description: "Time for half to decay" },
    { name: "Photon Energy", latex: "E = hf = \\dfrac{hc}{\\lambda}", description: "Energy of a photon" },
    { name: "de Broglie Wavelength", latex: "\\lambda = \\dfrac{h}{mv}", description: "Matter wavelength" },
  ]),
];

const CHEMISTRY_CATEGORIES = [
  cat("Stoichiometry", [
    { name: "Moles from Mass", latex: "n = \\dfrac{m}{M}", description: "n = moles, m = mass, M = molar mass" },
    { name: "Concentration", latex: "c = \\dfrac{n}{V}", description: "mol/L, V in litres" },
    { name: "Dilution Formula", latex: "c_1V_1 = c_2V_2", description: "Concentration × volume conserved on dilution" },
    { name: "Percentage Composition", latex: "\\%\\,\\text{element} = \\dfrac{M_{\\text{element}}}{M_{\\text{compound}}}\\times 100", description: "Mass percent of an element" },
    { name: "Percentage Yield", latex: "\\text{yield} = \\dfrac{\\text{actual}}{\\text{theoretical}}\\times 100\\%", description: "Efficiency of a reaction" },
    { name: "Atom Economy", latex: "\\text{atom economy} = \\dfrac{M_{\\text{desired product}}}{M_{\\text{all products}}}\\times 100", description: "Efficiency of a reaction" },
  ]),
  cat("Gas Laws", [
    { name: "Ideal Gas Law", latex: "PV = nRT", description: "R = 8.314 J mol⁻¹ K⁻¹" },
    { name: "Dalton's Law", latex: "P_{\\text{total}} = P_1 + P_2 + P_3 + \\cdots", description: "Total pressure = sum of partial pressures" },
    { name: "Graham's Law", latex: "\\dfrac{r_1}{r_2} = \\sqrt{\\dfrac{M_2}{M_1}}", description: "Relative rates of gas effusion" },
  ]),
  cat("Acids & Bases", [
    { name: "pH", latex: "\\text{pH} = -\\log_{10}[\\text{H}^+]", description: "Measure of acidity" },
    { name: "pOH", latex: "\\text{pOH} = -\\log_{10}[\\text{OH}^-]", description: "Measure of basicity" },
    { name: "pH + pOH = 14", latex: "\\text{pH} + \\text{pOH} = 14", description: "At 25°C" },
    { name: "Ka Expression", latex: "K_a = \\dfrac{[\\text{H}^+][\\text{A}^-]}{[\\text{HA}]}", description: "Acid dissociation constant" },
    { name: "Henderson-Hasselbalch", latex: "\\text{pH} = pK_a + \\log\\dfrac{[\\text{A}^-]}{[\\text{HA}]}", description: "Buffer pH calculation" },
  ]),
  cat("Thermochemistry", [
    { name: "Heat of Reaction", latex: "q = mc\\Delta T", description: "Calorimetry calculation" },
    { name: "Enthalpy Change", latex: "\\Delta H = H_{\\text{products}} - H_{\\text{reactants}}", description: "Heat of reaction" },
    { name: "Hess's Law", latex: "\\Delta H_{\\text{rxn}} = \\sum\\Delta H_{\\text{f,products}} - \\sum\\Delta H_{\\text{f,reactants}}", description: "Enthalpy from formation values" },
    { name: "Gibbs Free Energy", latex: "\\Delta G = \\Delta H - T\\Delta S", description: "Spontaneity: ΔG < 0 is spontaneous" },
  ]),
  cat("Equilibrium", [
    { name: "Equilibrium Constant (Kc)", latex: "K_c = \\dfrac{[C]^c[D]^d}{[A]^a[B]^b}", description: "For aA + bB ⇌ cC + dD" },
    { name: "Reaction Quotient", latex: "Q_c = \\dfrac{[C]^c[D]^d}{[A]^a[B]^b}", description: "Determines direction of shift (Q vs K)" },
    { name: "Solubility Product", latex: "K_{sp} = [\\text{cation}]^m[\\text{anion}]^n", description: "For sparingly soluble salts" },
  ]),
  cat("Electrochemistry", [
    { name: "Faraday's Law", latex: "m = \\dfrac{ItM}{nF}", description: "Mass deposited; F = 96485 C mol⁻¹" },
    { name: "Cell Potential", latex: "E^\\circ_{\\text{cell}} = E^\\circ_{\\text{cathode}} - E^\\circ_{\\text{anode}}", description: "Standard cell voltage" },
    { name: "Nernst Equation", latex: "E = E^\\circ - \\dfrac{RT}{nF}\\ln Q", description: "Cell potential under non-standard conditions" },
  ]),
  cat("Reaction Rates", [
    { name: "Rate Expression", latex: "\\text{rate} = k[A]^m[B]^n", description: "k = rate constant, m and n = orders" },
    { name: "Arrhenius Equation", latex: "k = Ae^{-E_a/RT}", description: "Temperature dependence of rate" },
    { name: "Half-Life (first order)", latex: "t_{1/2} = \\dfrac{\\ln 2}{k}", description: "Time for concentration to halve" },
  ]),
  cat("Atomic Structure", [
    { name: "Energy of Photon", latex: "E = hf = \\dfrac{hc}{\\lambda}", description: "h = 6.626 × 10⁻³⁴ J·s" },
    { name: "Rydberg Formula", latex: "\\dfrac{1}{\\lambda} = R_H\\!\\left(\\dfrac{1}{n_1^2}-\\dfrac{1}{n_2^2}\\right)", description: "Spectral lines of hydrogen" },
  ]),
];

const BIOLOGY_CATEGORIES = [
  cat("Genetics", [
    { name: "Hardy-Weinberg (genotypes)", latex: "p^2 + 2pq + q^2 = 1", description: "Genotype frequencies in equilibrium" },
    { name: "Hardy-Weinberg (alleles)", latex: "p + q = 1", description: "Allele frequency sum" },
    { name: "Chi-squared Test", latex: "\\chi^2 = \\sum\\dfrac{(O - E)^2}{E}", description: "Tests if observed ratios fit expected" },
    { name: "Recombination Frequency", latex: "r = \\dfrac{\\text{recombinant offspring}}{\\text{total offspring}}\\times 100\\%", description: "Map units between loci" },
  ]),
  cat("Ecology", [
    { name: "Population Growth (exponential)", latex: "\\dfrac{dN}{dt} = rN", description: "r = intrinsic growth rate" },
    { name: "Population Growth (logistic)", latex: "\\dfrac{dN}{dt} = rN\\!\\left(\\dfrac{K-N}{K}\\right)", description: "K = carrying capacity" },
    { name: "Lincoln-Petersen (mark-recapture)", latex: "N = \\dfrac{M \\times C}{R}", description: "M = marked, C = second sample, R = recaptured" },
    { name: "Simpson's Diversity Index", latex: "D = 1 - \\dfrac{\\sum n(n-1)}{N(N-1)}", description: "Measure of species diversity" },
    { name: "Net Primary Productivity", latex: "NPP = GPP - R_a", description: "GPP - autotroph respiration" },
  ]),
  cat("Cell Biology", [
    { name: "Surface Area to Volume Ratio", latex: "\\text{SA:V} = \\dfrac{6}{d}", description: "For a cube of side d" },
    { name: "Water Potential", latex: "\\Psi = \\Psi_s + \\Psi_p", description: "Solute + pressure potential" },
    { name: "Mitotic Index", latex: "MI = \\dfrac{\\text{cells in mitosis}}{\\text{total cells}}\\times 100", description: "Proportion of cells dividing" },
  ]),
  cat("Photosynthesis & Respiration", [
    { name: "Overall Photosynthesis", latex: "6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{light}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2", description: "Net equation for photosynthesis" },
    { name: "Aerobic Respiration", latex: "\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\rightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{ATP}", description: "Complete glucose oxidation" },
    { name: "Respiratory Quotient", latex: "RQ = \\dfrac{\\text{CO}_2\\,\\text{produced}}{\\text{O}_2\\,\\text{consumed}}", description: "Indicates substrate being respired" },
  ]),
  cat("Evolution", [
    { name: "Relative Fitness", latex: "w = \\dfrac{\\text{survival/reproduction of genotype}}{\\text{max survival/reproduction}}", description: "Fitness relative to most fit" },
    { name: "Selection Coefficient", latex: "s = 1 - w", description: "Disadvantage relative to fittest" },
    { name: "Effective Population Size", latex: "N_e = \\dfrac{4N_f N_m}{N_f + N_m}", description: "Accounts for unequal sex ratios" },
  ]),
  cat("Physiology", [
    { name: "Cardiac Output", latex: "CO = HR \\times SV", description: "HR = heart rate, SV = stroke volume" },
    { name: "Mean Arterial Pressure", latex: "MAP = DP + \\dfrac{1}{3}(SP - DP)", description: "DP = diastolic, SP = systolic" },
    { name: "Glomerular Filtration Rate", latex: "GFR = \\dfrac{U \\times V}{P}", description: "U = urine conc, V = urine flow, P = plasma conc" },
    { name: "BMI", latex: "BMI = \\dfrac{m}{h^2}", description: "Body mass (kg) / height² (m²)" },
  ]),
];

const ECONOMICS_CATEGORIES = [
  cat("Macroeconomics", [
    { name: "GDP (Expenditure)", latex: "GDP = C + I + G + (X - M)", description: "C=consumption, I=investment, G=govt, X-M=net exports" },
    { name: "Real GDP", latex: "\\text{Real GDP} = \\dfrac{\\text{Nominal GDP}}{\\text{GDP Deflator}}\\times 100", description: "Adjusts for inflation" },
    { name: "Inflation Rate", latex: "\\pi = \\dfrac{\\text{CPI}_{t} - \\text{CPI}_{t-1}}{\\text{CPI}_{t-1}}\\times 100", description: "Percentage change in CPI" },
    { name: "Unemployment Rate", latex: "U = \\dfrac{\\text{Unemployed}}{\\text{Labour force}}\\times 100", description: "Share without work" },
    { name: "Money Multiplier", latex: "m = \\dfrac{1}{\\text{reserve ratio}}", description: "Maximum credit creation" },
    { name: "Quantity Theory of Money", latex: "MV = PQ", description: "M=money supply, V=velocity, P=price, Q=output" },
    { name: "Fiscal Multiplier", latex: "k = \\dfrac{1}{1 - MPC}", description: "MPC = marginal propensity to consume" },
    { name: "Terms of Trade", latex: "ToT = \\dfrac{P_{\\text{exports}}}{P_{\\text{imports}}}\\times 100", description: "Export prices / import prices" },
  ]),
  cat("Microeconomics", [
    { name: "Price Elasticity of Demand", latex: "PED = \\dfrac{\\%\\Delta Q_d}{\\%\\Delta P}", description: "Responsiveness of Qd to price" },
    { name: "Price Elasticity of Supply", latex: "PES = \\dfrac{\\%\\Delta Q_s}{\\%\\Delta P}", description: "Responsiveness of Qs to price" },
    { name: "Total Revenue", latex: "TR = P \\times Q", description: "Price × quantity" },
    { name: "Profit", latex: "\\pi = TR - TC", description: "Total revenue − total cost" },
    { name: "Profit Maximisation", latex: "MR = MC", description: "Optimal output rule" },
    { name: "Consumer Surplus", latex: "CS = \\dfrac{1}{2}(P_{\\max} - P)\\times Q", description: "Area above price below demand curve" },
    { name: "Producer Surplus", latex: "PS = \\dfrac{1}{2}(P - P_{\\min})\\times Q", description: "Area below price above supply curve" },
    { name: "Herfindahl-Hirschman Index", latex: "HHI = \\sum_{i=1}^n s_i^2", description: "s = market share %; measures concentration" },
  ]),
  cat("Finance", [
    { name: "Net Present Value", latex: "NPV = \\sum_{t=0}^n \\dfrac{CF_t}{(1+r)^t}", description: "Sum of discounted cash flows" },
    { name: "Gini Coefficient", latex: "G = \\dfrac{A}{A+B}", description: "A = area between Lorenz curve and equality line" },
  ]),
];

function hydrateSheet(
  subjectId: string,
  subjectName: string,
  raw: { name: string; formulas: RawFormula[] }[]
): FormulaSheet {
  return {
    subjectId,
    subjectName,
    categories: raw.map((c) => ({
      name: c.name,
      formulas: c.formulas.map((f): Formula => ({
        id: f.id,
        name: f.name,
        latex: f.latex,
        description: f.description,
        subjectId,
        category: c.name,
      })),
    })),
  };
}

export const FORMULA_SHEET_DATA: FormulaSheet[] = [
  hydrateSheet("math", "Mathematics", MATH_CATEGORIES),
  hydrateSheet("physics", "Physics", PHYSICS_CATEGORIES),
  hydrateSheet("chemistry", "Chemistry", CHEMISTRY_CATEGORIES),
  hydrateSheet("biology", "Biology", BIOLOGY_CATEGORIES),
  hydrateSheet("economics", "Economics", ECONOMICS_CATEGORIES),
];

export function findFormulaSheet(subjectId: string): FormulaSheet | undefined {
  return FORMULA_SHEET_DATA.find((s) => s.subjectId === subjectId);
}

export function buildFormulaSheetContext(subjectId: string): string {
  const sheet = findFormulaSheet(subjectId);
  if (!sheet) return "";
  const lines: string[] = [];
  for (const cat of sheet.categories) {
    for (const f of cat.formulas) {
      lines.push(`• ${f.name} (${cat.name}): ${f.description} → ${f.latex}`);
    }
  }
  return `Formula sheet for ${sheet.subjectName}:\n${lines.join("\n")}`;
}

export function searchAllFormulas(query: string): Formula[] {
  const q = query.toLowerCase();
  const results: Formula[] = [];
  for (const sheet of FORMULA_SHEET_DATA) {
    for (const cat of sheet.categories) {
      for (const f of cat.formulas) {
        if (f.name.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q)) {
          results.push(f);
        }
      }
    }
  }
  return results;
}
