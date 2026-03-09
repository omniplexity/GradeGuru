class RubricParser {
  parse(input) {
    const text = String(input.text || '').trim();
    if (!text) {
      return [];
    }

    return text.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const match = line.match(/^(.*?)(\d+)\s*points?$/i) || line.match(/^(.*?)[:-]\s*(\d+)$/i);
      if (!match) {
        return { section: line, points: 0 };
      }
      return {
        section: match[1].replace(/[-:]\s*$/, '').trim(),
        points: Number(match[2]),
      };
    });
  }
}

module.exports = {
  RubricParser,
};
