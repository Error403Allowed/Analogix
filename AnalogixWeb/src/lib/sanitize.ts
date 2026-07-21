import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "del", "ins",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "dl", "dt", "dd",
      "a", "img", "span", "div", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "hr", "sup", "sub",
      "math", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mover", "munder",
      "munderover", "msubsup", "mtext", "mspace", "mroot", "mpadded", "mphantom",
      "menclose", "mglyph", "mtable", "mtr", "mtd", "mlabeledtr",
      "semantics", "annotation", "mrow", "mstyle",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "class", "id",
      "width", "height", "style",
      "xmlns", "encoding",
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp|mailto):|[^a-z]|[a-z+.]+(?:[^a-z+]|$))/i,
  });
}
