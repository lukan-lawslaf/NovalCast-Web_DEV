'use strict';

/**
 * Project Gutenberg text cleaner.
 *
 * Turns a raw pg*.txt file into readable prose:
 *   1. slice the licence header/footer off using the START/END markers
 *   2. drop front matter that is navigation rather than story
 *      (title page, contents listing, transcriber notes)
 *   3. reflow hard-wrapped lines back into paragraphs
 *   4. normalise typographic variants to one canonical set
 *
 * The contents listing is the tricky part: Gutenberg prefixes it with a
 * "Contents" heading and the entries look exactly like the chapter headings in
 * the body. The listing is therefore skipped until the body repeats its *first*
 * entry — a table of contents always starts with the same chapter the body
 * does, so that repeat is an unambiguous end-of-listing marker.
 */

const START_MARKER = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i;
const END_MARKER = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i;

const CONTENTS_HEADING = /^\s*(?:table of )?contents\.?\s*$/i;
const ILLUSTRATIONS_HEADING = /^\s*(?:list of )?(?:illustrations|plates|figures)\.?\s*$/i;
const PRODUCTION_NOTICE =
  /^\s*(?:produced by|transcribed|transcriber'?s? notes?|e-?text (?:prepared|created|was)|notes? (?:on|about) the (?:text|e-?text)|this e-?text)\b/i;
const PREFACE_HEADING = /^\s*(?:preface|foreword)\.?\s*$/i;
const FRONT_MATTER_HEADING =
  /^\s*(?:the\s+)?(?:preface|foreword|introduction|prologue|epilogue|editor'?s note|translator'?s note|author'?s note)\b/i;

/** Word count above which a "Preface" is treated as real content, not boilerplate. */
const PREFACE_WORD_LIMIT = 300;

/** How far past a contents heading to look for the body's opening chapter. */
const LISTING_SCAN_LIMIT = 1200;

/** A line this short is a deliberate break, not the end of a wrapped line. */
const SHORT_LINE_BREAK = 40;

const CHAPTER_HINT = /^(?:CHAPTER|ACT|SCENE|BOOK|PART|LETTER|ADVENTURE)\b/i;
const ROMAN_ONLY = /^[IVXLCDM]{1,7}\.?$/;
/** "I. A SCANDAL IN BOHEMIA" or "I Introduction" — a numeral heading with a title. */
const ROMAN_TITLED_LINE = /^[IVXLCDM]{1,7}\.[\s:.\-—]|^[IVXLCDM]{1,7}\s+[A-Z]/;
const ROMAN_WITH_TITLE = /^[IVXLCDM]{1,7}\.?\s+\S/;
const CAPS_HEADING = /^[A-Z][A-Z0-9 ,'’.!?\-]{3,58}$/;

/**
 * Normalise look-alike characters into one canonical set. Ranges keep their
 * en dash (it is not an em dash); only true duplicates get collapsed.
 */
const TYPOGRAPHY_RULES = [
  [/[‘’‚‛′]/g, "'"],
  [/[“”„‟″]/g, '"'],
  [/[‐‑‒−]/g, '-'],
  [/[—―]/g, '—'],
  [/…/g, '...'],
  [/ /g, ' '],
  [/­/g, ''],
  [/ﬁ/g, 'fi'],
  [/ﬂ/g, 'fl'],
];

const countWords = (text) => (text ? text.split(/\s+/).filter(Boolean).length : 0);

/** Strip a bracketed heading wrapper, e.g. Pride and Prejudice's "[Chapter I.]". */
function unwrapBrackets(line) {
  return String(line)
    .trim()
    .replace(/^\[+\s*/, '')
    .replace(/\s*\]+$/, '')
    .trim();
}

function isHeadingLike(line) {
  const text = unwrapBrackets(line);
  if (!text || text.length > 90) return false;
  if (CHAPTER_HINT.test(text)) return true;
  if (ROMAN_ONLY.test(text)) return true;
  if (ROMAN_WITH_TITLE.test(text)) return true;

  if (CAPS_HEADING.test(text) && /\s[A-Z]/.test(text)) return true;

  return false;
}

function isNarrative(line) {
  const text = String(line).trim();
  if (!text) return false;
  if (isHeadingLike(text)) return false;
  if (text.length >= 70) return true;
  return text.length >= 25 && /[.!?]["')\]]?$/.test(text);
}

function nextNonBlankLine(lines, index) {
  for (let i = index + 1; i < lines.length; i += 1) {
    if (lines[i].trim()) return lines[i];
  }
  return '';
}

/**
 * A heading is "real" (an actual chapter opening) when the line after it is
 * prose. Two heading-shaped lines in a row means we are still in a listing.
 */
function isRealHeadingStart(lines, index) {
  if (!isHeadingLike(lines[index])) return false;
  const next = nextNonBlankLine(lines, index);
  if (!next || isHeadingLike(next)) return false;
  return isNarrative(next) || next.trim().length > 20;
}

/** Word tokens of a heading, for comparing a contents entry with a body heading. */
function headingTokens(line) {
  return unwrapBrackets(line)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/** True when `prefix` is a token-prefix of `tokens` ("CHAPTER I" vs "CHAPTER I. Down the Rabbit-Hole"). */
function isTokenPrefix(prefix, tokens) {
  if (!prefix.length || prefix.length > tokens.length) return false;
  return prefix.every((token, index) => token === tokens[index]);
}

/** Whole-book slice between the Gutenberg markers. */
function sliceGutenbergBody(raw) {
  const text = raw.replace(/\r\n?/g, '\n');

  const startMatch = START_MARKER.exec(text);
  const endMatch = END_MARKER.exec(text);

  if (!startMatch || !endMatch) {
    console.warn('[textCleaner] Gutenberg START/END markers not found; using raw text.');
    return text;
  }

  const startIndex = startMatch.index + startMatch[0].length;
  const endIndex = endMatch.index > startIndex ? endMatch.index : text.length;
  return text.slice(startIndex, endIndex);
}

/** Drop the title page and any contents/illustration listing at the top. */
function stripFrontMatter(text) {
  const lines = text.split('\n');

  // Pass 1 — remove listings and production notices. Nothing else is touched,
  // so this cannot eat story text.
  const kept = [];
  let cursor = 0;
  let skippedContents = false;
  let skippedIllustrations = false;
  let seenProse = false;

  while (cursor < lines.length) {
    const line = lines[cursor];

    if (!skippedContents && CONTENTS_HEADING.test(line)) {
      cursor = skipContentsListing(lines, cursor);
      skippedContents = true;
      continue;
    }

    if (!skippedIllustrations && ILLUSTRATIONS_HEADING.test(line)) {
      cursor = skipContentsListing(lines, cursor);
      skippedIllustrations = true;
      continue;
    }

    if (!seenProse && startsListingRun(lines, cursor)) {
      const listing = resolveListing(lines, cursor);
      if (listing) {
        cursor = listing.resume;
        continue;
      }
    }

    if (PRODUCTION_NOTICE.test(line)) {
      cursor = skipParagraph(lines, cursor);
      continue;
    }

    if (!seenProse && isNarrative(line)) seenProse = true;
    kept.push(line);
    cursor += 1;
  }

  // Pass 2 — now that listings are out of the way, drop the title page and the
  // printer's colophon that often sits underneath it.
  return dropLeadingTitlePage(kept).join('\n');
}

/**
 * A heading that unambiguously opens a chapter: an explicit label
 * ("CHAPTER II", "Letter 1") or a numeral heading. Deliberately excludes
 * ALL-CAPS lines, which are just as often printer's colophon as titles.
 */
/**
 * True when three or more heading-shaped lines run consecutively. Body text
 * never does this — every real heading is followed by prose — so a run at the
 * top of a book is a contents listing even when it has no "Contents" heading
 * above it (Twenty Thousand Leagues opens straight into "PART I / CHAPTER I…").
 */
function startsListingRun(lines, index) {
  let seen = 0;
  for (let i = index; i < lines.length && seen < 3; i += 1) {
    const text = lines[i].trim();
    if (!text) continue;
    if (!isHeadingLike(text)) return false;
    seen += 1;
  }
  return seen >= 3;
}

function isStrongHeading(line) {
  const text = unwrapBrackets(line);
  return CHAPTER_HINT.test(text) || ROMAN_ONLY.test(text) || ROMAN_TITLED_LINE.test(text);
}

/**
 * True when a heading is followed by real prose within a few lines — the
 * signature of a chapter opening rather than another line of title-page
 * furniture.
 */
function opensNarrativeBlock(lines, index) {
  if (!isHeadingLike(lines[index])) return false;

  let headingsSeen = 0;
  for (let i = index + 1; i < lines.length && headingsSeen < 6; i += 1) {
    const text = lines[i].trim();
    if (!text) continue;
    if (isHeadingLike(text)) {
      headingsSeen += 1;
      continue;
    }
    return text.length >= 60;
  }
  return false;
}

/**
 * Real prose, as opposed to a long line of title-page furniture. Caption lists
 * (". . . ." leaders, trailing plate numbers) run long without being story
 * text, and stopping on one leaves a stray heading above the first chapter.
 */
function isLongProse(text) {
  if (text.length < 70 || isHeadingLike(text)) return false;
  if (/\.{3,}/.test(text)) return false;
  return !/\s\d{1,4}$/.test(text);
}

/**
 * Short, non-narrative lines at the top of a book are title page furniture.
 *
 * Only a properly long prose line stops the drop: printer's colophons and
 * dedication captions are short lines that end in a full stop, so the looser
 * narrative test would mistake them for story text.
 */
function dropLeadingTitlePage(lines) {
  let cursor = 0;
  let dropped = 0;

  while (cursor < lines.length && dropped < 60) {
    const line = lines[cursor];
    const text = line.trim();

    if (!text) {
      cursor += 1;
      continue;
    }

    if (
      CONTENTS_HEADING.test(text) ||
      ILLUSTRATIONS_HEADING.test(text) ||
      FRONT_MATTER_HEADING.test(text) ||
      isStrongHeading(text) ||
      opensNarrativeBlock(lines, cursor) ||
      isLongProse(text)
    ) {
      break;
    }

    cursor += 1;
    dropped += 1;
  }

  return lines.slice(cursor);
}

/**
 * Drop a contents/illustration listing: everything from the heading to the
 * body's opening chapter. A long contents list is front matter by definition,
 * so the span is discarded wholesale rather than filtered line by line.
 */
function skipContentsListing(lines, headingIndex) {
  const listing = resolveListing(lines, headingIndex);
  return listing ? listing.resume : headingIndex + 1;
}

/**
 * Find where the body starts relative to a contents/illustration heading.
 *
 * The listing itself is not required to be uniform — Moby Dick's opens with
 * "ETYMOLOGY." and a mixed-case "EXTRACTS (Supplied by a Sub-Sub-Librarian).",
 * which no heading test catches. Instead the first chapter-shaped entry is used
 * as an anchor and the body is located at the *next* line repeating it, since a
 * table of contents always opens with the same chapter the text does.
 *
 * @returns {{resume: number}|null} index of the body's opening chapter, or null
 *   when the heading is not followed by a resolvable listing.
 */
function resolveListing(lines, headingIndex) {
  const scanStart = headingIndex + 1;
  const limit = Math.min(lines.length, scanStart + LISTING_SCAN_LIMIT);

  let anchorIndex = -1;
  let anchor = null;
  let firstHeadingIndex = -1;
  let firstHeading = null;

  for (let i = scanStart; i < limit; i += 1) {
    const text = lines[i].trim();
    if (!text || !isHeadingLike(text)) continue;

    if (firstHeadingIndex === -1) {
      firstHeadingIndex = i;
      firstHeading = headingTokens(text);
    }

    if (isStrongHeading(text)) {
      anchorIndex = i;
      anchor = headingTokens(text);
      break;
    }
  }

  // Dr Jekyll's contents lists bare ALL-CAPS titles with nothing stronger.
  if (anchorIndex === -1) {
    if (firstHeadingIndex === -1) return null;
    anchorIndex = firstHeadingIndex;
    anchor = firstHeading;
  }

  for (let i = anchorIndex + 1; i < limit; i += 1) {
    const text = lines[i].trim();
    if (!text || !isHeadingLike(text)) continue;

    const tokens = headingTokens(text);
    if (isTokenPrefix(anchor, tokens) || isTokenPrefix(tokens, anchor)) {
      return { resume: i };
    }
  }

  // No repeat found: the listing could not be resolved, so nothing is skipped.
  // Guessing here is how a whole preface gets deleted.
  return null;
}

/** Skip a single paragraph starting at `index`, honouring hard wraps. */
function skipParagraph(lines, index) {
  let cursor = index;
  while (cursor < lines.length && lines[cursor].trim()) cursor += 1;
  return cursor;
}

/**
 * Drop a short publisher preface. A long preface/foreword is genuine content
 * (Wilde's preface to Dorian Gray, for example) and is always kept.
 */
function stripShortPreface(text) {
  const lines = text.split('\n');
  const firstHeading = lines.findIndex((line, index) => isRealHeadingStart(lines, index));
  if (firstHeading === -1) return text;

  const prefaceIndex = lines.findIndex(
    (line, index) => index < firstHeading && PREFACE_HEADING.test(line)
  );
  if (prefaceIndex === -1) return text;

  const prefaceWords = countWords(lines.slice(prefaceIndex, firstHeading).join('\n'));
  if (prefaceWords > PREFACE_WORD_LIMIT) return text;

  console.log(
    `[textCleaner] Dropped short front preface (${prefaceWords} words) before the first chapter.`
  );
  return lines.slice(0, prefaceIndex).concat(lines.slice(firstHeading)).join('\n');
}

/**
 * Gutenberg plain text is hard-wrapped at roughly 70 characters. Rebuild
 * paragraphs so the reader gets one block per paragraph.
 *
 * A line is treated as ending a group when it is noticeably shorter than the
 * wrap width — a short line is either a heading, a title, a salutation or a
 * verse line, all of which are deliberate breaks.
 */
function reflowParagraphs(text) {
  const lines = text.split('\n');
  const paragraphs = [];
  let buffer = [];

  const flush = () => {
    if (buffer.length) {
      paragraphs.push(buffer.join(' '));
      buffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '').trim();

    if (!line) {
      flush();
      continue;
    }

    // Headings always stand alone so chapter markers never glue to the first
    // sentence of the chapter.
    if (isHeadingLike(line)) {
      flush();
      paragraphs.push(line);
      continue;
    }

    buffer.push(line);
    if (line.length <= SHORT_LINE_BREAK) flush();
  }
  flush();

  return paragraphs.filter(Boolean).join('\n\n');
}

function normalizeTypography(text) {
  return TYPOGRAPHY_RULES.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    text
  );
}

function normalizeWhitespace(text) {
  return text
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Full clean pass.
 * @param {string} raw raw pg*.txt contents
 * @returns {{text: string, wordCount: number, stats: object}}
 */
function cleanGutenbergText(raw) {
  const body = sliceGutenbergBody(raw);
  const withoutFrontMatter = stripFrontMatter(body);
  const withoutPreface = stripShortPreface(withoutFrontMatter);
  const reflowed = reflowParagraphs(withoutPreface);
  const text = normalizeWhitespace(normalizeTypography(reflowed));

  return {
    text,
    wordCount: countWords(text),
    stats: { rawWords: countWords(raw), cleanWords: countWords(text) },
  };
}

module.exports = {
  cleanGutenbergText,
  countWords,
  isHeadingLike,
  isNarrative,
  unwrapBrackets,
  headingTokens,
  isTokenPrefix,
  FRONT_MATTER_HEADING,
  // Exported for stage-by-stage debugging of the cleaning pipeline.
  sliceGutenbergBody,
  stripFrontMatter,
  stripShortPreface,
  reflowParagraphs,
};
