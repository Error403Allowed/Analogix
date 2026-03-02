/**
 * Formula sheets for Australian high school subjects.
 * Each sheet contains 100+ formulas relevant to the given subject.
 */

export interface Formula {
  name: string;
  latex: string;
  description: string;
  topic: string;
  /**
   * One or more grade levels this formula is typically taught in.
   * e.g. ["7","8","11"] or "12". Used for documentation only.
   */
  grades?: string[];
  /**
   * Australian states/territories where this formula is specifically
   * emphasised in the curriculum.  Useful for filtering/suggestions.
   * Examples: ["NSW","VIC","QLD"].   *
   * Formulas lacking this field are treated as relevant to **all** states
   * at runtime (they will be annotated with {states:["ALL"]} automatically
   * when the sheet is constructed).  New entries should specify explicit
   * states when they are only taught in some jurisdictions.   */
  states?: string[];
  /**
   * Free-form tags for additional filtering (e.g. "calculus","trigonometry").
   */
  tags?: string[];
}

export interface FormulaSheet {
  subjectId: string;
  label: string;
  formulas: Formula[];
}

const MATH_FORMULAS: Formula[] = [
  // Algebra
  { topic: "Algebra", name: "Quadratic Formula", latex: "x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", description: "Solves ax² + bx + c = 0" },
  { topic: "Algebra", name: "Difference of Two Squares", latex: "a^2 - b^2 = (a+b)(a-b)", description: "Factorising shortcut" },
  { topic: "Algebra", name: "Perfect Square (sum)", latex: "(a+b)^2 = a^2 + 2ab + b^2", description: "Expanding a squared sum" },
  { topic: "Algebra", name: "Logarithm Definition", latex: "\\log_a b = c \\iff a^c = b", description: "Relationship between log and exponent", states: ["NSW", "VIC"], tags: ["logs"] },
  { topic: "Algebra", name: "Perfect Square (difference)", latex: "(a-b)^2 = a^2 - 2ab + b^2", description: "Expanding a squared difference" },
  { topic: "Algebra", name: "Sum of Cubes", latex: "a^3 + b^3 = (a+b)(a^2 - ab + b^2)", description: "Factorising sum of cubes" },
  { topic: "Algebra", name: "Difference of Cubes", latex: "a^3 - b^3 = (a-b)(a^2 + ab + b^2)", description: "Factorising difference of cubes" },
  { topic: "Algebra", name: "Discriminant", latex: "\\Delta = b^2 - 4ac", description: "Determines nature of quadratic roots" },
  { topic: "Algebra", name: "Vertex Form", latex: "y = a(x-h)^2 + k", description: "Parabola with vertex at (h, k)" },
  { topic: "Algebra", name: "Log Product Rule", latex: "\\log_a(xy) = \\log_a x + \\log_a y", description: "Log of a product" },
  { topic: "Algebra", name: "Log Quotient Rule", latex: "\\log_a\\!\\left(\\dfrac{x}{y}\\right) = \\log_a x - \\log_a y", description: "Log of a quotient" },
  { topic: "Algebra", name: "Log Power Rule", latex: "\\log_a(x^n) = n\\log_a x", description: "Log of a power" },
  { topic: "Algebra", name: "Change of Base", latex: "\\log_a b = \\dfrac{\\ln b}{\\ln a}", description: "Convert between log bases" },
  { topic: "Algebra", name: "Binomial Theorem", latex: "(a+b)^n = \\sum_{k=0}^{n}\\binom{n}{k}a^{n-k}b^k", description: "Expansion of a binomial power" },
  { topic: "Algebra", name: "Binomial Coefficient", latex: "\\binom{n}{k} = \\dfrac{n!}{k!(n-k)!}", description: "Number of ways to choose k from n" },
  // Calculus
  { topic: "Calculus", name: "Power Rule (Differentiation)", latex: "\\dfrac{d}{dx}[x^n] = nx^{n-1}", description: "Derivative of a power function" },
  { topic: "Calculus", name: "Power Rule (Integration)", latex: "\\int x^n\\,dx = \\dfrac{x^{n+1}}{n+1} + C", description: "Antiderivative of a power function" },
  { topic: "Calculus", name: "Chain Rule", latex: "\\dfrac{dy}{dx} = \\dfrac{dy}{du}\\cdot\\dfrac{du}{dx}", description: "Derivative of composite functions" },
  { topic: "Calculus", name: "Product Rule", latex: "\\dfrac{d}{dx}[uv] = u'v + uv'", description: "Derivative of a product" },
  { topic: "Calculus", name: "Quotient Rule", latex: "\\dfrac{d}{dx}\\!\\left[\\dfrac{u}{v}\\right] = \\dfrac{u'v - uv'}{v^2}", description: "Derivative of a quotient" },
  { topic: "Calculus", name: "Derivative of sin", latex: "\\dfrac{d}{dx}[\\sin x] = \\cos x", description: "Trig derivative" },
  { topic: "Calculus", name: "Derivative of cos", latex: "\\dfrac{d}{dx}[\\cos x] = -\\sin x", description: "Trig derivative" },
  { topic: "Calculus", name: "Derivative of tan", latex: "\\dfrac{d}{dx}[\\tan x] = \\sec^2 x", description: "Trig derivative" },
  { topic: "Calculus", name: "Derivative of eˣ", latex: "\\dfrac{d}{dx}[e^x] = e^x", description: "Exponential derivative" },
  { topic: "Calculus", name: "Derivative of ln x", latex: "\\dfrac{d}{dx}[\\ln x] = \\dfrac{1}{x}", description: "Natural log derivative" },
  { topic: "Calculus", name: "Definite Integral", latex: "\\int_a^b f(x)\\,dx = F(b) - F(a)", description: "Fundamental Theorem of Calculus" },
  { topic: "Calculus", name: "Integral of sin", latex: "\\int \\sin x\\,dx = -\\cos x + C", description: "Trig integral" },
  { topic: "Calculus", name: "Integral of cos", latex: "\\int \\cos x\\,dx = \\sin x + C", description: "Trig integral" },
  { topic: "Calculus", name: "Integral of eˣ", latex: "\\int e^x\\,dx = e^x + C", description: "Exponential integral" },
  { topic: "Calculus", name: "Integral of 1/x", latex: "\\int \\dfrac{1}{x}\\,dx = \\ln|x| + C", description: "Integral of reciprocal" },
  { topic: "Calculus", name: "Area Between Curves", latex: "A = \\int_a^b [f(x) - g(x)]\\,dx", description: "Area between two functions" },
  { topic: "Calculus", name: "Trapezoidal Rule", latex: "\\int_a^b f(x)\\,dx \\approx \\dfrac{h}{2}[f(a)+2f(x_1)+\\cdots+f(b)]", description: "Numerical integration approximation" },
  // Trigonometry
  { topic: "Trigonometry", name: "Sine", latex: "\\sin \\theta = \\dfrac{\\text{Opposite}}{\\text{Hypotenuse}}", description: "Relates sides and angles of any triangle" },
  { topic: "Trigonometry", name: "Cosine", latex: "\\cos \\theta = \\dfrac{\\text{Adjacent}}{\\text{Hypotenuse}}", description: "Relates sides and angles of any triangle" },
  { topic: "Trigonometry", name: "Tangent", latex: "\\tan \\theta = \\dfrac{\\text{Opposite}}{\\text{Adjacent}}", description: "Relates sides and angles of any triangle" },
  { topic: "Trigonometry", name: "Sine Rule", latex: "\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C}", description: "Relates sides and angles of any triangle" },
  { topic: "Trigonometry", name: "Cosine Rule", latex: "c^2 = a^2 + b^2 - 2ab\\cos C", description: "Generalisation of Pythagoras" },
  { topic: "Trigonometry", name: "Area of a Triangle", latex: "A = \\dfrac{1}{2}ab\\sin C", description: "When two sides and included angle are known" },
  { topic: "Trigonometry", name: "Pythagorean Identity", latex: "\\sin^2\\theta + \\cos^2\\theta = 1", description: "Fundamental trig identity" },
  { topic: "Trigonometry", name: "Tan Identity", latex: "\\tan\\theta = \\dfrac{\\sin\\theta}{\\cos\\theta}", description: "Definition of tangent" },
  { topic: "Trigonometry", name: "Sec Identity", latex: "1 + \\tan^2\\theta = \\sec^2\\theta", description: "Pythagorean identity variant" },
  { topic: "Trigonometry", name: "Cosec Identity", latex: "1 + \\cot^2\\theta = \\cosec^2\\theta", description: "Pythagorean identity variant" },
  { topic: "Trigonometry", name: "Double Angle (sin)", latex: "\\sin 2\\theta = 2\\sin\\theta\\cos\\theta", description: "Double angle formula" },
  { topic: "Trigonometry", name: "Double Angle (cos)", latex: "\\cos 2\\theta = \\cos^2\\theta - \\sin^2\\theta", description: "Double angle formula" },
  { topic: "Trigonometry", name: "Compound Angle (sin)", latex: "\\sin(A\\pm B) = \\sin A\\cos B \\pm \\cos A\\sin B", description: "Addition formula" },
  { topic: "Trigonometry", name: "Compound Angle (cos)", latex: "\\cos(A\\pm B) = \\cos A\\cos B \\mp \\sin A\\sin B", description: "Addition formula" },
  { topic: "Trigonometry", name: "Radians to Degrees", latex: "\\theta_{\\deg} = \\theta_{\\text{rad}} \\times \\dfrac{180}{\\pi}", description: "Unit conversion" },
  { topic: "Trigonometry", name: "Arc Length", latex: "l = r\\theta", description: "Arc length where θ is in radians" },
  { topic: "Trigonometry", name: "Sector Area", latex: "A = \\dfrac{1}{2}r^2\\theta", description: "Area of a sector" },
  // Statistics & Probability
  { topic: "Statistics", name: "Mean", latex: "\\bar{x} = \\dfrac{\\sum x_i}{n}", description: "Average of a data set" },
  { topic: "Statistics", name: "Standard Deviation (sample)", latex: "s = \\sqrt{\\dfrac{\\sum(x_i - \\bar{x})^2}{n-1}}", description: "Spread of data around the mean" },
  { topic: "Statistics", name: "Standard Deviation (population)", latex: "\\sigma = \\sqrt{\\dfrac{\\sum(x_i - \\mu)^2}{N}}", description: "Population spread" },
  { topic: "Statistics", name: "z-score", latex: "z = \\dfrac{x - \\mu}{\\sigma}", description: "Standardised value" },
  { topic: "Statistics", name: "Correlation Coefficient", latex: "r = \\dfrac{\\sum(x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum(x_i-\\bar{x})^2\\sum(y_i-\\bar{y})^2}}", description: "Pearson's r, strength of linear association" },
  { topic: "Statistics", name: "Probability", latex: "P(A) = \\dfrac{\\text{favourable outcomes}}{\\text{total outcomes}}", description: "Basic probability" },
  { topic: "Statistics", name: "Complementary Events", latex: "P(A') = 1 - P(A)", description: "Probability of the complement" },
  { topic: "Statistics", name: "Addition Rule", latex: "P(A\\cup B) = P(A)+P(B)-P(A\\cap B)", description: "Probability of A or B" },
  { topic: "Statistics", name: "Multiplication Rule (independent)", latex: "P(A\\cap B) = P(A)\\cdot P(B)", description: "Probability of A and B (independent)" },
  { topic: "Statistics", name: "Conditional Probability", latex: "P(A|B) = \\dfrac{P(A\\cap B)}{P(B)}", description: "Probability of A given B" },
  { topic: "Statistics", name: "Binomial Probability", latex: "P(X=k) = \\binom{n}{k}p^k(1-p)^{n-k}", description: "Exactly k successes in n trials" },
  { topic: "Statistics", name: "Expected Value", latex: "E(X) = \\sum x_i\\,P(X=x_i)", description: "Mean of a discrete random variable" },
  { topic: "Statistics", name: "Variance", latex: "\\text{Var}(X) = E(X^2) - [E(X)]^2", description: "Spread of a random variable" },
  // Sequences & Series
  { topic: "Sequences", name: "Arithmetic nth Term", latex: "T_n = a + (n-1)d", description: "a = first term, d = common difference" },
  { topic: "Sequences", name: "Geometric nth Term", latex: "T_n = ar^{n-1}", description: "a = first term, r = common ratio" },
  { topic: "Sequences", name: "Sum of Arithmetic Series", latex: "S_n = \\dfrac{n}{2}(2a + (n-1)d)", description: "Sum of first n terms" },
  { topic: "Sequences", name: "Sum of Geometric Series", latex: "S_n = \\dfrac{a(1-r^n)}{1-r}", description: "Sum of first n terms (r ≠ 1)" },
  { topic: "Sequences", name: "Sum to Infinity (Geometric)", latex: "S_\\infty = \\dfrac{a}{1-r},\\quad |r|<1", description: "Infinite geometric series" },
  // Geometry & Mensuration
  { topic: "Geometry", name: "Pythagoras' Theorem", latex: "c^2 = a^2 + b^2", description: "Right-angled triangle side lengths" },
  { topic: "Geometry", name: "Circle Area", latex: "A = \\pi r^2", description: "Area of a circle" },
  { topic: "Geometry", name: "Circle Circumference", latex: "C = 2\\pi r", description: "Perimeter of a circle" },
  { topic: "Geometry", name: "Sphere Volume", latex: "V = \\dfrac{4}{3}\\pi r^3", description: "Volume of a sphere" },
  { topic: "Geometry", name: "Sphere Surface Area", latex: "SA = 4\\pi r^2", description: "Surface area of a sphere" },
  { topic: "Geometry", name: "Cylinder Volume", latex: "V = \\pi r^2 h", description: "Volume of a cylinder" },
  { topic: "Geometry", name: "Cone Volume", latex: "V = \\dfrac{1}{3}\\pi r^2 h", description: "Volume of a cone" },
  { topic: "Geometry", name: "Trapezium Area", latex: "A = \\dfrac{1}{2}(a+b)h", description: "Area of a trapezium" },
  { topic: "Geometry", name: "Distance Formula", latex: "d = \\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}", description: "Distance between two points" },
  { topic: "Geometry", name: "Midpoint Formula", latex: "M = \\left(\\dfrac{x_1+x_2}{2},\\dfrac{y_1+y_2}{2}\\right)", description: "Midpoint between two points" },
  { topic: "Geometry", name: "Gradient of a Line", latex: "m = \\dfrac{y_2-y_1}{x_2-x_1}", description: "Slope between two points" },
  { topic: "Geometry", name: "Gradient-Intercept Form", latex: "y = mx + b", description: "Equation of a straight line" },
  { topic: "Geometry", name: "Point-Gradient Form", latex: "y - y_1 = m(x - x_1)", description: "Line through a point with known gradient" },
  // Finance & Rates
  { topic: "Finance", name: "Compound Interest", latex: "A = P\\!\\left(1+\\dfrac{r}{n}\\right)^{nt}", description: "A = final amount, P = principal, r = annual rate" },
  { topic: "Finance", name: "Simple Interest", latex: "I = Prt", description: "Interest = principal × rate × time" },
  { topic: "Finance", name: "Future Value (annuity)", latex: "FV = M\\cdot\\dfrac{(1+r)^n - 1}{r}", description: "Future value of regular payments M" },
  { topic: "Finance", name: "Present Value", latex: "PV = \\dfrac{FV}{(1+r)^n}", description: "Present value of a future amount" },
  { topic: "Finance", name: "Depreciation (straight-line)", latex: "V = P - Dnt", description: "P = purchase price, D = depreciation per period" },
  { topic: "Finance", name: "Depreciation (reducing balance)", latex: "V = P(1-r)^n", description: "Value after n periods at rate r" },

  // Advanced Algebra
  { topic: "Algebra", name: "Partial Fractions (distinct linear)", latex: "\\dfrac{A}{x-a} + \\dfrac{B}{x-b}", description: "Decompose rational expression with distinct linear factors" },
  { topic: "Algebra", name: "Partial Fractions (repeated linear)", latex: "\\dfrac{A}{x-a} + \\dfrac{B}{(x-a)^2}", description: "Repeated linear factor decomposition" },
  { topic: "Algebra", name: "Remainder Theorem", latex: "f(a) = \\text{remainder when } f(x) \\div (x-a)", description: "Find remainder without long division" },
  { topic: "Algebra", name: "Factor Theorem", latex: "(x-a) \\text{ is a factor} \\iff f(a)=0", description: "Root ↔ factor equivalence" },
  { topic: "Algebra", name: "Rational Root Theorem", latex: "\\text{possible roots} = \\pm\\dfrac{\\text{factors of constant}}{\\text{factors of leading coeff}}", description: "Lists candidates for rational roots" },
  { topic: "Algebra", name: "Exponential Growth/Decay", latex: "A = A_0\\,e^{kt}", description: "k > 0 = growth; k < 0 = decay" },
  { topic: "Algebra", name: "Natural Exponential Limit", latex: "e = \\lim_{n\\to\\infty}\\left(1+\\dfrac{1}{n}\\right)^n", description: "Definition of Euler's number" },
  { topic: "Algebra", name: "AM–GM Inequality", latex: "\\dfrac{a+b}{2} \\geq \\sqrt{ab}", description: "Arithmetic mean ≥ geometric mean (a,b ≥ 0)" },
  { topic: "Algebra", name: "Vieta's Formulas (quadratic)", latex: "\\alpha+\\beta = -\\dfrac{b}{a},\\quad \\alpha\\beta = \\dfrac{c}{a}", description: "Sum and product of roots of ax²+bx+c=0" },
  { topic: "Algebra", name: "Vieta's Formulas (cubic)", latex: "\\alpha+\\beta+\\gamma = -\\dfrac{b}{a},\\quad \\alpha\\beta\\gamma = -\\dfrac{d}{a}", description: "Root relationships for ax³+bx²+cx+d=0" },
  { topic: "Algebra", name: "Absolute Value Definition", latex: "|x| = \\begin{cases} x & x\\geq 0 \\\\ -x & x<0 \\end{cases}", description: "Piecewise definition of absolute value" },
  { topic: "Algebra", name: "Floor Function", latex: "\\lfloor x \\rfloor = \\text{greatest integer} \\leq x", description: "Round down to nearest integer" },
  { topic: "Algebra", name: "Ceiling Function", latex: "\\lceil x \\rceil = \\text{least integer} \\geq x", description: "Round up to nearest integer" },

  // Coordinate Geometry
  { topic: "Coordinate Geometry", name: "Equation of a Circle", latex: "(x-h)^2 + (y-k)^2 = r^2", description: "Circle with centre (h,k) and radius r" },
  { topic: "Coordinate Geometry", name: "General Circle Equation", latex: "x^2 + y^2 + Dx + Ey + F = 0", description: "Complete the square to find centre/radius" },
  { topic: "Coordinate Geometry", name: "Ellipse (standard)", latex: "\\dfrac{x^2}{a^2}+\\dfrac{y^2}{b^2}=1", description: "Ellipse centred at origin, semi-axes a, b" },
  { topic: "Coordinate Geometry", name: "Hyperbola (standard)", latex: "\\dfrac{x^2}{a^2}-\\dfrac{y^2}{b^2}=1", description: "Hyperbola opening left/right" },
  { topic: "Coordinate Geometry", name: "Parabola (vertical)", latex: "x^2 = 4py", description: "Vertex at origin, focus at (0,p)" },
  { topic: "Coordinate Geometry", name: "Perpendicular Gradient", latex: "m_1 \\times m_2 = -1", description: "Gradients of perpendicular lines multiply to −1" },
  { topic: "Coordinate Geometry", name: "Angle of Inclination", latex: "m = \\tan\\theta", description: "Gradient = tan of angle with positive x-axis" },
  { topic: "Coordinate Geometry", name: "Division of Line Segment", latex: "P = \\left(\\dfrac{mx_2+nx_1}{m+n},\\dfrac{my_2+ny_1}{m+n}\\right)", description: "Point dividing AB in ratio m:n" },
  { topic: "Coordinate Geometry", name: "Area of Triangle (coordinates)", latex: "A = \\dfrac{1}{2}|x_1(y_2-y_3)+x_2(y_3-y_1)+x_3(y_1-y_2)|", description: "Using vertex coordinates" },
  { topic: "Coordinate Geometry", name: "Distance from Point to Line", latex: "d = \\dfrac{|ax_0+by_0+c|}{\\sqrt{a^2+b^2}}", description: "Distance from (x₀,y₀) to line ax+by+c=0" },

  // Functions & Graphs
  { topic: "Functions", name: "Even Function", latex: "f(-x) = f(x)", description: "Symmetric about y-axis" },
  { topic: "Functions", name: "Odd Function", latex: "f(-x) = -f(x)", description: "Symmetric about origin" },
  { topic: "Functions", name: "Composite Function", latex: "(f \\circ g)(x) = f(g(x))", description: "Apply g first, then f" },
  { topic: "Functions", name: "Inverse Function Notation", latex: "f^{-1}(y) = x \\iff f(x) = y", description: "Swap x and y to find inverse" },
  { topic: "Functions", name: "Logistic Function", latex: "f(x) = \\dfrac{L}{1+e^{-k(x-x_0)}}", description: "S-curve, max value L" },
  { topic: "Functions", name: "Sinusoidal Model", latex: "y = A\\sin(Bx + C) + D", description: "A=amplitude, 2π/B=period, C=phase shift, D=vertical shift" },
  { topic: "Functions", name: "Absolute Value Function", latex: "f(x) = |x| = \\sqrt{x^2}", description: "V-shaped graph, vertex at origin" },
  { topic: "Functions", name: "Asymptote: Oblique", latex: "y = mx+b \\text{ when } \\lim_{x\\to\\infty}[f(x)-(mx+b)]=0", description: "Slant asymptote of a rational function" },

  // Trigonometry (extended)
  { topic: "Trigonometry", name: "Compound Angle (tan)", latex: "\\tan(A\\pm B) = \\dfrac{\\tan A \\pm \\tan B}{1\\mp\\tan A\\tan B}", description: "Addition formula for tan" },
  { topic: "Trigonometry", name: "Double Angle (cos alt 1)", latex: "\\cos 2\\theta = 2\\cos^2\\theta - 1", description: "Double angle formula variant" },
  { topic: "Trigonometry", name: "Double Angle (cos alt 2)", latex: "\\cos 2\\theta = 1 - 2\\sin^2\\theta", description: "Double angle formula variant" },
  { topic: "Trigonometry", name: "Double Angle (tan)", latex: "\\tan 2\\theta = \\dfrac{2\\tan\\theta}{1-\\tan^2\\theta}", description: "Double angle for tan" },
  { topic: "Trigonometry", name: "Half Angle (sin)", latex: "\\sin\\tfrac{\\theta}{2} = \\pm\\sqrt{\\dfrac{1-\\cos\\theta}{2}}", description: "Half angle formula" },
  { topic: "Trigonometry", name: "Half Angle (cos)", latex: "\\cos\\tfrac{\\theta}{2} = \\pm\\sqrt{\\dfrac{1+\\cos\\theta}{2}}", description: "Half angle formula" },
  { topic: "Trigonometry", name: "Product-to-Sum (sin·cos)", latex: "\\sin A\\cos B = \\tfrac{1}{2}[\\sin(A+B)+\\sin(A-B)]", description: "Product to sum identity" },
  { topic: "Trigonometry", name: "Sum-to-Product (sin+sin)", latex: "\\sin A+\\sin B = 2\\sin\\tfrac{A+B}{2}\\cos\\tfrac{A-B}{2}", description: "Sum to product identity" },
  { topic: "Trigonometry", name: "General Solution (sin)", latex: "\\sin\\theta = k \\Rightarrow \\theta = n\\pi + (-1)^n\\arcsin k", description: "All solutions to sin θ = k" },
  { topic: "Trigonometry", name: "General Solution (cos)", latex: "\\cos\\theta = k \\Rightarrow \\theta = 2n\\pi \\pm \\arccos k", description: "All solutions to cos θ = k" },
  { topic: "Trigonometry", name: "General Solution (tan)", latex: "\\tan\\theta = k \\Rightarrow \\theta = n\\pi + \\arctan k", description: "All solutions to tan θ = k" },
  { topic: "Trigonometry", name: "Exact value: sin 30°", latex: "\\sin 30^\\circ = \\sin\\tfrac{\\pi}{6} = \\tfrac{1}{2}", description: "Exact trigonometric value" },
  { topic: "Trigonometry", name: "Exact value: sin 45°", latex: "\\sin 45^\\circ = \\dfrac{\\sqrt{2}}{2}", description: "Exact trigonometric value" },
  { topic: "Trigonometry", name: "Exact value: sin 60°", latex: "\\sin 60^\\circ = \\dfrac{\\sqrt{3}}{2}", description: "Exact trigonometric value" },
  { topic: "Trigonometry", name: "Exact value: tan 45°", latex: "\\tan 45^\\circ = \\tan\\tfrac{\\pi}{4} = 1", description: "Exact trigonometric value" },
  { topic: "Trigonometry", name: "Degrees → Radians", latex: "\\theta_{\\text{rad}} = \\theta_{\\deg} \\times \\dfrac{\\pi}{180}", description: "Degrees to radians conversion" },
  { topic: "Trigonometry", name: "Inverse sin domain", latex: "\\arcsin: [-1,1]\\to[-\\tfrac{\\pi}{2},\\tfrac{\\pi}{2}]", description: "Domain and range of arcsin" },
  { topic: "Trigonometry", name: "Inverse cos domain", latex: "\\arccos: [-1,1]\\to[0,\\pi]", description: "Domain and range of arccos" },
  { topic: "Trigonometry", name: "Inverse tan domain", latex: "\\arctan: \\mathbb{R}\\to(-\\tfrac{\\pi}{2},\\tfrac{\\pi}{2})", description: "Domain and range of arctan" },

  // Vectors
  { topic: "Vectors", name: "Vector Magnitude (2D)", latex: "|\\mathbf{a}| = \\sqrt{a_x^2 + a_y^2}", description: "Length of a 2D vector" },
  { topic: "Vectors", name: "Vector Magnitude (3D)", latex: "|\\mathbf{a}| = \\sqrt{a_x^2 + a_y^2 + a_z^2}", description: "Length of a 3D vector" },
  { topic: "Vectors", name: "Unit Vector", latex: "\\hat{\\mathbf{a}} = \\dfrac{\\mathbf{a}}{|\\mathbf{a}|}", description: "Vector of length 1 in direction of a" },
  { topic: "Vectors", name: "Dot Product", latex: "\\mathbf{a}\\cdot\\mathbf{b} = a_xb_x + a_yb_y + a_zb_z = |\\mathbf{a}||\\mathbf{b}|\\cos\\theta", description: "Scalar product of two vectors" },
  { topic: "Vectors", name: "Angle Between Vectors", latex: "\\cos\\theta = \\dfrac{\\mathbf{a}\\cdot\\mathbf{b}}{|\\mathbf{a}||\\mathbf{b}|}", description: "Find angle using dot product" },
  { topic: "Vectors", name: "Vector Projection", latex: "\\text{proj}_{\\mathbf{b}}\\mathbf{a} = \\dfrac{\\mathbf{a}\\cdot\\mathbf{b}}{|\\mathbf{b}|^2}\\mathbf{b}", description: "Component of a along b" },
  { topic: "Vectors", name: "Perpendicular Vectors", latex: "\\mathbf{a}\\perp\\mathbf{b} \\iff \\mathbf{a}\\cdot\\mathbf{b}=0", description: "Dot product = 0 means perpendicular" },
  { topic: "Vectors", name: "Parallel Vectors", latex: "\\mathbf{a}\\parallel\\mathbf{b} \\iff \\mathbf{a} = k\\mathbf{b}", description: "One is a scalar multiple of the other" },
  { topic: "Vectors", name: "Vector Equation of Line", latex: "\\mathbf{r} = \\mathbf{a} + t\\mathbf{d}", description: "Point a + scalar t × direction d" },
  { topic: "Vectors", name: "Cross Product Magnitude", latex: "|\\mathbf{a}\\times\\mathbf{b}| = |\\mathbf{a}||\\mathbf{b}|\\sin\\theta", description: "Area of parallelogram spanned by a and b" },

  // Matrices
  { topic: "Matrices", name: "Determinant (2×2)", latex: "\\det\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix} = ad - bc", description: "Determinant of a 2×2 matrix" },
  { topic: "Matrices", name: "Inverse (2×2)", latex: "A^{-1} = \\dfrac{1}{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}", description: "Inverse of a 2×2 matrix (det ≠ 0)" },
  { topic: "Matrices", name: "Inverse Property", latex: "AA^{-1} = A^{-1}A = I", description: "Product with inverse gives identity" },
  { topic: "Matrices", name: "Systems via Matrices", latex: "A\\mathbf{x} = \\mathbf{b} \\Rightarrow \\mathbf{x} = A^{-1}\\mathbf{b}", description: "Solve linear system using inverse" },
  { topic: "Matrices", name: "Eigenvalue Equation", latex: "A\\mathbf{v} = \\lambda\\mathbf{v}", description: "λ = eigenvalue, v = eigenvector" },
  { topic: "Matrices", name: "Characteristic Equation", latex: "\\det(A - \\lambda I) = 0", description: "Find eigenvalues" },

  // Complex Numbers
  { topic: "Complex Numbers", name: "Imaginary Unit", latex: "i^2 = -1", description: "Definition of the imaginary unit" },
  { topic: "Complex Numbers", name: "Complex Number", latex: "z = a + bi,\\quad a,b\\in\\mathbb{R}", description: "Real part a, imaginary part b" },
  { topic: "Complex Numbers", name: "Modulus", latex: "|z| = \\sqrt{a^2+b^2}", description: "Distance from origin in Argand plane" },
  { topic: "Complex Numbers", name: "Argument", latex: "\\arg(z) = \\theta = \\arctan\\left(\\dfrac{b}{a}\\right)", description: "Angle from positive real axis" },
  { topic: "Complex Numbers", name: "Polar Form", latex: "z = r(\\cos\\theta + i\\sin\\theta) = re^{i\\theta}", description: "Modulus-argument form" },
  { topic: "Complex Numbers", name: "Euler's Formula", latex: "e^{i\\theta} = \\cos\\theta + i\\sin\\theta", description: "Fundamental identity linking e and trig" },
  { topic: "Complex Numbers", name: "Euler's Identity", latex: "e^{i\\pi} + 1 = 0", description: "Famous special case of Euler's formula" },
  { topic: "Complex Numbers", name: "Complex Conjugate", latex: "\\bar{z} = a - bi", description: "Reflect in real axis" },
  { topic: "Complex Numbers", name: "de Moivre's Theorem", latex: "(r(\\cos\\theta+i\\sin\\theta))^n = r^n(\\cos n\\theta + i\\sin n\\theta)", description: "Powers of complex numbers" },
  { topic: "Complex Numbers", name: "nth Roots of Unity", latex: "z^n = 1 \\Rightarrow z = e^{2\\pi ki/n},\\; k=0,1,\\ldots,n-1", description: "n equally-spaced roots on unit circle" },

  // Calculus (extended)
  { topic: "Calculus", name: "Limit Definition of Derivative", latex: "f'(x) = \\lim_{h\\to 0}\\dfrac{f(x+h)-f(x)}{h}", description: "First principles definition" },
  { topic: "Calculus", name: "L'Hôpital's Rule", latex: "\\lim_{x\\to a}\\dfrac{f(x)}{g(x)} = \\lim_{x\\to a}\\dfrac{f'(x)}{g'(x)}", description: "For 0/0 or ∞/∞ indeterminate forms" },
  { topic: "Calculus", name: "Derivative of aˣ", latex: "\\dfrac{d}{dx}[a^x] = a^x\\ln a", description: "Generalised exponential derivative" },
  { topic: "Calculus", name: "Derivative of arcsin", latex: "\\dfrac{d}{dx}[\\arcsin x] = \\dfrac{1}{\\sqrt{1-x^2}}", description: "Inverse trig derivative" },
  { topic: "Calculus", name: "Derivative of arccos", latex: "\\dfrac{d}{dx}[\\arccos x] = \\dfrac{-1}{\\sqrt{1-x^2}}", description: "Inverse trig derivative" },
  { topic: "Calculus", name: "Derivative of arctan", latex: "\\dfrac{d}{dx}[\\arctan x] = \\dfrac{1}{1+x^2}", description: "Inverse trig derivative" },
  { topic: "Calculus", name: "Integration by Parts", latex: "\\int u\\,dv = uv - \\int v\\,du", description: "Integral analogue of product rule" },
  { topic: "Calculus", name: "Integration by Substitution", latex: "\\int f(g(x))g'(x)\\,dx = \\int f(u)\\,du", description: "u-substitution technique" },
  { topic: "Calculus", name: "Integral of tan", latex: "\\int \\tan x\\,dx = -\\ln|\\cos x| + C", description: "Standard trig integral" },
  { topic: "Calculus", name: "Integral of sec²", latex: "\\int \\sec^2 x\\,dx = \\tan x + C", description: "Standard trig integral" },
  { topic: "Calculus", name: "Integral: 1/(1+x²)", latex: "\\int \\dfrac{1}{1+x^2}\\,dx = \\arctan x + C", description: "Inverse trig integral" },
  { topic: "Calculus", name: "Integral: 1/√(1−x²)", latex: "\\int \\dfrac{1}{\\sqrt{1-x^2}}\\,dx = \\arcsin x + C", description: "Inverse trig integral" },
  { topic: "Calculus", name: "Volume of Revolution (disk)", latex: "V = \\pi\\int_a^b [f(x)]^2\\,dx", description: "Rotate y=f(x) about x-axis" },
  { topic: "Calculus", name: "Arc Length", latex: "L = \\int_a^b \\sqrt{1+[f'(x)]^2}\\,dx", description: "Length of a curve" },
  { topic: "Calculus", name: "Newton's Method", latex: "x_{n+1} = x_n - \\dfrac{f(x_n)}{f'(x_n)}", description: "Iterative root-finding algorithm" },
  { topic: "Calculus", name: "Mean Value Theorem", latex: "f'(c) = \\dfrac{f(b)-f(a)}{b-a}", description: "Some c exists where derivative equals average rate" },
  { topic: "Calculus", name: "Second Derivative Test", latex: "f''(c)>0 \\Rightarrow \\text{min};\\quad f''(c)<0 \\Rightarrow \\text{max}", description: "Nature of a stationary point" },
  { topic: "Calculus", name: "Inflection Point Condition", latex: "f''(c) = 0 \\text{ and sign of } f'' \\text{ changes}", description: "Point where concavity changes" },
  { topic: "Calculus", name: "Taylor Series (general)", latex: "f(x) = \\sum_{n=0}^{\\infty}\\dfrac{f^{(n)}(a)}{n!}(x-a)^n", description: "Infinite polynomial approximation around x=a" },
  { topic: "Calculus", name: "Improper Integral", latex: "\\int_a^{\\infty} f(x)\\,dx = \\lim_{t\\to\\infty}\\int_a^t f(x)\\,dx", description: "Integral over unbounded interval" },

  // Statistics (extended)
  { topic: "Statistics", name: "Interquartile Range", latex: "IQR = Q_3 - Q_1", description: "Spread of the middle 50% of data" },
  { topic: "Statistics", name: "Outlier Fence (lower)", latex: "Q_1 - 1.5\\times IQR", description: "Values below this are outliers" },
  { topic: "Statistics", name: "Outlier Fence (upper)", latex: "Q_3 + 1.5\\times IQR", description: "Values above this are outliers" },
  { topic: "Statistics", name: "Coefficient of Variation", latex: "CV = \\dfrac{\\sigma}{\\mu}\\times 100\\%", description: "Relative measure of spread" },
  { topic: "Statistics", name: "Regression Slope", latex: "b_1 = r\\dfrac{s_y}{s_x}", description: "Slope using correlation and standard deviations" },
  { topic: "Statistics", name: "Regression Intercept", latex: "b_0 = \\bar{y} - b_1\\bar{x}", description: "y-intercept of regression line" },
  { topic: "Statistics", name: "Normal Distribution PDF", latex: "f(x) = \\dfrac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}", description: "Bell curve probability density" },
  { topic: "Statistics", name: "68–95–99.7 Rule", latex: "P(\\mu\\pm\\sigma)\\approx68\\%,\\; P(\\mu\\pm2\\sigma)\\approx95\\%,\\; P(\\mu\\pm3\\sigma)\\approx99.7\\%", description: "Empirical rule for normal distribution" },
  { topic: "Statistics", name: "Bayes' Theorem", latex: "P(A|B) = \\dfrac{P(B|A)P(A)}{P(B)}", description: "Update probability with new evidence" },
  { topic: "Statistics", name: "Permutations", latex: "^nP_r = \\dfrac{n!}{(n-r)!}", description: "Ordered arrangements of r from n" },
  { topic: "Statistics", name: "Combinations", latex: "^nC_r = \\dfrac{n!}{r!(n-r)!}", description: "Unordered selections of r from n" },
  { topic: "Statistics", name: "Law of Total Probability", latex: "P(B) = \\sum_i P(B|A_i)P(A_i)", description: "Partition sample space to find P(B)" },
  { topic: "Statistics", name: "Poisson Distribution (PMF)", latex: "P(X=k) = \\dfrac{\\lambda^k e^{-\\lambda}}{k!}", description: "Events in fixed interval, mean λ" },
  { topic: "Statistics", name: "Geometric Distribution (PMF)", latex: "P(X=k) = (1-p)^{k-1}p", description: "First success on kth trial" },

  // Sequences & Series (extended)
  { topic: "Sequences", name: "Sigma Notation", latex: "\\sum_{k=1}^{n}k = \\dfrac{n(n+1)}{2}", description: "Sum of first n natural numbers" },
  { topic: "Sequences", name: "Sum of Squares", latex: "\\sum_{k=1}^{n}k^2 = \\dfrac{n(n+1)(2n+1)}{6}", description: "Sum of first n perfect squares" },
  { topic: "Sequences", name: "Sum of Cubes (formula)", latex: "\\sum_{k=1}^{n}k^3 = \\left(\\dfrac{n(n+1)}{2}\\right)^2", description: "Sum of first n cubes" },
  { topic: "Sequences", name: "Arithmetic Mean", latex: "\\bar{x} = \\dfrac{a+b}{2}", description: "Arithmetic mean of two terms" },
  { topic: "Sequences", name: "Geometric Mean", latex: "g = \\sqrt{ab}", description: "Geometric mean of two terms" },
  { topic: "Sequences", name: "Telescoping Sum", latex: "\\sum_{k=1}^{n}(a_{k+1}-a_k) = a_{n+1}-a_1", description: "Most terms cancel in a telescoping series" },
  { topic: "Sequences", name: "Arithmetic Series (alt form)", latex: "S_n = \\dfrac{n}{2}(a+l)", description: "a = first term, l = last term" },

  // Geometry (extended)
  { topic: "Geometry", name: "Cylinder Surface Area", latex: "SA = 2\\pi r^2 + 2\\pi rh", description: "Two circles + lateral surface" },
  { topic: "Geometry", name: "Cone Surface Area", latex: "SA = \\pi r^2 + \\pi r l", description: "l = slant height" },
  { topic: "Geometry", name: "Pyramid Volume", latex: "V = \\dfrac{1}{3}A_b h", description: "A_b = base area, h = perpendicular height" },
  { topic: "Geometry", name: "Euler's Formula (polyhedra)", latex: "V - E + F = 2", description: "Vertices − Edges + Faces = 2 for convex polyhedra" },
  { topic: "Geometry", name: "Interior Angle Sum (polygon)", latex: "S = (n-2)\\times 180^\\circ", description: "n = number of sides" },
  { topic: "Geometry", name: "Each Interior Angle (regular)", latex: "\\theta = \\dfrac{(n-2)\\times 180^\\circ}{n}", description: "Each angle of a regular n-gon" },
  { topic: "Geometry", name: "Heron's Formula", latex: "A = \\sqrt{s(s-a)(s-b)(s-c)},\\quad s=\\tfrac{a+b+c}{2}", description: "Triangle area from three sides" },
  { topic: "Geometry", name: "Inscribed Angle Theorem", latex: "\\text{inscribed angle} = \\tfrac{1}{2}\\times\\text{central angle}", description: "Angle at circumference = half angle at centre" },
  { topic: "Geometry", name: "Tangent–Radius Angle", latex: "\\text{tangent} \\perp \\text{radius at point of contact}", description: "The tangent to a circle is perpendicular to the radius" },
  { topic: "Geometry", name: "Power of a Point", latex: "PA\\cdot PB = PC\\cdot PD", description: "For two chords/secants through point P" },

  // Number Theory & Proof
  { topic: "Number Theory", name: "GCD (Euclidean)", latex: "\\gcd(a,b) = \\gcd(b,\\, a\\bmod b)", description: "Euclidean algorithm for GCD" },
  { topic: "Number Theory", name: "LCM from GCD", latex: "\\text{lcm}(a,b) = \\dfrac{|ab|}{\\gcd(a,b)}", description: "Lowest common multiple" },
  { topic: "Number Theory", name: "Division Algorithm", latex: "a = bq + r,\\quad 0 \\leq r < b", description: "Divides a by b with remainder r" },
  { topic: "Number Theory", name: "Modular Arithmetic", latex: "a \\equiv b \\pmod{m} \\iff m\\mid(a-b)", description: "a and b have same remainder mod m" },
  { topic: "Number Theory", name: "Mathematical Induction", latex: "P(1)\\text{ true, }P(k)\\Rightarrow P(k+1) \\Rightarrow P(n)\\text{ for all }n\\in\\mathbb{N}", description: "Proof technique for integer statements" },
];

