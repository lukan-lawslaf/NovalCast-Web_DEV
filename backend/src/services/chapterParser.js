'use strict';

/**
 * Chapter boundary detection.
 *
 * Different Gutenberg texts mark chapters differently, so the parser tries
 * strategies in order of confidence and uses the first one that finds at least
 * two chapters:
 *
 *   1. spec pattern      — "CHAPTER I", "Chapter 1", "ACT II", "BOOK III",
 *                          "LETTER 2", "SCENE 4", "PART I", "ADVENTURE I"
 *   2. roman numerals    — "I. A Scandal in Bohemia", "I Introduction"
 *   3. ALL-CAPS headings — standalone "STORY OF THE DOOR" (Dr Jekyll)
 *   4. ~2,500-word sections — last resort for texts with no markers at all
 */

const {
  countWords,
  isHeadingLike,
  isNarrative,
  unwrapBrackets,
  FRONT_MATTER_HEADING,
} = require('./textCleaner');

const DEFAULT_FALLBACK_WORDS = 2500;

/** Above this average words-per-section, a split is a wrapper rather than chapters. */
const COARSE_SECTION_WORDS = 8000;

/**
 * A section this short is a leftover heading or subtitle, not a chapter — a
 * story title above a story heading, a stray contents line. Such fragments are
 * folded into the section that follows them.
 */
const MIN_SECTION_WORDS = 20;

/** The pattern from the brief, with PART, LETTER and ADVENTURE added for real-world texts. */
const SPEC_HEADING =
  /^(?:CHAPTER|ACT|SCENE|BOOK|PART|LETTER|ADVENTURE)\s+([0-9IVXLCDM]+|[A-Za-z]+)(?:[\s:.\-—]+(.*))?$/i;

/**
 * Roman numeral headings. A separator is required between the numeral and the
 * title — without it "INCIDENT OF THE LETTER" parses as "I" + "NCIDENT...".
 */
const ROMAN_BARE = /^([IVXLCDM]{1,7})\.?$/;
const ROMAN_TITLED = /^([IVXLCDM]{1,7})\.?[\s:.\-—]+([A-Z].{0,80})$/;

const CAPS_HEADING = /^[A-Z][A-Z0-9 ,'’.\-]{3,58}$/;

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const ROMAN_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with',
  'by', 'from', 'as', 'but', 'nor', 'per', 'via', 'vs',
]);

function romanToInt(roman) {
  const text = String(roman).toUpperCase();
  if (!/^[IVXLCDM]+$/.test(text)) return null;

  let total = 0;
  for (let i = 0; i < text.length; i += 1) {
    const value = ROMAN_VALUES[text[i]];
    const next = ROMAN_VALUES[text[i + 1]];
    total += next && value < next ? -value : value;
  }
  return total > 0 && total < 5000 ? total : null;
}

/** "12" -> 12, "IV" -> 4, "Twenty-One" -> 21. Returns null when unparseable. */
function parseChapterNumber(token) {
  if (!token) return null;
  const text = String(token).trim();
  if (!text) return null;

  if (/^[0-9]+$/.test(text)) return Number(text);
  if (/^[IVXLCDM]+$/i.test(text)) return romanToInt(text);

  const words = text.toLowerCase().split(/[\s-]+/).filter(Boolean);
  if (!words.length || words.some((word) => !(word in NUMBER_WORDS))) return null;
  return words.reduce((sum, word) => sum + NUMBER_WORDS[word], 0);
}

/** Strategy 1 — the brief's pattern. */
function matchSpecHeading(line) {
  const text = unwrapBrackets(line);
  const match = SPEC_HEADING.exec(text);
  if (!match) return null;

  const number = parseChapterNumber(match[1]);
  if (number === null) return null;

  const label = /^([A-Za-z]+)/.exec(text);
  return {
    number,
    title: (match[2] || '').trim(),
    heading: label ? label[1].toUpperCase() : 'CHAPTER',
  };
}

/** Strategy 2 — roman numeral headings that carry an inline title. */
function matchRomanTitledHeading(line) {
  const text = unwrapBrackets(line);
  const titled = ROMAN_TITLED.exec(text);
  if (!titled) return null;

  const number = romanToInt(titled[1]);
  if (number === null) return null;
  return { number, title: titled[2].trim(), heading: 'CHAPTER' };
}

/**
 * Strategy 3 — roman numerals with or without a title. Bare numerals are only
 * trusted when the titled form found nothing, because a stray "II." inside a
 * story would otherwise split it in half.
 */
function matchRomanHeading(line) {
  const titled = matchRomanTitledHeading(line);
  if (titled) return titled;

  const bare = ROMAN_BARE.exec(unwrapBrackets(line));
  if (!bare) return null;

  const number = romanToInt(bare[1]);
  if (number === null) return null;
  return { number, title: '', heading: 'CHAPTER' };
}

