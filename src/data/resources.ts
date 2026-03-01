import type { SubjectId } from "@/constants/subjects";

export type ResourceLink = {
  title: string;
  url: string;
  description?: string;
  free?: boolean;
  states?: string[];
};

export type SubjectResources = {
  subjectId: SubjectId;
  pastPapers: ResourceLink[];
  textbooks: ResourceLink[];
};

const RESOURCES: SubjectResources[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // MATHEMATICS
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "math",
    pastPapers: [
      // Yrs 7 & 9 — ALL states
      { title: "NAPLAN Numeracy Practice (Years 7 & 9)", url: "https://www.nap.edu.au/naplan/public-demonstration-site", description: "Official NAPLAN public demo tests — numeracy for Years 3, 5, 7 and 9", free: true },
      // NSW — Yrs 11–12
      { title: "NSW HSC Mathematics – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers?category=Mathematics", description: "All HSC Mathematics, Extension 1, Extension 2, Standard 1 & 2 papers", free: true, states: ["NSW"] },
      // VIC — Yrs 11–12
      { title: "VCE Mathematical Methods – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/mathematical-methods", free: true, states: ["VIC"] },
      { title: "VCE General Mathematics – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/general-mathematics", free: true, states: ["VIC"] },
      { title: "VCE Specialist Mathematics – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/specialist-mathematics", free: true, states: ["VIC"] },
      { title: "VCE Foundation Mathematics – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce-assessment/past-examinations/Pages/Foundation-Mathematics.aspx", free: true, states: ["VIC"] },
      // QLD — Yrs 11–12
      { title: "QCAA General Mathematics – Past Papers & Samples", url: "https://www.qcaa.qld.edu.au/senior/see/subject-resources/mathematics-general", description: "Includes past SEE papers and marking guides", free: true, states: ["QLD"] },
      { title: "QCAA Mathematical Methods – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/mathematics/mathematics-methods", free: true, states: ["QLD"] },
      { title: "QCAA Specialist Mathematics – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/mathematics/specialist-mathematics", free: true, states: ["QLD"] },
      // WA — Yrs 11–12
      { title: "WA ATAR Mathematics Applications – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/mathematics-past-atar-course-exams", description: "Calculator-assumed and calculator-free papers", free: true, states: ["WA"] },
      { title: "WA ATAR Mathematics Methods – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/mathematics-methods-past-atar-course-exams", free: true, states: ["WA"] },
      { title: "WA ATAR Mathematics Specialist – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/mathematics-specialist-past-atar-course-exams", free: true, states: ["WA"] },
      // SA/NT — Yrs 11–12
      { title: "SACE General Mathematics – Past Exams", url: "https://www.sace.sa.edu.au/web/general-mathematics/external-assessment", description: "2023–2025 papers with marking guides", free: true, states: ["SA", "NT"] },
      { title: "SACE Mathematical Methods – Past Exams", url: "https://www.sace.sa.edu.au/web/mathematical-methods/external-assessment", free: true, states: ["SA", "NT"] },
      { title: "SACE Specialist Mathematics – Past Exams", url: "https://www.sace.sa.edu.au/web/specialist-mathematics/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS — Yrs 11–12
      { title: "TASC Mathematics – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", description: "All current Level 3 & 4 TASC maths course papers", free: true, states: ["TAS"] },
      // ACT — Yrs 11–12
      { title: "BSSS Mathematics – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/mathematics", free: true, states: ["ACT"] },
      // Third-party trial papers & solutions — all states
      { title: "THSC Online – Maths Trial Papers (Yrs 9–12)", url: "https://thsconline.github.io/s/yr12/Maths/trialpapers_advanced.html", description: "Large collection of school trial papers — Advanced, Ext 1, Ext 2, Standard", free: true },
      { title: "AceHSC – Mathematics Past Trial Papers", url: "https://www.acehsc.net/category/past-trial-papers/", description: "Searchable library of trial papers, study notes and multiple-choice quizzes", free: true },
      { title: "Art of Smart – HSC Maths Past Papers", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "HSC, QCE & VCE maths papers with tips", free: true },
      { title: "Matrix Education – Maths Exam Solutions", url: "https://www.matrix.edu.au/hsc-solutions/", description: "Free worked solutions to recent HSC maths exams", free: true },
      { title: "Talent 100 – Free Maths Downloads", url: "https://talent-100.com.au/free-downloads/", description: "Free HSC maths notes and practice papers", free: true },
      // Practice paper sites — All states, Yrs 9–12
      { title: "THSC Online – Maths Trial Papers (NSW, Yrs 9–12)", url: "https://thsconline.github.io/s/yr12/Mathematics/", description: "100+ school trial papers across all maths courses, free", free: true },
      { title: "itute.com – Free VCE & NSW Maths Exams + Solutions", url: "https://www.itute.com/download-free-vce-maths-resources/free-maths-exams/", description: "Trial exams with full worked solutions for Methods, Specialist, HSC Advanced, Ext 1 & 2", free: true, states: ["VIC", "NSW"] },
      { title: "ACED VCE – Free Maths Practice Exams", url: "https://acedvce.com/free-practice-exams/", description: "Free previous-edition VCE practice exams from a leading VCE publisher", free: true, states: ["VIC"] },
      { title: "Art of Smart – HSC Maths Practice Papers", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "Curated HSC maths papers + study guides and tips", free: true, states: ["NSW"] },
      { title: "Physics & Maths Tutor – Maths Questions by Topic", url: "https://www.physicsandmathstutor.com/maths-revision/", description: "Thousands of free exam-style questions grouped by topic — A-Level content matches HSC/VCE well", free: true },
      { title: "Khan Academy – Maths Practice (Adaptive)", url: "https://www.khanacademy.org/math", description: "Free adaptive practice tests across all maths topics", free: true },
      // Competitions — All states, Yrs 7–12
      { title: "AMT Australian Mathematics Competition", url: "https://www.amt.edu.au/competitions/amc", description: "Years 7–12 competition papers and past problems", free: true },
      { title: "UNSW Maths Competition", url: "https://www.unsw.edu.au/engage/schools/competition-programs/maths-competition", description: "University-run national competition for Years 3–12", free: true },
    ],
    textbooks: [
      { title: "OpenStax Algebra and Trigonometry 2e", url: "https://openstax.org/details/books/algebra-and-trigonometry-2e", description: "Free peer-reviewed textbook", free: true },
      { title: "OpenStax Precalculus 2e", url: "https://openstax.org/details/books/precalculus-2e", free: true },
      { title: "OpenStax Calculus Volume 1", url: "https://openstax.org/details/books/calculus-volume-1", free: true },
      { title: "OpenStax Calculus Volume 2", url: "https://openstax.org/details/books/calculus-volume-2", free: true },
      { title: "OpenStax Statistics", url: "https://openstax.org/details/books/introductory-statistics", free: true },
      { title: "Khan Academy – Mathematics", url: "https://www.khanacademy.org/math", description: "Arithmetic through calculus, all free", free: true },
      { title: "Paul's Online Math Notes", url: "https://tutorial.math.lamar.edu/", description: "Free notes on algebra, calculus, differential equations", free: true },
      { title: "MIT OpenCourseWare – Mathematics", url: "https://ocw.mit.edu/courses/", description: "Free university lectures and problem sets", free: true },
      { title: "3Blue1Brown (YouTube)", url: "https://www.youtube.com/c/3blue1brown", description: "Visual explanations of calculus and linear algebra", free: true },
      { title: "Professor Leonard (YouTube)", url: "https://www.youtube.com/user/professorleonard57", description: "Full calculus and algebra course", free: true },
      { title: "Wolfram MathWorld", url: "https://mathworld.wolfram.com/", description: "Comprehensive math reference", free: true },
      { title: "Brilliant.org – Free Tier", url: "https://brilliant.org/", description: "Some free interactive problems available", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PHYSICS
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "physics",
    pastPapers: [
      // Yrs 7 & 9 — ALL states (science component of NAPLAN covers numeracy/reasoning relevant to physics)
      { title: "NAPLAN Numeracy – Years 7 & 9 (Measurement & Reasoning)", url: "https://www.nap.edu.au/naplan/public-demonstration-site", description: "Official NAPLAN demo — numeracy reasoning aligned with junior science", free: true },
      // NSW
      { title: "NSW HSC Physics – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers?category=Physics", description: "All HSC Physics exam packs", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Physics – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/physics", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Physics – Syllabus, Samples & Past Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/science/physics", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Physics – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/physics-past-atar-course-exams", description: "2021–2025 exams with marking keys", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Physics – Past Exams", url: "https://www.sace.sa.edu.au/web/physics/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Physics – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", description: "Level 3 & 4 TASC Physics papers", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS Physics – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/physics", free: true, states: ["ACT"] },
      // Third-party trial papers & solutions — all states
      { title: "THSC Online – Physics Trial Papers (Yr 12)", url: "https://thsconline.github.io/s/yr12/Physics/trialpapers.html", description: "School trial papers from across NSW", free: true },
      { title: "AceHSC – Physics Past Trial Papers", url: "https://www.acehsc.net/category/past-trial-papers/", description: "Trial papers, study notes, and multiple-choice quizzes", free: true },
      { title: "Art of Smart – HSC Physics Past Papers", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "HSC & VCE physics papers with study guides", free: true },
      { title: "Matrix Education – Physics Exam Solutions", url: "https://www.matrix.edu.au/hsc-solutions/", description: "Free worked solutions to recent HSC Physics exams", free: true },
      // Practice paper sites — All states
      { title: "THSC Online – Physics Trial Papers (NSW, Yrs 11–12)", url: "https://thsconline.github.io/s/yr12/Physics/", description: "Dozens of school trial papers, free", free: true, states: ["NSW"] },
      { title: "itute.com – Free VCE Physics Exams + Solutions", url: "https://www.itute.com/download-free-vce-physics-resources/free-physics-exams/", description: "VCE trial exams with full worked solutions", free: true, states: ["VIC"] },
      { title: "ACED VCE – Free Physics Practice Exams", url: "https://acedvce.com/free-practice-exams/", description: "Free previous-edition VCE practice exams", free: true, states: ["VIC"] },
      { title: "Physics & Maths Tutor – A-Level Physics Questions", url: "https://www.physicsandmathstutor.com/physics-revision/", description: "Free topic-by-topic questions and past papers — content aligns well with HSC/VCE", free: true },
      { title: "Art of Smart – HSC Physics Study Guides & Papers", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "Curated HSC Physics papers, guides and tips", free: true, states: ["NSW"] },
      // Competitions
      { title: "Australian Science Olympiad – Physics Papers", url: "https://www.aso.edu.au/", description: "Challenge papers for Years 10–12", free: true },
      { title: "Physics Aptitude Test (PAT) – Oxford", url: "https://www.physics.ox.ac.uk/study-here/undergraduates/physics-aptitude-test-pat", description: "University entrance test with practice papers", free: true },
    ],
    textbooks: [
      { title: "The Feynman Lectures on Physics (free online)", url: "https://www.feynmanlectures.caltech.edu/", description: "Official free online version of classic physics lectures", free: true },
      { title: "OpenStax University Physics Vol 1 (Mechanics)", url: "https://openstax.org/details/books/university-physics-volume-1", free: true },
      { title: "OpenStax University Physics Vol 2 (Thermo/E&M)", url: "https://openstax.org/details/books/university-physics-volume-2", free: true },
      { title: "OpenStax University Physics Vol 3 (Modern Physics)", url: "https://openstax.org/details/books/university-physics-volume-3", free: true },
      { title: "Khan Academy – Physics", url: "https://www.khanacademy.org/science/physics", free: true },
      { title: "HyperPhysics", url: "http://hyperphysics.phy-astr.gsu.edu/hbase/hframe.html", description: "Free concept-map style physics reference", free: true },
      { title: "PhET Interactive Simulations – Physics", url: "https://phet.colorado.edu/en/simulations/filter?subjects=physics", description: "Interactive physics simulations", free: true },
      { title: "CrashCourse Physics (YouTube)", url: "https://www.youtube.com/playlist?list=PL8dPuuaLjXtN06puRjUQAKlmYVcRj2-5H", free: true },
      { title: "LibreTexts Physics", url: "https://phys.libretexts.org/", description: "Free peer-reviewed physics texts", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CHEMISTRY
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "chemistry",
    pastPapers: [
      // NSW
      { title: "NSW HSC Chemistry – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers?category=Chemistry", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Chemistry – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/chemistry", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Chemistry – Syllabus, Samples & Past Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/science/chemistry", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Chemistry – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/chemistry-past-atar-course-exams", description: "2021–2025 exams with marking keys", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Chemistry – Past Exams", url: "https://www.sace.sa.edu.au/web/chemistry/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Chemistry – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", description: "Level 3 & 4 TASC Chemistry papers", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS Chemistry – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/chemistry", free: true, states: ["ACT"] },
      // Third-party trial papers & solutions — all states
      { title: "THSC Online – Chemistry Trial Papers (Yr 12)", url: "https://thsconline.github.io/s/yr12/Chemistry/trialpapers.html", description: "School trial papers from across NSW", free: true },
      { title: "AceHSC – Chemistry Past Trial Papers", url: "https://www.acehsc.net/category/past-trial-papers/", description: "Trial papers, study notes, and multiple-choice quizzes", free: true },
      { title: "Art of Smart – HSC Chemistry Past Papers", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "HSC & VCE chemistry papers with study guides", free: true },
      { title: "Matrix Education – Chemistry Exam Solutions", url: "https://www.matrix.edu.au/hsc-solutions/", description: "Free worked solutions to recent HSC Chemistry exams", free: true },
      // Practice paper sites
      { title: "THSC Online – Chemistry Trial Papers (NSW, Yrs 11–12)", url: "https://thsconline.github.io/s/yr12/Chemistry/", description: "School trial papers, free", free: true, states: ["NSW"] },
      { title: "ACED VCE – Free Chemistry Practice Exams", url: "https://acedvce.com/free-practice-exams/", description: "Free previous-edition VCE practice exams", free: true, states: ["VIC"] },
      { title: "Physics & Maths Tutor – A-Level Chemistry Questions", url: "https://www.physicsandmathstutor.com/chemistry-revision/", description: "Free topic-by-topic questions — A-Level content closely mirrors HSC/VCE", free: true },
      { title: "Art of Smart – HSC Chemistry Papers & Guides", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "Curated HSC Chemistry papers and study tips", free: true, states: ["NSW"] },
      { title: "Save My Exams – A-Level Chemistry Questions", url: "https://www.savemyexams.com/a-level/chemistry/", description: "Topic-by-topic exam practice, free tier available — aligns well with HSC/VCE content", free: false },
      // Competitions
      { title: "Australian Science Olympiad – Chemistry Papers", url: "https://www.aso.edu.au/", description: "Challenge papers for Years 10–12", free: true },
    ],
    textbooks: [
      { title: "OpenStax Chemistry 2e", url: "https://openstax.org/details/books/chemistry-2e", free: true },
      { title: "OpenStax Chemistry: Atoms First 2e", url: "https://openstax.org/details/books/chemistry-atoms-first-2e", free: true },
      { title: "LibreTexts Chemistry", url: "https://chem.libretexts.org/", description: "Open-source chemistry texts covering all levels", free: true },
      { title: "Khan Academy – Chemistry", url: "https://www.khanacademy.org/science/chemistry", free: true },
      { title: "ChemGuide (free revision notes)", url: "https://www.chemguide.co.uk/", description: "Excellent free HSC/A-Level chemistry notes", free: true },
      { title: "PhET – Chemistry Simulations", url: "https://phet.colorado.edu/en/simulations/filter?subjects=chemistry", description: "Free interactive chemistry simulations", free: true },
      { title: "CrashCourse Chemistry (YouTube)", url: "https://www.youtube.com/playlist?list=PL8dPuuaLjXtN06puRjUQAKlmYVcRj2-5H", free: true },
      { title: "Royal Australian Chemical Institute – Resources", url: "https://www.raci.org.au/education", description: "Educational materials from RACI", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BIOLOGY
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "biology",
    pastPapers: [
      // NSW
      { title: "NSW HSC Biology – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers?category=Biology", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Biology – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/biology", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Biology – Syllabus, Samples & Past Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/science/biology", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Biology – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/biology-past-atar-course-exams", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Biology – Past Exams", url: "https://www.sace.sa.edu.au/web/biology/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Biology – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", description: "Level 3 & 4 TASC Biology papers", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS Biology – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/biology", free: true, states: ["ACT"] },
      // Third-party trial papers & solutions — all states
      { title: "THSC Online – Biology Trial Papers (Yr 12)", url: "https://thsconline.github.io/s/yr12/Biology/trialpapers.html", description: "School trial papers from across NSW", free: true },
      { title: "AceHSC – Biology Past Trial Papers", url: "https://www.acehsc.net/category/past-trial-papers/", description: "Trial papers, study notes, and multiple-choice quizzes", free: true },
      { title: "Art of Smart – HSC Biology Past Papers", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "HSC & VCE biology papers with study guides", free: true },
      { title: "Matrix Education – Biology Exam Solutions", url: "https://www.matrix.edu.au/hsc-solutions/", description: "Free worked solutions to recent HSC Biology exams", free: true },
      // Practice paper sites
      { title: "THSC Online – Biology Trial Papers (NSW, Yrs 11–12)", url: "https://thsconline.github.io/s/yr12/Biology/", description: "School trial papers, free", free: true, states: ["NSW"] },
      { title: "ACED VCE – Free Biology Practice Exams", url: "https://acedvce.com/free-practice-exams/", description: "Free previous-edition VCE Biology and Health practice exams", free: true, states: ["VIC"] },
      { title: "Physics & Maths Tutor – A-Level Biology Questions", url: "https://www.physicsandmathstutor.com/biology-revision/", description: "Free topic-by-topic questions — content closely mirrors HSC/VCE", free: true },
      { title: "Art of Smart – HSC Biology Papers & Guides", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "Curated HSC Biology papers and study tips", free: true, states: ["NSW"] },
      { title: "Save My Exams – A-Level Biology Questions", url: "https://www.savemyexams.com/a-level/biology/", description: "Topic-organised exam questions with mark schemes, free tier available", free: false },
      // Competitions
      { title: "Australian Science Olympiad – Biology Papers", url: "https://www.aso.edu.au/", description: "Challenge papers for Years 10–12", free: true },
    ],
    textbooks: [
      { title: "OpenStax Biology 2e", url: "https://openstax.org/details/books/biology-2e", free: true },
      { title: "OpenStax Concepts of Biology", url: "https://openstax.org/details/books/concepts-biology", description: "Gentler intro-level biology text", free: true },
      { title: "OpenStax Anatomy and Physiology 2e", url: "https://openstax.org/details/books/anatomy-and-physiology-2e", free: true },
      { title: "Khan Academy – Biology", url: "https://www.khanacademy.org/science/biology", free: true },
      { title: "NCBI Bookshelf – Molecular Biology of the Cell", url: "https://www.ncbi.nlm.nih.gov/books/", description: "Free online edition of classic Alberts textbook", free: true },
      { title: "CrashCourse Biology (YouTube)", url: "https://www.youtube.com/playlist?list=PL3EED4C1D684D3ADF", description: "Fast-paced, engaging video series", free: true },
      { title: "LibreTexts Biology", url: "https://bio.libretexts.org/", description: "Free open-source biology texts", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ENGLISH
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "english",
    pastPapers: [
      // Yrs 7 & 9 — ALL states
      { title: "NAPLAN Reading & Writing Practice (Years 7 & 9)", url: "https://www.nap.edu.au/naplan/public-demonstration-site", description: "Official NAPLAN demo tests — reading, writing, grammar & punctuation", free: true },
      // NSW
      { title: "NSW HSC English – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers?category=English", description: "Advanced, Standard 1 & 2, Extension 1 & 2, EAL/D papers", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE English – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/english", free: true, states: ["VIC"] },
      { title: "VCE English as an Additional Language – Past Exams (VCAA)", url: "https://vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/english-additional-language-eal", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA English – Past Papers & Samples", url: "https://www.qcaa.qld.edu.au/senior/see/subject-resources/english", description: "Senior External Exam papers and marking guides", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR English – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/english-past-atar-course-exams", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE English – Past Exams", url: "https://www.sace.sa.edu.au/web/english/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC English – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", free: true, states: ["TAS"] },
      // Third-party trial papers — all states
      { title: "THSC Online – English Trial Papers (Yr 12)", url: "https://thsconline.github.io/s/yr12/English/trialpapers_paper1.html", description: "School trial papers — Advanced, Standard, Extension 1", free: true },
      { title: "AceHSC – English Past Trial Papers", url: "https://www.acehsc.net/category/past-trial-papers/", description: "Trial papers, essays, and study notes across English levels", free: true },
      { title: "Art of Smart – HSC English Past Papers", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "HSC, QCE & VCE English papers and essay guides", free: true },
      { title: "Matrix Education – English Exam Solutions", url: "https://www.matrix.edu.au/hsc-solutions/", description: "Free HSC English exam analysis and sample responses", free: true },
      // Practice paper sites
      { title: "THSC Online – English Trial Papers (NSW, Yrs 9–12)", url: "https://thsconline.github.io/s/yr12/English/", description: "106+ trial papers for Advanced, Standard, Extension — free", free: true, states: ["NSW"] },
      { title: "Art of Smart – HSC English Practice Papers", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "Free downloadable HSC English practice papers with marking guidelines", free: true, states: ["NSW"] },
      { title: "Matrix Education – HSC English Practice Paper 1", url: "https://www.matrix.edu.au/english-standard-practice-paper-1-common-module-free-download/", description: "Free practice paper with sample responses — Common Module", free: true, states: ["NSW"] },
      { title: "HSCPastPapers.com – English", url: "https://www.hscpastpapers.com/", description: "Aggregated NESA past papers with marking guidelines, easy navigation", free: true, states: ["NSW"] },
      { title: "Physics & Maths Tutor – A-Level English Resources", url: "https://www.physicsandmathstutor.com/english-revision/", description: "Free essay guides and exam questions — useful for technique practice", free: true },
    ],
    textbooks: [
      { title: "Purdue OWL – Writing Lab", url: "https://owl.purdue.edu/owl/purdue_owl.html", description: "Free grammar, writing, and referencing resource", free: true },
      { title: "Project Gutenberg – Classic Literature", url: "https://www.gutenberg.org/", description: "Free ebooks of public-domain texts", free: true },
      { title: "SparkNotes – Study Guides", url: "https://www.sparknotes.com/", description: "Free summaries and analysis of literary texts", free: true },
      { title: "LitCharts – Literary Analysis", url: "https://www.litcharts.com/", description: "Detailed character, theme, and scene analysis", free: true },
      { title: "No Fear Shakespeare", url: "https://www.sparknotes.com/nofear/", description: "Side-by-side modern English translation", free: true },
      { title: "Khan Academy – Grammar", url: "https://www.khanacademy.org/humanities/grammar", free: true },
      { title: "CrashCourse Literature (YouTube)", url: "https://www.youtube.com/playlist?list=PL8dPuuaLjXtOeEc9ME62zTfqc0h6Pe8vb", description: "Literary analysis for major works", free: true },
      { title: "BBC Learning English", url: "https://www.bbc.co.uk/learningenglish/", description: "Grammar and vocabulary lessons", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HISTORY
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "history",
    pastPapers: [
      // NSW
      { title: "NSW HSC History – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers?category=History", description: "Modern, Ancient, and History Extension papers", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE History – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/history", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Modern History – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/humanities/modern-history", free: true, states: ["QLD"] },
      { title: "QCAA Ancient History – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/humanities/ancient-history", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Modern History – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/modern-history-past-atar-course-exams", free: true, states: ["WA"] },
      { title: "WA ATAR Ancient History – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/ancient-history-past-atar-course-exams", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Modern History – Past Exams", url: "https://www.sace.sa.edu.au/web/modern-history/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Modern History – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS History – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/history", free: true, states: ["ACT"] },
      // Practice paper sites
      { title: "THSC Online – History Trial Papers (NSW, Yrs 11–12)", url: "https://thsconline.github.io/s/yr12/History/", description: "Modern and Ancient History trial papers from NSW schools", free: true, states: ["NSW"] },
      { title: "Art of Smart – HSC History Papers & Guides", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "Curated Modern and Ancient History papers and study tips", free: true, states: ["NSW"] },
      { title: "Physics & Maths Tutor – A-Level History Questions", url: "https://www.physicsandmathstutor.com/history-revision/", description: "Free essay practice and source analysis questions", free: true },
    ],
    textbooks: [
      { title: "Khan Academy – World History", url: "https://www.khanacademy.org/humanities/world-history", description: "Free world history from ancient to modern times", free: true },
      { title: "CrashCourse World History (YouTube)", url: "https://www.youtube.com/playlist?list=PLBDA2A52596A5DCCC", free: true },
      { title: "Internet History Sourcebooks Project", url: "https://sourcebooks.fordham.edu/", description: "Free primary sources for ancient, medieval, and modern history", free: true },
      { title: "National Archives of Australia", url: "https://www.naa.gov.au/", description: "Primary source documents from Australian history", free: true },
      { title: "Australian War Memorial", url: "https://www.awm.gov.au/", description: "Military history resources and documents", free: true },
      { title: "BBC – History", url: "https://www.bbc.co.uk/history/", description: "Articles and timelines on world history", free: true },
      { title: "History Crunch – Study Guides", url: "https://www.historycrunch.com/", description: "Free historical period guides and essays", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTING
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "computing",
    pastPapers: [
      // NSW
      { title: "NSW HSC Software Design & Development – NESA", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers?category=Software%20Design%20and%20Development", free: true, states: ["NSW"] },
      { title: "NSW HSC Information Processes & Technology – NESA", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers?category=Information%20Processes%20and%20Technology", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Software Development – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/software-development", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Digital Solutions – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/technologies/digital-solutions", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Computer Science – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/computer-science-past-atar-course-exams", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Digital Technologies – External Assessment", url: "https://www.sace.sa.edu.au/web/digital-technologies/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Computing – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS Information Technology – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/information_technology", free: true, states: ["ACT"] },
      // Practice paper sites
      { title: "THSC Online – Software Design Trial Papers (NSW)", url: "https://thsconline.github.io/s/yr12/Software%20Design%20and%20Development/", description: "School trial papers for SDD and IPT, free", free: true, states: ["NSW"] },
      { title: "Physics & Maths Tutor – A-Level Computer Science", url: "https://www.physicsandmathstutor.com/computer-science-revision/", description: "Free topic questions covering algorithms, data structures, programming — aligns with Australian CS curriculum", free: true },
      { title: "CS50 Problem Sets (Harvard)", url: "https://cs50.harvard.edu/x/2024/psets/", description: "Real coding problems from the world's most popular CS course", free: true },
      { title: "Exercism – Practice Coding Challenges", url: "https://exercism.org/", description: "Free coding practice in 70+ languages with mentor feedback", free: true },
    ],
    textbooks: [
      { title: "CS50 – Harvard Intro to Computer Science", url: "https://cs50.harvard.edu/x/", description: "The world's most popular intro to CS course", free: true },
      { title: "The Odin Project", url: "https://www.theodinproject.com/", description: "Complete free full-stack web development curriculum", free: true },
      { title: "Automate the Boring Stuff with Python", url: "https://automatetheboringstuff.com/", description: "Free practical Python book", free: true },
      { title: "Python.org Official Tutorial", url: "https://docs.python.org/3/tutorial/", free: true },
      { title: "freeCodeCamp", url: "https://www.freecodecamp.org/", description: "Free certifications in web dev, Python, data science", free: true },
      { title: "Eloquent JavaScript", url: "https://eloquentjavascript.net/", description: "Modern JavaScript programming book, free online", free: true },
      { title: "Neso Academy – CS (YouTube)", url: "https://www.youtube.com/user/nesoacademy", description: "Computer science fundamentals videos", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ECONOMICS
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "economics",
    pastPapers: [
      // NSW
      { title: "NSW HSC Economics – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-resources?resource_types=Archive%2520HSC%2520exam%2520pack%2CHSC%2520exam%2520pack&category=HSIE", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Economics – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/economics", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Economics – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/humanities/economics", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Economics – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/economics-past-atar-course-exams", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Economics – Past Exams", url: "https://www.sace.sa.edu.au/web/economics/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Economics – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS Economics – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/economics", free: true, states: ["ACT"] },
      // Practice paper sites
      { title: "THSC Online – Economics Trial Papers (NSW)", url: "https://thsconline.github.io/s/yr12/Economics/", description: "School trial papers for HSC Economics, free", free: true, states: ["NSW"] },
      { title: "Art of Smart – HSC Economics Papers & Guides", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "Curated HSC Economics papers and study tips", free: true, states: ["NSW"] },
      { title: "Physics & Maths Tutor – A-Level Economics Questions", url: "https://www.physicsandmathstutor.com/economics-revision/", description: "Free exam-style essay and multiple choice questions", free: true },
    ],
    textbooks: [
      { title: "OpenStax Principles of Economics 3e", url: "https://openstax.org/details/books/principles-economics-3e", free: true },
      { title: "OpenStax Microeconomics", url: "https://openstax.org/details/books/principles-microeconomics-3e", free: true },
      { title: "OpenStax Macroeconomics", url: "https://openstax.org/details/books/principles-macroeconomics-3e", free: true },
      { title: "Khan Academy – Macroeconomics", url: "https://www.khanacademy.org/economics-finance-domain/macroeconomics", free: true },
      { title: "Khan Academy – Microeconomics", url: "https://www.khanacademy.org/economics-finance-domain/microeconomics", free: true },
      { title: "CrashCourse Economics (YouTube)", url: "https://www.youtube.com/playlist?list=PL1oDmcs0xTD-dJN1PL2N1urX0EKupBJkQ", free: true },
      { title: "Reserve Bank of Australia – Education", url: "https://www.rba.gov.au/education/", description: "Monetary policy and inflation explanations", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GEOGRAPHY
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "geography",
    pastPapers: [
      // NSW
      { title: "NSW HSC Geography – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-resources?resource_types=Archive%2520HSC%2520exam%2520pack%2CHSC%2520exam%2520pack&category=HSIE", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Geography – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/geography", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Geography – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/humanities/geography", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Geography – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/geography-past-atar-course-exams", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Geography – Past Exams", url: "https://www.sace.sa.edu.au/web/geography/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Geography – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS Geography – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/geography", free: true, states: ["ACT"] },
      // Practice paper sites
      { title: "THSC Online – Geography Trial Papers (NSW)", url: "https://thsconline.github.io/s/yr12/Geography/", description: "School trial papers for HSC Geography, free", free: true, states: ["NSW"] },
      { title: "Art of Smart – HSC Geography Papers", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "Curated HSC Geography papers and study tips", free: true, states: ["NSW"] },
      { title: "Physics & Maths Tutor – A-Level Geography Questions", url: "https://www.physicsandmathstutor.com/geography-revision/", description: "Free exam-style questions on physical and human geography", free: true },
    ],
    textbooks: [
      { title: "National Geographic Education", url: "https://education.nationalgeographic.org/", description: "Free maps, articles, and geography resources", free: true },
      { title: "Geoscience Australia – Education", url: "https://www.ga.gov.au/education", description: "Australian geology and geography data", free: true },
      { title: "Bureau of Meteorology – Climate Education", url: "http://www.bom.gov.au/climate/", description: "Australian climate and weather education", free: true },
      { title: "CrashCourse Geography (YouTube)", url: "https://www.youtube.com/playlist?list=PL8dPuuaLjXtO85HnzPmR8EDfxDsaJXPiK", free: true },
      { title: "USGS – Earth Sciences Education", url: "https://www.usgs.gov/education", description: "Geological and geophysical data and explanations", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BUSINESS STUDIES
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "business",
    pastPapers: [
      // NSW
      { title: "NSW HSC Business Studies – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-resources?resource_types=Archive%2520HSC%2520exam%2520pack%2CHSC%2520exam%2520pack&category=HSIE", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Business Management – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/business-management", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Business – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/business/business", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Business Management & Enterprise – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/business-management-and-enterprise-past-atar-course-exams", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Business & Enterprise – Past Exams", url: "https://www.sace.sa.edu.au/web/business-and-enterprise/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Business Studies – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS Business – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/business", free: true, states: ["ACT"] },
      // Practice paper sites
      { title: "THSC Online – Business Studies Trial Papers (NSW)", url: "https://thsconline.github.io/s/yr12/Business%20Studies/", description: "School trial papers for HSC Business Studies, free", free: true, states: ["NSW"] },
      { title: "Art of Smart – HSC Business Studies Papers", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "Curated HSC Business papers and study tips", free: true, states: ["NSW"] },
      { title: "ACED VCE – Free Business Management Exams", url: "https://acedvce.com/free-practice-exams/", description: "Free previous-edition VCE Business Management practice exams", free: true, states: ["VIC"] },
    ],
    textbooks: [
      { title: "OpenStax Introduction to Business", url: "https://openstax.org/details/books/introduction-business", free: true },
      { title: "OpenStax Entrepreneurship", url: "https://openstax.org/details/books/entrepreneurship", free: true },
      { title: "Khan Academy – Finance & Markets", url: "https://www.khanacademy.org/economics-finance-domain/core-finance", free: true },
      { title: "CrashCourse Business (YouTube)", url: "https://www.youtube.com/playlist?list=PL8dPuuaLjXtMBsfHkuOBGZFBHlhCQDi2X", free: true },
      { title: "ASIC MoneySmart – Teaching Resources", url: "https://moneysmart.gov.au/teaching/", description: "Australian government financial literacy resources", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PDHPE / HEALTH & PHYSICAL EDUCATION
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "pdhpe",
    pastPapers: [
      // NSW
      { title: "NSW HSC PDHPE – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-resources?resource_types=Archive%2520HSC%2520exam%2520pack%2CHSC%2520exam%2520pack&category=PDHPE", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Health & Human Development – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/health-and-human-development", free: true, states: ["VIC"] },
      { title: "VCE Physical Education – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/physical-education", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Physical Education – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/health-pe/physical-education", free: true, states: ["QLD"] },
      { title: "QCAA Health – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/health-pe/health", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Physical Education Studies – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/physical-education-studies-past-atar-course-exams", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Health – Past Exams", url: "https://www.sace.sa.edu.au/web/health/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Sport Science / Health – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS Physical Education – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/physical_education", free: true, states: ["ACT"] },
      // Practice paper sites
      { title: "THSC Online – PDHPE Trial Papers (NSW)", url: "https://thsconline.github.io/s/yr12/Personal%20Development%2C%20Health%20and%20Physical%20Education/", description: "School trial papers for HSC PDHPE, free", free: true, states: ["NSW"] },
      { title: "Art of Smart – HSC PDHPE Papers & Guides", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "Curated HSC PDHPE papers and study tips", free: true, states: ["NSW"] },
      { title: "ACED VCE – Free Physical Education Practice Exams", url: "https://acedvce.com/free-practice-exams/", description: "Free previous-edition VCE PE practice exams", free: true, states: ["VIC"] },
    ],
    textbooks: [
      { title: "Better Health Channel", url: "https://www.betterhealth.vic.gov.au/", description: "Evidence-based health information", free: true },
      { title: "OpenStax Anatomy & Physiology 2e", url: "https://openstax.org/details/books/anatomy-and-physiology-2e", free: true },
      { title: "Khan Academy – Health & Medicine", url: "https://www.khanacademy.org/science/health-and-medicine", free: true },
      { title: "Australian Institute of Sport – Resources", url: "https://www.ais.gov.au/", description: "Sport science and performance information", free: true },
      { title: "Sport Australia", url: "https://www.sportaus.gov.au/", description: "Physical activity and sport information", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ENGINEERING
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "engineering",
    pastPapers: [
      // NSW
      { title: "NSW HSC Engineering Studies – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-resources?resource_types=Archive%2520HSC%2520exam%2520pack%2CHSC%2520exam%2520pack&category=Technological%2520and%2520Applied%2520Studies", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Engineering & Technology – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/engineering-and-technology", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Engineering – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/technologies/engineering", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Engineering Science – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/engineering-science-past-atar-course-exams", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Engineering – Past Exams", url: "https://www.sace.sa.edu.au/web/engineering/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Engineering – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS Engineering – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/engineering", free: true, states: ["ACT"] },
      // Practice paper sites
      { title: "THSC Online – Engineering Studies Trial Papers (NSW)", url: "https://thsconline.github.io/s/yr12/Engineering%20Studies/", description: "School trial papers for HSC Engineering Studies, free", free: true, states: ["NSW"] },
      { title: "Physics & Maths Tutor – A-Level Physics (Engineering foundation)", url: "https://www.physicsandmathstutor.com/physics-revision/", description: "Free mechanics and electricity questions — core engineering content", free: true },
      // University entrance tests
      { title: "Engineering Admissions Test (EAT) – Cambridge", url: "https://www.undergraduate.study.cam.ac.uk/courses/engineering/admissions-assessments", description: "University entrance test with practice papers", free: true },
    ],
    textbooks: [
      { title: "OpenStax University Physics Vol 1 (Mechanics)", url: "https://openstax.org/details/books/university-physics-volume-1", description: "Engineering mechanics foundation", free: true },
      { title: "MIT OCW – Engineering Mechanics", url: "https://ocw.mit.edu/courses/", description: "Free university engineering mechanics", free: true },
      { title: "The Engineering Toolbox", url: "https://www.engineeringtoolbox.com/", description: "Free engineering data and calculators", free: true },
      { title: "CrashCourse Engineering (YouTube)", url: "https://www.youtube.com/playlist?list=PL8dPuuaLjXtO4A_tL6DLZRotxEb114cMR", free: true },
      { title: "Engineers Without Borders Australia", url: "https://www.ewb.org.au/", description: "Engineering in real-world contexts", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MEDICINE / PRE-MED
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "medicine",
    pastPapers: [
      // University entrance tests (all states, yr 12+)
      { title: "UCAT ANZ – Official Practice Tests", url: "https://www.ucat.edu.au/ucat-anz/practice-tests/", description: "Official free UCAT ANZ practice materials", free: true },
      { title: "BMAT Past Papers", url: "https://www.admissionstesting.org/for-test-takers/bmat/preparing-for-bmat/", description: "BioMedical Admissions Test free past papers", free: true },
      { title: "MedEntry UCAT Practice", url: "https://www.medentry.edu.au/ucat-prep/free-trial", description: "Leading Aus UCAT prep — free trial materials available", free: false },
      { title: "Save My Exams – A-Level Biology (pre-med content)", url: "https://www.savemyexams.com/a-level/biology/", description: "Detailed topic questions on cell biology, genetics, physiology", free: false },
      // NSW — HSC Biology and Chemistry as foundation
      { title: "NSW HSC Biology – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers?category=Biology", description: "Core HSC biology", free: true, states: ["NSW"] },
      { title: "NSW HSC Chemistry – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers?category=Chemistry", description: "Core HSC chemistry", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Biology – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/biology", free: true, states: ["VIC"] },
      { title: "VCE Chemistry – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/chemistry", free: true, states: ["VIC"] },
      // WA
      { title: "WA ATAR Biology – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/biology-past-atar-course-exams", free: true, states: ["WA"] },
      { title: "WA ATAR Chemistry – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/chemistry-past-atar-course-exams", free: true, states: ["WA"] },
    ],
    textbooks: [
      { title: "OpenStax Anatomy & Physiology 2e", url: "https://openstax.org/details/books/anatomy-and-physiology-2e", free: true },
      { title: "OpenStax Biology 2e", url: "https://openstax.org/details/books/biology-2e", free: true },
      { title: "OpenStax Chemistry 2e", url: "https://openstax.org/details/books/chemistry-2e", free: true },
      { title: "Khan Academy – Health & Medicine", url: "https://www.khanacademy.org/science/health-and-medicine", free: true },
      { title: "Medscape – Medical Reference", url: "https://reference.medscape.com/", description: "Free clinical reference tool", free: true },
      { title: "NCBI Bookshelf – Medical Texts", url: "https://www.ncbi.nlm.nih.gov/books/", description: "Free online medical textbooks", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMMERCE / ACCOUNTING
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "commerce",
    pastPapers: [
      // NSW
      { title: "NSW HSC Commerce – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers?category=Commerce", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Accounting – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/accounting", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Accounting – Syllabus & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/business/accounting", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Accounting & Finance – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams/accounting-and-finance-past-atar-course-exams", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Accounting – Past Exams", url: "https://www.sace.sa.edu.au/web/accounting/external-assessment", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Accounting – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS Accounting – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/accounting", free: true, states: ["ACT"] },
      // Practice paper sites
      { title: "THSC Online – Commerce Trial Papers (NSW)", url: "https://thsconline.github.io/s/yr12/Commerce/", description: "School trial papers for HSC Commerce, free", free: true, states: ["NSW"] },
      { title: "Art of Smart – HSC Commerce Papers & Guides", url: "https://artofsmart.com.au/learn/hsc-past-papers/", description: "Curated HSC Commerce papers and study tips", free: true, states: ["NSW"] },
      { title: "ACED VCE – Free Accounting Practice Exams", url: "https://acedvce.com/free-practice-exams/", description: "Free previous-edition VCE Accounting practice exams", free: true, states: ["VIC"] },
    ],
    textbooks: [
      { title: "OpenStax Financial Accounting", url: "https://openstax.org/details/books/principles-financial-accounting", free: true },
      { title: "OpenStax Managerial Accounting", url: "https://openstax.org/details/books/principles-managerial-accounting", free: true },
      { title: "ASIC MoneySmart", url: "https://moneysmart.gov.au/", description: "Australian government financial literacy", free: true },
      { title: "Khan Academy – Finance", url: "https://www.khanacademy.org/economics-finance-domain/core-finance", free: true },
      { title: "Australian Tax Office – Tax Education", url: "https://www.ato.gov.au/", description: "Tax basics and regulations", free: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LANGUAGES
  // ─────────────────────────────────────────────────────────────────────────
  {
    subjectId: "languages",
    pastPapers: [
      // NSW
      { title: "NSW HSC Languages – NESA Exam Papers", url: "https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-resources?resource_types=Archive%2520HSC%2520exam%2520pack%2CHSC%2520exam%2520pack&category=Languages", description: "French, Japanese, Chinese, Spanish, German, Italian, Korean, Arabic, and more", free: true, states: ["NSW"] },
      // VIC
      { title: "VCE Languages – Past Exams (VCAA)", url: "https://www.vcaa.vic.edu.au/assessment/vce/examination-specifications-past-examinations-and-examination-reports/languages", description: "All VCE language subjects", free: true, states: ["VIC"] },
      // QLD
      { title: "QCAA Languages – Syllabuses & Sample Papers", url: "https://www.qcaa.qld.edu.au/senior/senior-subjects/syllabuses/languages", free: true, states: ["QLD"] },
      // WA
      { title: "WA ATAR Languages – Past Exams (SCSA)", url: "https://senior-secondary.scsa.wa.edu.au/further-resources/past-atar-course-exams", description: "Browse by language from the SCSA list", free: true, states: ["WA"] },
      // SA/NT
      { title: "SACE Languages – Past Exams", url: "https://www.sace.sa.edu.au/studying/subjects/languages", description: "SACE language subject external assessments", free: true, states: ["SA", "NT"] },
      // TAS
      { title: "TASC Languages – Previous Exam Papers", url: "https://www.tasc.tas.gov.au/students/years-11-and-12/preparing-for-exams/previous-exam-papers/", description: "Includes Italian, Japanese, French and more", free: true, states: ["TAS"] },
      // ACT
      { title: "BSSS Languages – ACT Senior Secondary", url: "https://www.bsss.act.edu.au/student_programs/courses/languages", free: true, states: ["ACT"] },
      // Practice paper sites
      { title: "THSC Online – Languages Trial Papers (NSW)", url: "https://thsconline.github.io/s/yr12/Languages/", description: "School trial papers for HSC language subjects, free", free: true, states: ["NSW"] },
      // International proficiency tests (all states)
      { title: "JLPT Sample Questions (Japanese)", url: "https://www.jlpt.jp/e/samples/sampleindex.html", description: "Official Japanese Language Proficiency Test samples", free: true },
      { title: "DELF Sample Papers (French)", url: "https://www.france-education-international.fr/diplome/delf-dalf", description: "Official French proficiency test samples", free: true },
      { title: "Goethe-Institut Practice Tests (German)", url: "https://www.goethe.de/en/spr/kup/ueb.html", description: "Official German language test samples", free: true },
      { title: "Instituto Cervantes – Spanish DELE Samples", url: "https://examenes.cervantes.es/es/dele/preparacion", description: "Official Spanish DELE practice materials", free: true },
    ],
    textbooks: [
      { title: "Duolingo", url: "https://www.duolingo.com/", description: "Free gamified language learning, 40+ languages", free: true },
      { title: "BBC Learning English", url: "https://www.bbc.co.uk/learningenglish/", description: "English and other languages free courses", free: true },
      { title: "Lingolia – Grammar & Exercises", url: "https://www.lingolia.com/en/", description: "Free French, German, Spanish, Italian grammar", free: true },
      { title: "Anki – Flashcard App", url: "https://apps.ankiweb.net/", description: "Free spaced-repetition vocabulary app", free: true },
      { title: "Forvo – Pronunciation Dictionary", url: "https://forvo.com/", description: "Free native speaker pronunciations", free: true },
      { title: "Language Transfer – Free Audio", url: "https://www.languagetransfer.org/", description: "Free audio-based language courses", free: true },
      { title: "NHK World Japanese Lessons", url: "https://www3.nhk.or.jp/nhkworld/en/learnjapanese/", description: "Free Japanese from Japan's broadcaster", free: true },
    ],
  },
];

export default RESOURCES;
