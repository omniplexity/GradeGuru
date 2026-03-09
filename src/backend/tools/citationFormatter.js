class CitationFormatter {
  format(input) {
    const style = (input.style || 'APA').toUpperCase();
    const author = input.author || 'Unknown Author';
    const year = input.year || 'n.d.';
    const title = input.title || 'Untitled Source';
    const publisher = input.publisher || input.website || 'Unknown Publisher';
    const url = input.url ? ` ${input.url}` : '';

    if (style === 'MLA') {
      return `${author}. "${title}." ${publisher}, ${year}.${url}`;
    }

    return `${author} (${year}). ${title}. ${publisher}.${url}`;
  }
}

module.exports = {
  CitationFormatter,
};
