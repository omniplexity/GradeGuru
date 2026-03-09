function verifyCitations(text, sources) {
  const matches = text.match(/\[(\d+)\]/g) || [];
  const invalid = [];

  for (const match of matches) {
    const index = Number.parseInt(match.replace(/\D/g, ''), 10);
    if (!sources[index - 1]) {
      invalid.push(match);
    }
  }

  return {
    valid: invalid.length === 0,
    invalid,
  };
}

module.exports = {
  verifyCitations,
};