/** Strategy 4 — standalone ALL-CAPS headings (Dr Jekyll and Mr Hyde). */
function matchCapsHeading(line) {
  const text = unwrapBrackets(line);
  if (!CAPS_HEADING.test(text)) return null;
  if (!/\s[A-Z]/.test(text)) return null;

  const words = text.split(/\s+/);
  if (words.length < 2 || words.length > 9) return null;

  return { number: null, title: text.replace(/\.$/, ''), heading: 'SECTION' };
}

const STRATEGIES = [
  matchSpecHeading,
  matchRomanTitledHeading,
  matchRomanHeading,
  matchCapsHeading,
];

/** "CHAPTER XI." -> "Chapter XI"; "STORY OF THE DOOR" -> "Story of the Door". */
function humanizeHeading(raw) {
  const text = unwrapBrackets(raw).replace(/[.:;,\s]+$/, '').trim();
  if (!text) return '';

  // A bare numeral is its own label; title-casing it would produce "Ii".
  if (/^[IVXLCDM]+$/i.test(text)) return text;

  if (/^(CHAPTER|ACT|SCENE|BOOK|PART|LETTER|ADVENTURE)\b/i.test(text)) {
    return text.replace(/^([A-Za-z]+)/, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }

  if (/^[A-Z0-9 ,'’.\-]+$/.test(text)) {
    return text
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        if (index > 0 && SMALL_WORDS.has(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  return text;
}

/** The label for a chapter heading: "Chapter I", "Letter 1", "CHAPTER XI" -> "Chapter XI". */
function chapterLabel(section) {
  const raw = unwrapBrackets(section.rawHeading || '').replace(/[.:;,\s]+$/, '').trim();
  if (!raw) return '';

  if (/^(CHAPTER|ACT|SCENE|BOOK|PART|LETTER|ADVENTURE)\b/i.test(raw)) return humanizeHeading(raw);
  return section.number ? `Chapter ${humanizeHeading(raw)}` : humanizeHeading(raw);
}

/** Fall back to the heading itself when a chapter has no explicit title. */
function synthesizeTitle(section) {
  return chapterLabel(section);
}

/** True when a line looks like prose rather than a chapter title. */
function looksLikeProse(line) {
  if (line.length > 60) return true;
  if (line.split(/\s+/).length > 9) return true;
  if (/[,;:]$/.test(line)) return true;
  // "Mrs. Saville", "Dr. Jekyll" — abbreviations give away a salutation or prose.
  return /\b[A-Z][a-z]+\.\s+[A-Z]/.test(line);
}

/**
 * Split cleaned text into chapters using one strategy.
 * @returns {{sections: Array, preamble: string[]}}
 */
function splitWith(matcher, text) {
  const blocks = text.split(/\n{2,}/);
  const sections = [];
  const preamble = [];
  let current = null;

  for (const block of blocks) {
    const firstLine = block.split('\n')[0];
    const match = matcher(firstLine);

    if (match) {
      if (current) sections.push(current);
      current = {
        title: match.title || '',
        content: block.split('\n').slice(1).join('\n').trim(),
        number: match.number,
        rawHeading: firstLine,
      };
      continue;
    }

    if (current) {
      current.content = current.content ? `${current.content}\n\n${block}` : block;
    } else {
      preamble.push(block);
    }
  }

  if (current) sections.push(current);

  // A heading with no inline title often has it on the next line
  // ("CHAPTER I." / "Down the Rabbit-Hole", "CHAPTER I" / "JONATHAN HARKER'S JOURNAL").
  for (const section of sections) {
    if (section.title || !section.content) continue;

    const [firstLine, ...restLines] = section.content.split('\n');
    const candidate = (firstLine || '').trim();

    if (!candidate) continue;
    if (/^\[.*\]$/.test(candidate) || /^\[illustration/i.test(candidate)) continue;
    if (isNarrative(candidate) || looksLikeProse(candidate)) continue;

    // Keep the chapter number so the reader's table of contents stays useful:
    // "Chapter I: Down the Rabbit-Hole".
    section.title = section.number
      ? `${chapterLabel(section)}: ${candidate}`
      : candidate;
    section.content = restLines.join('\n').trim();
  }

  return { sections, preamble };
}

/** Strategy 4 — fixed-size reading sections. */
function splitIntoWordSections(text, wordsPerSection) {
  const blocks = text.split(/\n{2,}/);
  const sections = [];
  let buffer = [];
  let bufferWords = 0;

  const flush = () => {
    if (!buffer.length) return;
    sections.push({
      title: `Section ${sections.length + 1}`,
      content: buffer.join('\n\n'),
      number: null,
      rawHeading: '',
    });
    buffer = [];
    bufferWords = 0;
  };

  for (const block of blocks) {
    buffer.push(block);
    bufferWords += countWords(block);
    if (bufferWords >= wordsPerSection) flush();
  }
  flush();

  return { sections, preamble: [] };
}

function cleanTitle(title) {
  return String(title || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:—\-.]+/, '')
    .replace(/[\s:—\-.]+$/, '')
    .trim();
}

/** Fold heading fragments into the section that follows them. */
function mergeTinySections(sections) {
  const output = [];
  let pending = [];

  for (const section of sections) {
    if (countWords(section.content) < MIN_SECTION_WORDS) {
      pending.push(section);
      continue;
    }

    if (pending.length) {
      const carried = pending.map((item) => item.content).filter(Boolean).join('\n\n');
      if (carried) section.content = `${carried}\n\n${section.content}`;
      if (!section.title) section.title = pending[0].title;
      pending = [];
    }

    output.push(section);
  }

  for (const section of pending) output.push(section);
  return output;
}

/**
 * Story text before the first marker (letters, a prologue, a long editorial
 * preface) is kept rather than discarded, as long as it carries real content.
 */
function buildPreambleSection(text) {
  const lines = text.split('\n');

  // Front matter often opens with illustration captions and a printer's
  // colophon before the real heading, so scan ahead for a "PREFACE." marker
  // and drop whatever sits above it.
  for (let i = 0; i < Math.min(lines.length, 20); i += 1) {
    const line = lines[i].trim();
    if (!FRONT_MATTER_HEADING.test(line)) continue;

    const rest = lines.slice(i + 1).join('\n').trim();
    if (rest) {
      return {
        title: humanizeHeading(line.replace(/\.$/, '')),
        content: rest,
        number: null,
        rawHeading: line,
      };
    }
  }

  return { title: 'Front Matter', content: text, number: null, rawHeading: '' };
}

/** Stray bare roman numerals left over from a story heading are dropped. */
function tidyContent(content) {
  return content
    .split('\n')
    .filter((line) => !/^[IVXLCDM]{1,6}\.?$/.test(line.trim()))
    .join('\n')
    .trim();
}

/**
 * Parse a cleaned book into chapter documents (without the bookId).
 * @param {string} text output of cleanGutenbergText().text
 * @param {{fallbackWords?: number, minChapters?: number}} [options]
 */
function parseChapters(text, options = {}) {
  const { fallbackWords = DEFAULT_FALLBACK_WORDS, minChapters = 2 } = options;
  if (!text || !text.trim()) return [];

  // Every strategy is evaluated before choosing. Taking the first one that
  // finds two chapters is wrong for books like The War of the Worlds, where a
  // two-way "BOOK ONE / BOOK TWO" split sits on top of thirty-odd chapter
  // headings that a looser strategy finds.
  const candidates = [];
  for (const strategy of STRATEGIES) {
    const { sections, preamble } = splitWith(strategy, text);
    const usable = sections.filter((section) => countWords(section.content) > 0);
    if (usable.length >= minChapters) {
      candidates.push({
        name: strategy.name,
        sections: usable,
        preamble,
        count: usable.length,
        words: usable.reduce((sum, section) => sum + countWords(section.content), 0),
      });
    }
  }

  let chosen = candidates[0] || null;
  for (const candidate of candidates.slice(1)) {
    if (!chosen) {
      chosen = candidate;
      continue;
    }
    // A section averaging many thousands of words is not a chapter — it is a
    // wrapper (BOOK/PART) around a finer structure. Treasure Island divides
    // into six parts of ~11,000 words each, hiding 34 chapters inside them.
    const averageWords = chosen.words / chosen.count;
    if (averageWords > COARSE_SECTION_WORDS && candidate.count > chosen.count * 2) {
      chosen = candidate;
    }
  }

  let chosenName = chosen ? chosen.name : 'splitIntoWordSections';

  if (!chosen) {
    const { sections } = splitIntoWordSections(text, fallbackWords);
    chosen = { sections, preamble: [] };
  }

  const preambleText = (chosen.preamble || []).join('\n\n').trim();
  const sections = mergeTinySections(chosen.sections);

  if (countWords(preambleText) >= 200) {
    sections.unshift(buildPreambleSection(preambleText));
  }

  const chapters = sections
    .map((section) => {
      const title = cleanTitle(section.title) || synthesizeTitle(section);
      return { title, content: tidyContent(section.content) };
    })
    .filter((chapter) => chapter.content && countWords(chapter.content) > 0)
    .map((chapter, index) => ({
      chapterNumber: index + 1,
      order: index + 1,
      title: chapter.title,
      content: chapter.content,
      wordCount: countWords(chapter.content),
    }));

  const untitled = chapters.filter((chapter) => !chapter.title).length;
  console.log(
    `[chapterParser] ${chapters.length} chapters via ${chosenName}` +
      ` (${chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)} words, ${untitled} untitled).`
  );

  return chapters;
}

module.exports = {
  parseChapters,
  parseChapterNumber,
  romanToInt,
  humanizeHeading,
  matchSpecHeading,
  matchRomanTitledHeading,
  matchRomanHeading,
  matchCapsHeading,
  SPEC_HEADING,
  ROMAN_BARE,
  ROMAN_TITLED,
};
