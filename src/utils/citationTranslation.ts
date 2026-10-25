// Keep citation destinations out of translation and restore them verbatim afterwards.
export function protectCitationLinks(content: string) {
  const links: string[] = [];
  const text = content.replace(/\[S\d+\]\(<[^>\n]+>\)/g, link => {
    const marker = `EVICTWISE_CITATION_${links.length}_END`;
    links.push(link);
    return marker;
  });
  return {
    text,
    restore(translated: string): string {
      let result = translated;
      links.forEach((link, index) => {
        const marker = `EVICTWISE_CITATION_${index}_END`;
        if (result.split(marker).length !== 2) throw new Error('Translation changed a source citation');
        result = result.replace(marker, () => link);
      });
      return result;
    },
  };
}
