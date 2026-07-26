export interface FocusResource {
  title: string;
  description: string;
  url: string;
  kind: "Grammar" | "Vocabulary" | "Practice";
}

const GOETHE_VOCABULARY =
  "https://www.goethe.de/pro/relaunch/prf/en/Goethe-Zertifikat_A2_Wortliste.pdf";
const GOETHE_PRACTICE =
  "https://www.goethe.de/ins/de/en/m/prf/prf/gzsd2/ub2.html";
const LINGOLIA = "https://deutsch.lingolia.com/en/grammar";

export const focusResources: Record<string, FocusResource[]> = {
  T0: [
    {
      title: "Goethe A2 vocabulary list",
      description: "Download the exact A2 word list and set up a focused vocabulary notebook.",
      url: GOETHE_VOCABULARY,
      kind: "Vocabulary",
    },
    {
      title: "Goethe A2 practice hub",
      description: "Save the official reading, listening, writing and speaking practice sets.",
      url: GOETHE_PRACTICE,
      kind: "Practice",
    },
  ],
  T1: [
    {
      title: "Accusative personal pronouns",
      description: "Practise mich, dich, ihn, sie, uns and euch with clear examples.",
      url: `${LINGOLIA}/pronouns/personal-pronouns`,
      kind: "Grammar",
    },
    {
      title: "German sentence order",
      description: "Review the word-order rules used for plans, invitations and appointments.",
      url: `${LINGOLIA}/sentence-structure`,
      kind: "Grammar",
    },
  ],
  T2: [
    {
      title: "Comparative & superlative",
      description: "Compare routes, tickets, hotels and transport options naturally.",
      url: `${LINGOLIA}/adjectives`,
      kind: "Grammar",
    },
    {
      title: "Prepositions for travel",
      description: "Review the cases used with mit, nach, zu and bei.",
      url: `${LINGOLIA}/prepositions`,
      kind: "Grammar",
    },
  ],
  T3: [
    {
      title: "Wo or wohin? Two-way prepositions",
      description: "Understand Akkusativ versus Dativ for rooms, furniture and movement.",
      url: `${LINGOLIA}/declension`,
      kind: "Grammar",
    },
    {
      title: "Prepositions and cases",
      description: "Use in, an, auf, neben and zwischen for apartment descriptions.",
      url: `${LINGOLIA}/prepositions`,
      kind: "Grammar",
    },
  ],
  T4: [
    {
      title: "Wenn clauses",
      description: "Build practical conditional sentences for appointments and official forms.",
      url: `${LINGOLIA}/sentence-structure/dependent-clauses/conditional-clauses`,
      kind: "Grammar",
    },
    {
      title: "Dependent-clause word order",
      description: "Keep the verb in the right place during formal calls and requests.",
      url: `${LINGOLIA}/sentence-structure/dependent-clauses`,
      kind: "Grammar",
    },
  ],
  T5: [
    {
      title: "Perfekt with haben & sein",
      description: "Talk about education, biography and important life events in the past.",
      url: `${LINGOLIA}/tenses/present-perfect`,
      kind: "Grammar",
    },
    {
      title: "A2 vocabulary reference",
      description: "Find useful words for school, training, qualifications and personal history.",
      url: GOETHE_VOCABULARY,
      kind: "Vocabulary",
    },
  ],
  T6: [
    {
      title: "Reflexive verbs",
      description: "Use reflexive verbs confidently when describing work and career goals.",
      url: `${LINGOLIA}/verbs/reflexive-verbs`,
      kind: "Grammar",
    },
    {
      title: "Weil, denn and sentence links",
      description: "Give clear reasons in applications and conversations about work.",
      url: `${LINGOLIA}/sentence-structure/dependent-clauses`,
      kind: "Grammar",
    },
  ],
  T7: [
    {
      title: "Adjective endings",
      description: "Describe clothes, colours, sizes, food and restaurant choices accurately.",
      url: `${LINGOLIA}/adjectives/declension`,
      kind: "Grammar",
    },
    {
      title: "Comparing products and prices",
      description: "Review adjective comparisons for shopping and restaurant situations.",
      url: `${LINGOLIA}/adjectives`,
      kind: "Grammar",
    },
  ],
  T8: [
    {
      title: "Modal verbs at work",
      description: "Practise müssen, dürfen, sollen and polite workplace expectations.",
      url: `${LINGOLIA}/verbs/modal-verbs`,
      kind: "Grammar",
    },
    {
      title: "Passive voice introduction",
      description: "Understand how instructions and processes are described at work.",
      url: `${LINGOLIA}/verbs/passive`,
      kind: "Grammar",
    },
  ],
  T9: [
    {
      title: "Modal verbs in the past",
      description: "Practise konnte, musste, wollte and durfte for childhood stories.",
      url: `${LINGOLIA}/verbs/modal-verbs`,
      kind: "Grammar",
    },
    {
      title: "Präteritum essentials",
      description: "Review simple-past forms for school days and earlier experiences.",
      url: `${LINGOLIA}/tenses/simple-past`,
      kind: "Grammar",
    },
  ],
  T10: [
    {
      title: "Imperative for health advice",
      description: "Give and understand clear advice about symptoms, medicine and recovery.",
      url: `${LINGOLIA}/verbs/imperative`,
      kind: "Grammar",
    },
    {
      title: "Prepositions and cases",
      description: "Review für, gegen and common case patterns used at the doctor.",
      url: `${LINGOLIA}/prepositions`,
      kind: "Grammar",
    },
  ],
  T11: [
    {
      title: "Indirect questions",
      description: "Ask polite, precise questions about accounts, cards and payments.",
      url: `${LINGOLIA}/sentence-structure/dependent-clauses/indirect-questions`,
      kind: "Grammar",
    },
    {
      title: "Simple relative clauses",
      description: "Add useful detail when explaining bank and payment problems.",
      url: `${LINGOLIA}/sentence-structure/dependent-clauses/relative-clauses`,
      kind: "Grammar",
    },
  ],
  T12: [
    {
      title: "A2 exam practice",
      description: "Use the official practice sets for the final reading, listening and speaking run.",
      url: GOETHE_PRACTICE,
      kind: "Practice",
    },
    {
      title: "Reflexive verbs refresher",
      description: "Review a key grammar theme before the final speaking practice.",
      url: `${LINGOLIA}/verbs/reflexive-verbs`,
      kind: "Grammar",
    },
  ],
};
