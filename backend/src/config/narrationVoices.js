'use strict';

// Public, trained English voices verified against Fish Audio's voice catalog.
// This fixed shortlist makes selection repeatable; saved book choices take
// precedence if this shortlist is updated later. These are voice references,
// not synthesis models: the synthesis model remains s2.1-pro-free.
// Freeze the catalog and each entry so request handlers cannot accidentally change
// the reference, display name, or explanation used for a new book assignment.
const NARRATION_VOICES = Object.freeze({
  gothic: Object.freeze({
    referenceId: '68f75cc070bc4989b91a5e865fb0c6a0',
    name: 'Christopher Lee',
    description: 'Deep, measured, dramatic narration for Gothic suspense.',
  }),
  detective: Object.freeze({
    referenceId: '080580e5e570434aac5c131be5572d2b',
    name: 'Benedict Cumberbatch',
    description: 'Refined, calm British narration for observation and mystery.',
  }),
  romance: Object.freeze({
    referenceId: 'bf189034a74f4ce6a4c7bd5f28398c52',
    name: 'Emma Watson',
    description: 'Clear, warm British narration for relationships and character drama.',
  }),
  literary: Object.freeze({
    referenceId: '76bb6ae7b26c41fbbd484514fdb014c2',
    name: 'Morgan Freeman',
    description: 'Calm, reflective, measured storytelling for literary prose.',
  }),
  children: Object.freeze({
    referenceId: '606bc200ea5a44da993890749866ca30',
    name: 'Alice Kingsleigh - Alice in Wonderland',
    description: 'Gentle, youthful British storytelling for whimsical fantasy.',
  }),
  adventure: Object.freeze({
    referenceId: '256d09f5f7e943a29f0ddb1f796dd336',
    name: 'David Attenborough',
    description: 'Warm, clear, expressive narration for exploration and scientific adventure.',
  }),
  pirate: Object.freeze({
    referenceId: '4d78f878f023424cb77975a6dea180a6',
    name: 'Pirate',
    description: 'Gruff, weathered storytelling for pirate adventures.',
  }),
  classic: Object.freeze({
    referenceId: '6b81bd1519bf4267b875ccc2a630bb5d',
    name: 'LittleBIGPlanet Narrator (Stephen Fry)',
    description: 'Warm, sophisticated British storytelling for classic wit and travel.',
  }),
});

module.exports = { NARRATION_VOICES };