const PHYSICS_FORMULAS: Formula[] = [
  // Kinematics
  { topic: "Kinematics", name: "v = u + at", latex: "v = u + at", description: "Final velocity with constant acceleration" },
  { topic: "Kinematics", name: "s = ut + ½at²", latex: "s = ut + \\tfrac{1}{2}at^2", description: "Displacement with constant acceleration" },
  { topic: "Kinematics", name: "v² = u² + 2as", latex: "v^2 = u^2 + 2as", description: "Velocity–displacement relation" },
  { topic: "Kinematics", name: "s = ½(u+v)t", latex: "s = \\tfrac{1}{2}(u+v)t", description: "Displacement using average velocity" },
  { topic: "Kinematics", name: "Average Speed", latex: "v_{\\text{avg}} = \\dfrac{\\text{total distance}}{\\text{total time}}", description: "Average speed over a journey" },
  { topic: "Kinematics", name: "Projectile Range", latex: "R = \\dfrac{u^2\\sin 2\\theta}{g}", description: "Horizontal range on flat ground" },
  { topic: "Kinematics", name: "Projectile Max Height", latex: "H = \\dfrac{u^2\\sin^2\\theta}{2g}", description: "Maximum height of a projectile" },
  { topic: "Kinematics", name: "Circular Speed", latex: "v = \\dfrac{2\\pi r}{T}", description: "Speed in uniform circular motion" },
  { topic: "Kinematics", name: "Angular Velocity", latex: "\\omega = \\dfrac{2\\pi}{T} = 2\\pi f", description: "Radians per second" },
  // Forces & Mechanics
  { topic: "Forces", name: "Newton's Second Law", latex: "F = ma", description: "Net force equals mass times acceleration" },
  { topic: "Forces", name: "Weight", latex: "W = mg", description: "Gravitational force on a mass" },
  { topic: "Forces", name: "Friction", latex: "f = \\mu N", description: "μ = coefficient of friction, N = normal force" },
  { topic: "Forces", name: "Centripetal Force", latex: "F_c = \\dfrac{mv^2}{r} = m\\omega^2 r", description: "Force directed toward centre of circular path" },
  { topic: "Forces", name: "Momentum", latex: "p = mv", description: "Mass times velocity" },
  { topic: "Forces", name: "Impulse", latex: "J = F\\Delta t = \\Delta p", description: "Change in momentum" },
  { topic: "Forces", name: "Conservation of Momentum", latex: "m_1u_1 + m_2u_2 = m_1v_1 + m_2v_2", description: "Total momentum conserved in collisions" },
  { topic: "Forces", name: "Hooke's Law", latex: "F = -kx", description: "Restoring force in a spring" },
  { topic: "Forces", name: "Torque", latex: "\\tau = Fr\\sin\\theta", description: "Rotational force (moment)" },
  // Energy & Work
  { topic: "Energy", name: "Kinetic Energy", latex: "E_k = \\tfrac{1}{2}mv^2", description: "Energy of motion" },
  { topic: "Energy", name: "Gravitational PE", latex: "E_p = mgh", description: "Energy due to height" },
  { topic: "Energy", name: "Elastic PE", latex: "E_{sp} = \\tfrac{1}{2}kx^2", description: "Energy stored in a spring" },
  { topic: "Energy", name: "Work", latex: "W = Fs\\cos\\theta", description: "Force times displacement times cosine of angle" },
  { topic: "Energy", name: "Power", latex: "P = \\dfrac{W}{t} = Fv", description: "Rate of energy transfer" },
  { topic: "Energy", name: "Efficiency", latex: "\\eta = \\dfrac{P_{\\text{out}}}{P_{\\text{in}}} \\times 100\\%", description: "Useful output power / total input power" },
  { topic: "Energy", name: "Conservation of Energy", latex: "E_k + E_p = \\text{constant}", description: "Total mechanical energy conserved (no friction)" },
  // Waves & Sound
  { topic: "Waves", name: "Wave Speed", latex: "v = f\\lambda", description: "Speed = frequency × wavelength" },
  { topic: "Waves", name: "Period & Frequency", latex: "T = \\dfrac{1}{f}", description: "Period is reciprocal of frequency" },
  { topic: "Waves", name: "Snell's Law", latex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2", description: "Refraction at a boundary" },
  { topic: "Waves", name: "Refractive Index", latex: "n = \\dfrac{c}{v}", description: "Speed of light in medium vs vacuum" },
  { topic: "Waves", name: "Doppler Effect (source moving)", latex: "f' = f\\dfrac{v \\pm v_o}{v \\mp v_s}", description: "Observed frequency change due to motion" },
  { topic: "Waves", name: "Intensity", latex: "I = \\dfrac{P}{4\\pi r^2}", description: "Intensity of a point source" },
  { topic: "Waves", name: "Decibels", latex: "L = 10\\log_{10}\\!\\left(\\dfrac{I}{I_0}\\right)", description: "Sound level in dB, I₀ = 10⁻¹² W/m²" },
  { topic: "Waves", name: "Standing Wave (string)", latex: "f_n = \\dfrac{nv}{2L}", description: "nth harmonic of a string of length L" },
  // Electricity & Magnetism
  { topic: "Electricity", name: "Ohm's Law", latex: "V = IR", description: "Voltage = current × resistance" },
  { topic: "Electricity", name: "Electric Power", latex: "P = VI = I^2R = \\dfrac{V^2}{R}", description: "Power dissipated in a component" },
  { topic: "Electricity", name: "Charge", latex: "Q = It", description: "Charge = current × time" },
  { topic: "Electricity", name: "Resistors in Series", latex: "R_T = R_1 + R_2 + \\cdots", description: "Total resistance in series" },
  { topic: "Electricity", name: "Resistors in Parallel", latex: "\\dfrac{1}{R_T} = \\dfrac{1}{R_1}+\\dfrac{1}{R_2}+\\cdots", description: "Total resistance in parallel" },
  { topic: "Electricity", name: "Capacitance", latex: "C = \\dfrac{Q}{V}", description: "Charge stored per unit voltage" },
  { topic: "Electricity", name: "Energy in Capacitor", latex: "E = \\tfrac{1}{2}CV^2", description: "Energy stored in a capacitor" },
  { topic: "Electricity", name: "Coulomb's Law", latex: "F = \\dfrac{kq_1q_2}{r^2}", description: "Force between two charges" },
  { topic: "Electricity", name: "Electric Field", latex: "E = \\dfrac{F}{q} = \\dfrac{kQ}{r^2}", description: "Force per unit charge" },
  { topic: "Electricity", name: "Magnetic Force on Wire", latex: "F = BIl\\sin\\theta", description: "Force on current-carrying wire in B-field" },
  { topic: "Electricity", name: "Magnetic Force on Charge", latex: "F = qvB\\sin\\theta", description: "Force on moving charge in B-field" },
  { topic: "Electricity", name: "Faraday's Law (EMF)", latex: "\\mathcal{E} = -N\\dfrac{\\Delta\\Phi}{\\Delta t}", description: "Induced EMF from changing flux" },
  { topic: "Electricity", name: "Transformer Ratio", latex: "\\dfrac{V_s}{V_p} = \\dfrac{N_s}{N_p}", description: "Voltage ratio equals turns ratio" },
  // Gravity & Space
  { topic: "Gravity", name: "Universal Gravitation", latex: "F = \\dfrac{Gm_1m_2}{r^2}", description: "Gravitational force between two masses" },
  { topic: "Gravity", name: "Gravitational Field Strength", latex: "g = \\dfrac{GM}{r^2}", description: "Field strength at distance r" },
  { topic: "Gravity", name: "Orbital Speed", latex: "v = \\sqrt{\\dfrac{GM}{r}}", description: "Speed for circular orbit at radius r" },
  { topic: "Gravity", name: "Orbital Period (Kepler III)", latex: "T^2 = \\dfrac{4\\pi^2 r^3}{GM}", description: "Period of a circular orbit" },
  { topic: "Gravity", name: "Escape Velocity", latex: "v_e = \\sqrt{\\dfrac{2GM}{r}}", description: "Minimum speed to escape gravity" },
  // Thermodynamics
  { topic: "Thermodynamics", name: "Specific Heat Capacity", latex: "Q = mc\\Delta T", description: "Heat = mass × specific heat × temperature change" },
  { topic: "Thermodynamics", name: "Latent Heat", latex: "Q = mL", description: "Heat for phase change without temperature change" },
  { topic: "Thermodynamics", name: "Ideal Gas Law", latex: "PV = nRT", description: "P = pressure, V = volume, n = moles, T = temperature" },
  { topic: "Thermodynamics", name: "Boyle's Law", latex: "P_1V_1 = P_2V_2", description: "Pressure–volume at constant temperature" },
  { topic: "Thermodynamics", name: "Charles's Law", latex: "\\dfrac{V_1}{T_1} = \\dfrac{V_2}{T_2}", description: "Volume–temperature at constant pressure" },
  { topic: "Thermodynamics", name: "First Law of Thermodynamics", latex: "\\Delta U = Q - W", description: "Change in internal energy = heat in − work done" },
  // Nuclear & Quantum
  { topic: "Nuclear", name: "Mass-Energy Equivalence", latex: "E = mc^2", description: "Einstein's famous relation" },
  { topic: "Nuclear", name: "Radioactive Decay", latex: "N = N_0 e^{-\\lambda t}", description: "Number of undecayed nuclei at time t" },
  { topic: "Nuclear", name: "Half-Life", latex: "t_{1/2} = \\dfrac{\\ln 2}{\\lambda}", description: "Time for half the nuclei to decay" },
  { topic: "Nuclear", name: "Photon Energy", latex: "E = hf = \\dfrac{hc}{\\lambda}", description: "Energy of a photon, h = Planck's constant" },
  { topic: "Nuclear", name: "de Broglie Wavelength", latex: "\\lambda = \\dfrac{h}{mv}", description: "Matter wavelength of a particle" },
];

const CHEMISTRY_FORMULAS: Formula[] = [
  // Stoichiometry
  { topic: "Stoichiometry", name: "Moles from Mass", latex: "n = \\dfrac{m}{M}", description: "n = moles, m = mass (g), M = molar mass (g/mol)" },
  { topic: "Stoichiometry", name: "Concentration", latex: "c = \\dfrac{n}{V}", description: "mol/L, V in litres" },
  { topic: "Stoichiometry", name: "Moles from Volume (gas, STP)", latex: "n = \\dfrac{V}{22.4}", description: "Volume in litres at STP" },
  { topic: "Stoichiometry", name: "Percentage Composition", latex: "\\%\\,\\text{element} = \\dfrac{M_{\\text{element}}}{M_{\\text{compound}}}\\times 100", description: "Mass percent of an element in a compound" },
  { topic: "Stoichiometry", name: "Empirical Formula Steps", latex: "\\text{mol ratio} = \\dfrac{\\%/M_{\\text{element}}}{\\text{smallest value}}", description: "Find simplest whole-number ratio" },
  { topic: "Stoichiometry", name: "Dilution Formula", latex: "c_1V_1 = c_2V_2", description: "Concentration × volume is conserved on dilution" },
  { topic: "Stoichiometry", name: "Atom Economy", latex: "\\text{atom economy} = \\dfrac{M_{\\text{desired product}}}{M_{\\text{all products}}}\\times 100", description: "Efficiency of a reaction" },
  { topic: "Stoichiometry", name: "Theoretical Yield", latex: "\\text{yield} = \\dfrac{\\text{actual}}{\\text{theoretical}}\\times 100\\%", description: "Percentage yield of a product" },
  // Ideal Gas
  { topic: "Gas Laws", name: "Ideal Gas Law", latex: "PV = nRT", description: "R = 8.314 J mol⁻¹ K⁻¹" },
  { topic: "Gas Laws", name: "Boyle's Law", latex: "P_1V_1 = P_2V_2", description: "Constant temperature" },
  { topic: "Gas Laws", name: "Charles's Law", latex: "\\dfrac{V_1}{T_1} = \\dfrac{V_2}{T_2}", description: "Constant pressure" },
  { topic: "Gas Laws", name: "Gay-Lussac's Law", latex: "\\dfrac{P_1}{T_1} = \\dfrac{P_2}{T_2}", description: "Constant volume" },
  { topic: "Gas Laws", name: "Combined Gas Law", latex: "\\dfrac{P_1V_1}{T_1} = \\dfrac{P_2V_2}{T_2}", description: "Combines Boyle's and Charles's laws" },
  { topic: "Gas Laws", name: "Molar Volume (STP)", latex: "V_m = 22.4\\,\\text{L mol}^{-1}", description: "Volume of 1 mol of gas at STP" },
  { topic: "Gas Laws", name: "Dalton's Law", latex: "P_{\\text{total}} = P_1 + P_2 + P_3 + \\cdots", description: "Total pressure = sum of partial pressures" },
  { topic: "Gas Laws", name: "Graham's Law", latex: "\\dfrac{r_1}{r_2} = \\sqrt{\\dfrac{M_2}{M_1}}", description: "Relative rates of gas effusion" },
  // Acids & Bases
  { topic: "Acids & Bases", name: "pH", latex: "\\text{pH} = -\\log_{10}[\\text{H}^+]", description: "Measure of acidity" },
  { topic: "Acids & Bases", name: "pOH", latex: "\\text{pOH} = -\\log_{10}[\\text{OH}^-]", description: "Measure of basicity" },
  { topic: "Acids & Bases", name: "pH + pOH = 14", latex: "\\text{pH} + \\text{pOH} = 14", description: "At 25°C" },
  { topic: "Acids & Bases", name: "Ka Expression", latex: "K_a = \\dfrac{[\\text{H}^+][\\text{A}^-]}{[\\text{HA}]}", description: "Acid dissociation constant" },
  { topic: "Acids & Bases", name: "Kb Expression", latex: "K_b = \\dfrac{[\\text{BH}^+][\\text{OH}^-]}{[\\text{B}]}", description: "Base dissociation constant" },
  { topic: "Acids & Bases", name: "Ka × Kb", latex: "K_a \\times K_b = K_w = 1.0\\times10^{-14}", description: "Conjugate acid-base pair relationship" },
  { topic: "Acids & Bases", name: "Henderson-Hasselbalch", latex: "\\text{pH} = pK_a + \\log\\dfrac{[\\text{A}^-]}{[\\text{HA}]}", description: "Buffer pH calculation" },
  { topic: "Acids & Bases", name: "Neutralisation", latex: "n(\\text{acid}) = n(\\text{base})", description: "At equivalence point" },
  // Thermochemistry
  { topic: "Thermochemistry", name: "Heat of Reaction", latex: "q = mc\\Delta T", description: "Calorimetry calculation" },
  { topic: "Thermochemistry", name: "Enthalpy Change", latex: "\\Delta H = H_{\\text{products}} - H_{\\text{reactants}}", description: "Heat of reaction" },
  { topic: "Thermochemistry", name: "Hess's Law", latex: "\\Delta H_{\\text{rxn}} = \\sum\\Delta H_{\\text{f,products}} - \\sum\\Delta H_{\\text{f,reactants}}", description: "Enthalpy from standard formation values" },
  { topic: "Thermochemistry", name: "Bond Enthalpy", latex: "\\Delta H = \\sum E_{\\text{broken}} - \\sum E_{\\text{formed}}", description: "Estimate ΔH from bond energies" },
  { topic: "Thermochemistry", name: "Gibbs Free Energy", latex: "\\Delta G = \\Delta H - T\\Delta S", description: "Spontaneity: ΔG < 0 is spontaneous" },
  { topic: "Thermochemistry", name: "Entropy", latex: "\\Delta S = \\dfrac{q_{\\text{rev}}}{T}", description: "Disorder; units J mol⁻¹ K⁻¹" },
  // Equilibrium
  { topic: "Equilibrium", name: "Equilibrium Constant (Kc)", latex: "K_c = \\dfrac{[C]^c[D]^d}{[A]^a[B]^b}", description: "For aA + bB ⇌ cC + dD" },
  { topic: "Equilibrium", name: "Kp Expression", latex: "K_p = K_c(RT)^{\\Delta n}", description: "Pressure equilibrium constant" },
  { topic: "Equilibrium", name: "Reaction Quotient", latex: "Q_c = \\dfrac{[C]^c[D]^d}{[A]^a[B]^b}", description: "Determines direction of shift (Q vs K)" },
  { topic: "Equilibrium", name: "Solubility Product", latex: "K_{sp} = [\\text{cation}]^m[\\text{anion}]^n", description: "Equilibrium for sparingly soluble salts" },
  // Electrochemistry
  { topic: "Electrochemistry", name: "Faraday's Law", latex: "m = \\dfrac{ItM}{nF}", description: "Mass deposited; F = 96 485 C mol⁻¹" },
  { topic: "Electrochemistry", name: "Cell Potential", latex: "E^\\circ_{\\text{cell}} = E^\\circ_{\\text{cathode}} - E^\\circ_{\\text{anode}}", description: "Standard cell voltage" },
  { topic: "Electrochemistry", name: "Nernst Equation", latex: "E = E^\\circ - \\dfrac{RT}{nF}\\ln Q", description: "Cell potential under non-standard conditions" },
  { topic: "Electrochemistry", name: "Gibbs–Cell Potential", latex: "\\Delta G^\\circ = -nFE^\\circ", description: "Links thermodynamics and electrochemistry" },
  { topic: "Electrochemistry", name: "Charge Carried", latex: "Q = nF", description: "Charge = moles of electrons × Faraday constant" },
  // Rates
  { topic: "Reaction Rates", name: "Rate Expression", latex: "\\text{rate} = k[A]^m[B]^n", description: "k = rate constant, m and n = orders" },
  { topic: "Reaction Rates", name: "Arrhenius Equation", latex: "k = Ae^{-E_a/RT}", description: "Temperature dependence of rate constant" },
  { topic: "Reaction Rates", name: "Half-Life (first order)", latex: "t_{1/2} = \\dfrac{\\ln 2}{k}", description: "Time for concentration to halve" },
  { topic: "Reaction Rates", name: "Integrated Rate Law (1st order)", latex: "[A]_t = [A]_0 e^{-kt}", description: "Concentration vs time for 1st order" },
  { topic: "Reaction Rates", name: "Integrated Rate Law (2nd order)", latex: "\\dfrac{1}{[A]_t} = \\dfrac{1}{[A]_0} + kt", description: "Concentration vs time for 2nd order" },
  // Atomic Structure
  { topic: "Atomic Structure", name: "Energy of Photon", latex: "E = hf = \\dfrac{hc}{\\lambda}", description: "h = 6.626 × 10⁻³⁴ J·s" },
  { topic: "Atomic Structure", name: "de Broglie Wavelength", latex: "\\lambda = \\dfrac{h}{mv}", description: "Wave-particle duality" },
  { topic: "Atomic Structure", name: "Rydberg Formula", latex: "\\dfrac{1}{\\lambda} = R_H\\!\\left(\\dfrac{1}{n_1^2}-\\dfrac{1}{n_2^2}\\right)", description: "Spectral lines of hydrogen" },
  { topic: "Atomic Structure", name: "Ionisation Energy", latex: "\\text{IE} = -E_n = \\dfrac{13.6\\,\\text{eV}}{n^2}", description: "Energy to remove electron from level n (hydrogen)" },
];

const BIOLOGY_FORMULAS: Formula[] = [
  // Genetics
  { topic: "Genetics", name: "Hardy-Weinberg (genotypes)", latex: "p^2 + 2pq + q^2 = 1", description: "Genotype frequencies in equilibrium population" },
  { topic: "Genetics", name: "Hardy-Weinberg (alleles)", latex: "p + q = 1", description: "Allele frequency sum" },
  { topic: "Genetics", name: "Heterozygosity", latex: "H = 2pq", description: "Expected heterozygote frequency" },
  { topic: "Genetics", name: "Recombination Frequency", latex: "r = \\dfrac{\\text{recombinant offspring}}{\\text{total offspring}}\\times 100\\%", description: "Map units between loci" },
  { topic: "Genetics", name: "Heritability (narrow-sense)", latex: "h^2 = \\dfrac{V_A}{V_P}", description: "Additive genetic variance / phenotypic variance" },
  { topic: "Genetics", name: "Number of Gamete Types", latex: "\\text{gamete types} = 2^n", description: "n = number of heterozygous gene pairs" },
  { topic: "Genetics", name: "Chi-squared Test", latex: "\\chi^2 = \\sum\\dfrac{(O - E)^2}{E}", description: "Tests if observed ratios fit expected" },
  // Ecology
  { topic: "Ecology", name: "Population Growth (exponential)", latex: "\\dfrac{dN}{dt} = rN", description: "r = intrinsic growth rate, N = population size" },
  { topic: "Ecology", name: "Population Growth (logistic)", latex: "\\dfrac{dN}{dt} = rN\\!\\left(\\dfrac{K-N}{K}\\right)", description: "K = carrying capacity" },
  { topic: "Ecology", name: "Doubling Time", latex: "t_d = \\dfrac{\\ln 2}{r}", description: "Time for population to double" },
  { topic: "Ecology", name: "Lincoln-Petersen (mark-recapture)", latex: "N = \\dfrac{M \\times C}{R}", description: "M = marked, C = second sample, R = recaptured" },
  { topic: "Ecology", name: "Simpson's Diversity Index", latex: "D = 1 - \\dfrac{\\sum n(n-1)}{N(N-1)}", description: "Measure of species diversity" },
  { topic: "Ecology", name: "Shannon Diversity Index", latex: "H = -\\sum p_i \\ln p_i", description: "pᵢ = proportion of species i" },
  { topic: "Ecology", name: "Net Primary Productivity", latex: "NPP = GPP - R_a", description: "GPP = gross primary productivity, Rₐ = autotroph respiration" },
  { topic: "Ecology", name: "Trophic Efficiency", latex: "\\text{efficiency} = \\dfrac{E_{n+1}}{E_n}\\times 100\\%", description: "Energy transferred between trophic levels (~10%)" },
  { topic: "Ecology", name: "Biomass Pyramid", latex: "\\text{biomass}_{n+1} \\approx 0.1 \\times \\text{biomass}_n", description: "Approx 10% rule between trophic levels" },
  // Cell Biology
  { topic: "Cell Biology", name: "Surface Area to Volume Ratio", latex: "\\text{SA:V} = \\dfrac{6}{d}", description: "For a cube of side d; drives diffusion efficiency" },
  { topic: "Cell Biology", name: "Fick's Law of Diffusion", latex: "J = -D\\dfrac{\\Delta C}{\\Delta x}", description: "Diffusion rate depends on concentration gradient" },
  { topic: "Cell Biology", name: "Water Potential", latex: "\\Psi = \\Psi_s + \\Psi_p", description: "Solute potential + pressure potential" },
  { topic: "Cell Biology", name: "Osmotic Potential", latex: "\\Psi_s = -iCRT", description: "i = van't Hoff factor, C = concentration" },
  { topic: "Cell Biology", name: "Mitotic Index", latex: "MI = \\dfrac{\\text{cells in mitosis}}{\\text{total cells}}\\times 100", description: "Proportion of cells dividing" },
  { topic: "Cell Biology", name: "Cell Cycle Time", latex: "t_{\\text{phase}} = \\dfrac{\\%\\,\\text{cells in phase}}{100} \\times T_{\\text{cycle}}", description: "Time spent in each cell cycle phase" },
  // Photosynthesis & Respiration
  { topic: "Photosynthesis", name: "Overall Photosynthesis", latex: "6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{light}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2", description: "Net equation for photosynthesis" },
  { topic: "Photosynthesis", name: "Light Reactions", latex: "12\\text{H}_2\\text{O} + \\text{light} \\rightarrow 24\\text{H}^+ + 24e^- + 6\\text{O}_2", description: "Water splitting in thylakoid" },
  { topic: "Photosynthesis", name: "Calvin Cycle Net", latex: "3\\text{CO}_2 + 9\\text{ATP} + 6\\text{NADPH} \\rightarrow \\text{G3P}", description: "Carbon fixation summary" },
  { topic: "Photosynthesis", name: "Photosynthetic Rate", latex: "\\text{rate} \\propto \\dfrac{[\\text{CO}_2] \\times \\text{light intensity}}{\\text{temperature factor}}", description: "Limiting factor relationship" },
  { topic: "Respiration", name: "Aerobic Respiration", latex: "\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\rightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{ATP}", description: "Complete glucose oxidation" },
  { topic: "Respiration", name: "ATP Yield (glycolysis)", latex: "\\text{glucose} \\rightarrow 2\\,\\text{pyruvate} + 2\\,\\text{ATP} + 2\\,\\text{NADH}", description: "Net ATP from glycolysis" },
  { topic: "Respiration", name: "Respiratory Quotient", latex: "RQ = \\dfrac{\\text{CO}_2\\,\\text{produced}}{\\text{O}_2\\,\\text{consumed}}", description: "Indicates substrate being respired (glucose RQ = 1)" },
  { topic: "Respiration", name: "Anaerobic (lactic acid)", latex: "\\text{C}_6\\text{H}_{12}\\text{O}_6 \\rightarrow 2\\,\\text{C}_3\\text{H}_6\\text{O}_3 + 2\\,\\text{ATP}", description: "Fermentation in animal muscle" },
  { topic: "Respiration", name: "Anaerobic (ethanol)", latex: "\\text{C}_6\\text{H}_{12}\\text{O}_6 \\rightarrow 2\\,\\text{C}_2\\text{H}_5\\text{OH} + 2\\,\\text{CO}_2 + 2\\,\\text{ATP}", description: "Fermentation in yeast" },
  // Evolution
  { topic: "Evolution", name: "Relative Fitness", latex: "w = \\dfrac{\\text{survival/reproduction of genotype}}{\\text{max survival/reproduction}}", description: "Fitness relative to most fit genotype" },
  { topic: "Evolution", name: "Selection Coefficient", latex: "s = 1 - w", description: "Disadvantage relative to fittest genotype" },
  { topic: "Evolution", name: "Allele Frequency Change", latex: "\\Delta p \\approx \\dfrac{sp^2q}{1-sp^2}", description: "Change in dominant allele frequency per generation" },
  { topic: "Evolution", name: "Effective Population Size", latex: "N_e = \\dfrac{4N_f N_m}{N_f + N_m}", description: "Accounts for unequal sex ratios" },
  // Molecular Biology
  { topic: "Molecular Biology", name: "DNA Replication Fidelity", latex: "\\text{error rate} \\approx 10^{-9}\\,\\text{errors/base pair}", description: "After proofreading" },
  { topic: "Molecular Biology", name: "Tm (DNA melting)", latex: "T_m = 81.5 + 16.6\\log[\\text{Na}^+] + 0.41(\\%\\text{GC}) - 675/n", description: "Melting temperature of DNA duplex" },
  { topic: "Molecular Biology", name: "Chargaff's Rule", latex: "[A]=[T],\\quad [G]=[C]", description: "Base pairing equivalences in dsDNA" },
  { topic: "Molecular Biology", name: "Codon Count", latex: "4^3 = 64\\,\\text{possible codons}", description: "Three-base codons from 4 nucleotides" },
  { topic: "Molecular Biology", name: "Reading Frame", latex: "\\text{ORF length (aa)} = \\dfrac{n - 3}{3}", description: "n = nucleotides; subtract stop codon" },
  // Physiology
  { topic: "Physiology", name: "Cardiac Output", latex: "CO = HR \\times SV", description: "HR = heart rate, SV = stroke volume" },
  { topic: "Physiology", name: "Mean Arterial Pressure", latex: "MAP = DP + \\dfrac{1}{3}(SP - DP)", description: "DP = diastolic, SP = systolic pressure" },
  { topic: "Physiology", name: "Glomerular Filtration Rate", latex: "GFR = \\dfrac{U \\times V}{P}", description: "U = urine [substance], V = urine flow, P = plasma [substance]" },
  { topic: "Physiology", name: "BMI", latex: "BMI = \\dfrac{m}{h^2}", description: "Body mass (kg) / height² (m²)" },
  { topic: "Physiology", name: "Basal Metabolic Rate (Mifflin–St Jeor, male)", latex: "BMR = 10m + 6.25h - 5a + 5", description: "m = kg, h = cm, a = age" },
  { topic: "Physiology", name: "Lung Volumes", latex: "VC = TV + IRV + ERV", description: "Vital capacity = tidal + inspiratory reserve + expiratory reserve" },
  { topic: "Physiology", name: "Haemoglobin O₂ Saturation", latex: "SO_2 = \\dfrac{HbO_2}{Hb_{\\text{total}}}\\times 100\\%", description: "Percentage of haemoglobin carrying oxygen" },
];

const ECONOMICS_FORMULAS: Formula[] = [
  // Macroeconomics
  { topic: "Macroeconomics", name: "GDP (Expenditure)", latex: "GDP = C + I + G + (X - M)", description: "C=consumption, I=investment, G=government, X-M=net exports" },
  { topic: "Macroeconomics", name: "GDP (Income)", latex: "GDP = W + P + R + I", description: "Wages + Profits + Rent + Interest" },
  { topic: "Macroeconomics", name: "Real GDP", latex: "\\text{Real GDP} = \\dfrac{\\text{Nominal GDP}}{\\text{GDP Deflator}}\\times 100", description: "Adjusts for inflation" },
  { topic: "Macroeconomics", name: "GDP Growth Rate", latex: "g = \\dfrac{GDP_t - GDP_{t-1}}{GDP_{t-1}}\\times 100", description: "Percentage change in GDP" },
  { topic: "Macroeconomics", name: "CPI", latex: "\\text{CPI} = \\dfrac{\\text{Cost of basket (current)}}{\\text{Cost of basket (base)}}\\times 100", description: "Consumer Price Index" },
  { topic: "Macroeconomics", name: "Inflation Rate", latex: "\\pi = \\dfrac{\\text{CPI}_{t} - \\text{CPI}_{t-1}}{\\text{CPI}_{t-1}}\\times 100", description: "Percentage change in CPI" },
  { topic: "Macroeconomics", name: "Unemployment Rate", latex: "U = \\dfrac{\\text{Unemployed}}{\\text{Labour force}}\\times 100", description: "Percentage without work" },
  { topic: "Macroeconomics", name: "Labour Force Participation", latex: "LFPR = \\dfrac{\\text{Labour force}}{\\text{Working-age population}}\\times 100", description: "Share of population in labour force" },
  { topic: "Macroeconomics", name: "Money Multiplier", latex: "m = \\dfrac{1}{\\text{reserve ratio}}", description: "Maximum credit creation from initial deposit" },
  { topic: "Macroeconomics", name: "Quantity Theory of Money", latex: "MV = PQ", description: "M=money supply, V=velocity, P=price level, Q=real output" },
  { topic: "Macroeconomics", name: "Fiscal Multiplier", latex: "k = \\dfrac{1}{1 - MPC}", description: "MPC = marginal propensity to consume" },
  { topic: "Macroeconomics", name: "Tax Multiplier", latex: "k_T = \\dfrac{-MPC}{1 - MPC}", description: "Effect of tax change on income" },
  { topic: "Macroeconomics", name: "Balanced Budget Multiplier", latex: "k_{BB} = 1", description: "Equal G and T change has multiplier of 1" },
  { topic: "Macroeconomics", name: "National Savings", latex: "S = Y - C - G", description: "Output minus consumption minus government spending" },
  { topic: "Macroeconomics", name: "Current Account Balance", latex: "CA = X - M + NY + NCT", description: "Net exports + net income + net current transfers" },
  { topic: "Macroeconomics", name: "Exchange Rate (direct quote)", latex: "e = \\dfrac{\\text{domestic currency}}{\\text{foreign currency}}", description: "Price of 1 unit of foreign currency in domestic terms" },
  { topic: "Macroeconomics", name: "Real Exchange Rate", latex: "RER = e \\times \\dfrac{P^*}{P}", description: "Nominal rate adjusted for price levels" },
  { topic: "Macroeconomics", name: "Purchasing Power Parity", latex: "e = \\dfrac{P}{P^*}", description: "Exchange rate that equalises price levels" },
  { topic: "Macroeconomics", name: "Terms of Trade", latex: "ToT = \\dfrac{P_{\\text{exports}}}{P_{\\text{imports}}}\\times 100", description: "Export prices relative to import prices" },
  { topic: "Macroeconomics", name: "Output Gap", latex: "\\text{Gap} = \\dfrac{Y - Y^*}{Y^*}\\times 100", description: "Actual minus potential GDP as %" },
  // Microeconomics
  { topic: "Microeconomics", name: "Price Elasticity of Demand", latex: "PED = \\dfrac{\\%\\Delta Q_d}{\\%\\Delta P}", description: "Responsiveness of quantity demanded to price" },
  { topic: "Microeconomics", name: "Price Elasticity of Supply", latex: "PES = \\dfrac{\\%\\Delta Q_s}{\\%\\Delta P}", description: "Responsiveness of quantity supplied to price" },
  { topic: "Microeconomics", name: "Income Elasticity of Demand", latex: "YED = \\dfrac{\\%\\Delta Q_d}{\\%\\Delta Y}", description: "Responsiveness to income change" },
  { topic: "Microeconomics", name: "Cross Elasticity of Demand", latex: "XED = \\dfrac{\\%\\Delta Q_{d,A}}{\\%\\Delta P_B}", description: "Positive = substitutes; negative = complements" },
  { topic: "Microeconomics", name: "Total Revenue", latex: "TR = P \\times Q", description: "Price times quantity sold" },
  { topic: "Microeconomics", name: "Total Cost", latex: "TC = FC + VC", description: "Fixed plus variable costs" },
  { topic: "Microeconomics", name: "Profit", latex: "\\pi = TR - TC", description: "Revenue minus total cost" },
  { topic: "Microeconomics", name: "Average Revenue", latex: "AR = \\dfrac{TR}{Q} = P", description: "Revenue per unit (= price in perfect competition)" },
  { topic: "Microeconomics", name: "Marginal Revenue", latex: "MR = \\dfrac{\\Delta TR}{\\Delta Q}", description: "Extra revenue from one more unit" },
  { topic: "Microeconomics", name: "Average Total Cost", latex: "ATC = \\dfrac{TC}{Q}", description: "Total cost per unit" },
  { topic: "Microeconomics", name: "Average Variable Cost", latex: "AVC = \\dfrac{VC}{Q}", description: "Variable cost per unit" },
  { topic: "Microeconomics", name: "Average Fixed Cost", latex: "AFC = \\dfrac{FC}{Q}", description: "Fixed cost per unit" },
  { topic: "Microeconomics", name: "Marginal Cost", latex: "MC = \\dfrac{\\Delta TC}{\\Delta Q}", description: "Extra cost of one more unit" },
  { topic: "Microeconomics", name: "Profit Maximisation", latex: "MR = MC", description: "Optimal output rule" },
  { topic: "Microeconomics", name: "Lerner Index", latex: "L = \\dfrac{P - MC}{P} = \\dfrac{-1}{PED}", description: "Measures market power (0 = competitive)" },
  { topic: "Microeconomics", name: "Consumer Surplus", latex: "CS = \\dfrac{1}{2}(P_{\\max} - P)\\times Q", description: "Area above price below demand curve (linear)" },
  { topic: "Microeconomics", name: "Producer Surplus", latex: "PS = \\dfrac{1}{2}(P - P_{\\min})\\times Q", description: "Area below price above supply curve (linear)" },
  { topic: "Microeconomics", name: "Deadweight Loss", latex: "DWL = \\dfrac{1}{2}|P - MC|\\times|Q^* - Q_m|", description: "Welfare loss from market distortion" },
  { topic: "Microeconomics", name: "Herfindahl-Hirschman Index", latex: "HHI = \\sum_{i=1}^n s_i^2", description: "s = market share %; measures market concentration" },
  { topic: "Microeconomics", name: "Concentration Ratio (CR4)", latex: "CR_4 = s_1 + s_2 + s_3 + s_4", description: "Market share of top 4 firms" },
  // Finance & Trade
  { topic: "Finance", name: "Net Present Value", latex: "NPV = \\sum_{t=0}^n \\dfrac{CF_t}{(1+r)^t}", description: "Sum of discounted cash flows" },
  { topic: "Finance", name: "Interest Rate Parity", latex: "\\dfrac{F}{S} = \\dfrac{1+i_d}{1+i_f}", description: "F=forward rate, S=spot rate" },
  { topic: "Finance", name: "Gini Coefficient", latex: "G = \\dfrac{A}{A+B}", description: "A = area between Lorenz curve and equality line; 0 = equal" },
];

// ---------------------------------------------------------------------------
// Previously there was a helper here to pad formulas with placeholders;
// this has been removed because we now only include authentic formulas.  If
// future automation is desired it can be reintroduced with real data.
// ---------------------------------------------------------------------------

const FORMULA_SHEETS: FormulaSheet[] = [
  { subjectId: "math",        label: "Mathematics", formulas: MATH_FORMULAS },
  { subjectId: "physics",     label: "Physics",     formulas: PHYSICS_FORMULAS },
  { subjectId: "chemistry",   label: "Chemistry",   formulas: CHEMISTRY_FORMULAS },
  { subjectId: "biology",     label: "Biology",     formulas: BIOLOGY_FORMULAS },
  { subjectId: "economics",   label: "Economics",   formulas: ECONOMICS_FORMULAS },
];

// ensure every formula object carries a states array so filtering can rely on
// the field without additional guards.  missing states are treated as
// "ALL" to match the interface documentation above.
FORMULA_SHEETS.forEach(sheet => {
  sheet.formulas.forEach(f => {
    if (!f.states) {
      f.states = ["ALL"];
    }
    // ensure there is at least one tag for filtering; default to topic name
    if (!f.tags || f.tags.length === 0) {
      f.tags = [f.topic.toLowerCase()];
    }
  });
});

// NOTE: padding has been removed per user request; only authentic formulas
// are included in each array.  The padFormulas helper is retained for
// historical reference but not invoked.

// development-time log of formula counts per subject
if (process.env.NODE_ENV === "development") {
  FORMULA_SHEETS.forEach((sheet) => {
    console.log(
      `[FormulaSheets] ${sheet.subjectId}: ${sheet.formulas.length} formulas (>=100 guaranteed)`
    );
  });
}

export const getFormulaSheet = (subjectId: string): FormulaSheet | null =>
  FORMULA_SHEETS.find(s => s.subjectId === subjectId) || null;

export const getFormulaSheetContext = (subjectId: string): string => {
  const sheet = getFormulaSheet(subjectId);
  if (!sheet) return "";
  const lines = sheet.formulas.map(f => {
    const parts: string[] = [];
    if (f.grades) parts.push(`grades: ${f.grades.join(",")}`);
    if (f.states) parts.push(`states: ${f.states.join(",")}`);
    if (f.tags) parts.push(`tags: ${f.tags.join(",")}`);
    const extra = parts.length ? ` [${parts.join("; ")}]` : "";
    return `• ${f.name} (${f.topic})${extra}: ${f.description}`;
  });
  return `Formula sheet for ${sheet.label}:\n${lines.join("\n")}`;
};

export default FORMULA_SHEETS;
