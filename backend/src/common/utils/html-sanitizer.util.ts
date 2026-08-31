import * as sanitizeHtml from 'sanitize-html';

// ReactQuill(리치 텍스트 에디터)이 생성하는 서식만 허용한다.
// script·이벤트 핸들러·javascript: URL 등 실행 가능한 요소는 모두 제거된다.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'span', 'div',
    'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    span: ['style', 'class'],
    p: ['style', 'class'],
    div: ['style', 'class'],
    '*': ['class'],
  },
  allowedStyles: {
    '*': {
      color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/, /^[a-z-]+$/i],
      'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/, /^[a-z-]+$/i],
      'text-align': [/^(left|right|center|justify)$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'data'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
};

export function sanitizeRichText(html: string | null | undefined): string | null | undefined {
  if (html === null || html === undefined) return html;
  return sanitizeHtml(html, OPTIONS);
}

// 저장 시점 이전에 작성된 데이터(미살균)도 응답에서 안전하게 만든다.
export function sanitizeRichTextFields<T extends Record<string, any>>(
  record: T,
  fields: (keyof T)[],
): T {
  if (!record) return record;
  const out: any = { ...record };
  for (const f of fields) {
    if (typeof out[f] === 'string') out[f] = sanitizeHtml(out[f], OPTIONS);
  }
  return out;
}
