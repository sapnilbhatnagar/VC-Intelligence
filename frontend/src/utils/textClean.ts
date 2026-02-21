/**
 * Text cleaning utilities for LLM output displayed in analytics panels.
 *
 * cleanMarkdown  — strips common markdown artifacts so text renders cleanly
 *                  in MUI Typography components.
 */

export function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/gm, '')                        // ## headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')                  // **bold**
    .replace(/\*([^*\n]+)\*/g, '$1')                    // *italic*
    .replace(/_{1,2}([^_\n]+)_{1,2}/g, '$1')            // __underline__
    .replace(/`([^`]+)`/g, '$1')                        // `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')            // [link](url)
    .replace(/^[-*•]\s+/gm, '')                         // leading bullet chars
    .replace(/^---+$/gm, '')                            // horizontal rules
    .replace(/\[CONFIRMED\]/g, '')                      // data-quality markers
    .replace(/\[ESTIMATED\]/g, '')
    .replace(/\[UNKNOWN\]/g, '')
    .replace(/\[UNCONFIRMED\]/g, '')
    .replace(/\n{3,}/g, '\n\n')                         // collapse blank lines
    .trim();
}
