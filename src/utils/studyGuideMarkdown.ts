import type { GeneratedStudyGuide } from "@/services/groq";

const section = (title: string, body: string[]) => {
  const content = body.filter(Boolean).join("\n").trim();
  if (!content) return "";
  return `## ${title}\n\n${content}`;
};

const bullets = (items?: string[]) =>
  (items || [])
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");

const numbered = (items?: string[]) =>
  (items || [])
    .filter(Boolean)
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");

const qaBlocks = (
  items?: Array<{ question: string; answer: string; type?: string; hint?: string }>,
) =>
  (items || [])
    .map((item, index) => {
      const lines = [
        `### Question ${index + 1}${item.type ? ` · ${item.type}` : ""}`,
        item.question,
        item.hint ? `Hint: ${item.hint}` : "",
        item.answer ? `Answer: ${item.answer}` : "",
      ].filter(Boolean);

      return lines.join("\n\n");
    })
    .join("\n\n");

export const studyGuideToMarkdown = (guide: GeneratedStudyGuide) => {
  const meta = [
    guide.assessmentType ? `- Assessment type: ${guide.assessmentType}` : "",
    guide.assessmentDate ? `- Assessment date: ${guide.assessmentDate}` : "",
    guide.weighting ? `- Weighting: ${guide.weighting}` : "",
    guide.totalMarks ? `- Total marks: ${guide.totalMarks}` : "",
    guide.examDuration ? `- Duration: ${guide.examDuration}` : "",
  ].filter(Boolean);

  const keyConcepts = (guide.keyConcepts || [])
    .map((item) => `### ${item.title}\n\n${item.content}`)
    .join("\n\n");

  const studySchedule = (guide.studySchedule || [])
    .map((week) => {
      const tasks = week.tasks.map((task) => `- ${task}`).join("\n");
      return `### Week ${week.week}${week.label ? ` · ${week.label}` : ""}\n\n${tasks}`;
    })
    .join("\n\n");

  const glossary = (guide.glossary || [])
    .map((item) => `- **${item.term}**: ${item.definition}`)
    .join("\n");

  const formulaSheet = (guide.formulaSheet || [])
    .map((entry) => {
      const lines = [
        `### ${entry.formula}`,
        entry.description,
        entry.variables ? `Variables: ${entry.variables}` : "",
        entry.example ? `Example: ${entry.example}` : "",
      ].filter(Boolean);
      return lines.join("\n\n");
    })
    .join("\n\n");

  const rubric = (guide.rubricBreakdown || [])
    .map((row) => {
      const lines = [
        `### ${row.criterion}${row.marks ? ` (${row.marks} marks)` : ""}`,
        row.excellent ? `- Excellent: ${row.excellent}` : "",
        row.satisfactory ? `- Satisfactory: ${row.satisfactory}` : "",
        row.developing ? `- Developing: ${row.developing}` : "",
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");

  const customSections = (guide.customSections || [])
    .map((item) => {
      if (item.type === "table" && Array.isArray(item.content)) {
        const rows = item.content as string[][];
        if (!rows.length) return "";
        const [header, ...body] = rows;
        const headerRow = `| ${header.join(" | ")} |`;
        const separator = `| ${header.map(() => "---").join(" | ")} |`;
        const bodyRows = body.map((row) => `| ${row.join(" | ")} |`).join("\n");
        return section(item.title, [headerRow, separator, bodyRows]);
      }

      if (item.type === "steps" && Array.isArray(item.content)) {
        return section(item.title, [numbered(item.content as string[])]);
      }

      if (item.type === "list" && Array.isArray(item.content)) {
        return section(item.title, [bullets(item.content as string[])]);
      }

      return section(item.title, [String(item.content || "")]);
    })
    .filter(Boolean)
    .join("\n\n");

  return [
    `# ${guide.title || "Study Guide"}`,
    guide.overview || "",
    meta.length ? `> Quick facts\n${meta.join("\n")}` : "",
    section("Key Points", [bullets(guide.keyPoints)]),
    section("Topics", [bullets(guide.topics)]),
    section("Required Materials", [bullets(guide.requiredMaterials)]),
    section("Task Structure", [
      guide.taskStructure?.practical?.length ? `### Practical\n\n${bullets(guide.taskStructure.practical)}` : "",
      guide.taskStructure?.written?.length ? `### Written\n\n${bullets(guide.taskStructure.written)}` : "",
    ]),
    section("Study Schedule", [studySchedule]),
    section("Core Concepts", [keyConcepts]),
    section(
      "Key Table",
      guide.keyTable?.headers?.length && guide.keyTable.rows?.length
        ? [
            `| ${guide.keyTable.headers.join(" | ")} |`,
            `| ${guide.keyTable.headers.map(() => "---").join(" | ")} |`,
            ...guide.keyTable.rows.map((row) => `| ${row.join(" | ")} |`),
          ]
        : [],
    ),
    section("Practice Questions", [qaBlocks(guide.practiceQuestions)]),
    section(
      "Grade Expectations",
      (guide.gradeExpectations || []).map((item) => `### ${item.grade}\n\n${bullets(item.criteria)}`),
    ),
    section("Resources", [bullets(guide.resources)]),
    section("Study Tips", [bullets(guide.tips)]),
    section("Common Mistakes", [bullets(guide.commonMistakes)]),
    section("Glossary", [glossary]),
    section("Formula Sheet", [formulaSheet]),
    section(
      "Experiment Guide",
      guide.experimentGuide
        ? [
            guide.experimentGuide.aim ? `### Aim\n\n${guide.experimentGuide.aim}` : "",
            guide.experimentGuide.hypothesis ? `### Hypothesis\n\n${guide.experimentGuide.hypothesis}` : "",
            guide.experimentGuide.variables
              ? section("Variables", [
                  guide.experimentGuide.variables.independent
                    ? `- Independent: ${guide.experimentGuide.variables.independent}`
                    : "",
                  guide.experimentGuide.variables.dependent
                    ? `- Dependent: ${guide.experimentGuide.variables.dependent}`
                    : "",
                  guide.experimentGuide.variables.controlled?.length
                    ? `- Controlled: ${guide.experimentGuide.variables.controlled.join(", ")}`
                    : "",
                ])
              : "",
            guide.experimentGuide.method?.length ? `### Method\n\n${numbered(guide.experimentGuide.method)}` : "",
            guide.experimentGuide.safetyNotes?.length
              ? `### Safety Notes\n\n${bullets(guide.experimentGuide.safetyNotes)}`
              : "",
          ]
        : [],
    ),
    section(
      "Timeline",
      (guide.timeline || []).map((item) =>
        `### ${item.year}\n\n${item.event}${item.significance ? `\n\nWhy it matters: ${item.significance}` : ""}`,
      ),
    ),
    section(
      "Source Analysis Framework",
      guide.sourceAnalysisFramework
        ? [
            guide.sourceAnalysisFramework.steps?.length
              ? `### Steps\n\n${numbered(guide.sourceAnalysisFramework.steps)}`
              : "",
            guide.sourceAnalysisFramework.keyQuestions?.length
              ? `### Key Questions\n\n${bullets(guide.sourceAnalysisFramework.keyQuestions)}`
              : "",
          ]
        : [],
    ),
    section("Rubric Breakdown", [rubric]),
    customSections,
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
};
