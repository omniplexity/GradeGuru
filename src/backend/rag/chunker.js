function splitLongSentence(sentence, maxLength) {
  const pieces = [];
  let index = 0;

  while (index < sentence.length) {
    pieces.push(sentence.slice(index, index + maxLength).trim());
    index += maxLength;
  }

  return pieces.filter(Boolean);
}

class Chunker {
  chunk(text, maxLength = 400) {
    if (!text || !text.trim()) {
      return [];
    }

    const sentences = text
      .replace(/\r/g, '')
      .split(/(?<=[.!?])\s+|\n{2,}/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .flatMap((sentence) => (sentence.length > maxLength
        ? splitLongSentence(sentence, maxLength)
        : [sentence]));

    const chunks = [];
    let current = '';

    sentences.forEach((sentence) => {
      const next = current ? `${current} ${sentence}` : sentence;

      if (next.length > maxLength && current) {
        chunks.push(current.trim());
        current = sentence;
        return;
      }

      current = next;
    });

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks;
  }
}

module.exports = {
  Chunker,
};
