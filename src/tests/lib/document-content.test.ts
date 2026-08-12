import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  parseTipTapContentJson,
  tiptapJsonToPlainText,
  blockNoteToPlainText,
  getDocumentPlainText,
  isStudyGuideDocument,
  getDocumentPreviewText,
} from '@/lib/document-content';

describe('stripHtml', () => {
  it('removes basic HTML tags', () => {
    expect(stripHtml('<p>Hello world</p>')).toBe('Hello world');
  });

  it('converts block tags to newlines and remaining tags to spaces', () => {
    const result = stripHtml('<p>First</p><p>Second</p>');
    expect(result).toContain('First');
    expect(result).toContain('Second');
    expect(result).not.toContain('<p>');
    expect(result).not.toContain('</p>');
  });

  it('strips HTML from complex content and normalises whitespace', () => {
    const result = stripHtml('<p>First</p><p>Second</p>').trim();
    expect(result).toBe('First\n Second');
  });

  it('strips style tags and their content', () => {
    const html = '<style>.foo { color: red; }</style><p>Text</p>';
    expect(stripHtml(html).trim()).toBe('Text');
  });

  it('strips script tags and their content', () => {
    const html = '<script>alert("xss")</script><p>Safe</p>';
    expect(stripHtml(html).trim()).toBe('Safe');
  });

  it('converts <br> to newlines', () => {
    expect(stripHtml('Line1<br>Line2<br />Line3')).toBe('Line1\nLine2\nLine3');
  });

  it('decodes HTML entities', () => {
    expect(stripHtml('&amp; &lt; &gt; &quot; &#39;')).toBe('& < > " \'');
  });

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });

  it('handles empty string gracefully', () => {
    expect(stripHtml('')).toBe('');
  });
});

describe('parseTipTapContentJson', () => {
  it('parses valid TipTap JSON', () => {
    const input = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
    const result = parseTipTapContentJson(input);
    expect(result).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });

  it('returns null for invalid JSON', () => {
    expect(parseTipTapContentJson('not json')).toBeNull();
  });

  it('returns null if parsed value is not a doc', () => {
    expect(parseTipTapContentJson(JSON.stringify({ type: 'not-doc' }))).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseTipTapContentJson('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseTipTapContentJson('   ')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(parseTipTapContentJson(null as any)).toBeNull();
    expect(parseTipTapContentJson(undefined as any)).toBeNull();
  });
});

describe('tiptapJsonToPlainText', () => {
  it('extracts text from paragraph', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] };
    expect(tiptapJsonToPlainText(doc).trim()).toBe('Hello');
  });

  it('handles multiple paragraphs', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
      ],
    };
    expect(tiptapJsonToPlainText(doc).trim()).toBe('First\nSecond');
  });

  it('handles hard breaks', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Line1' }, { type: 'hardBreak' }, { type: 'text', text: 'Line2' }] }],
    };
    expect(tiptapJsonToPlainText(doc).trim()).toBe('Line1\nLine2');
  });

  it('handles horizontal rules', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Above' }] },
        { type: 'horizontalRule' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Below' }] },
      ],
    };
    expect(tiptapJsonToPlainText(doc).trim()).toBe('Above\n\n---\n\nBelow');
  });

  it('returns empty string for null input', () => {
    expect(tiptapJsonToPlainText(null)).toBe('');
  });
});

describe('blockNoteToPlainText', () => {
  it('extracts text from BlockNote format', () => {
    const blocks = JSON.stringify([
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello', styles: {} }] },
    ]);
    expect(blockNoteToPlainText('__BN__' + blocks)).toBe('Hello');
  });

  it('returns empty string for non-BlockNote prefix', () => {
    expect(blockNoteToPlainText('not blocknote')).toBe('');
  });

  it('returns empty string for invalid JSON', () => {
    expect(blockNoteToPlainText('__BN__not json')).toBe('');
  });

  it('returns empty string if blocks is not an array', () => {
    expect(blockNoteToPlainText('__BN__' + JSON.stringify({ type: 'doc' }))).toBe('');
  });

  it('handles nested children', () => {
    const blocks = JSON.stringify([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Parent', styles: {} }],
        children: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Child', styles: {} }] },
        ],
      },
    ]);
    const result = blockNoteToPlainText('__BN__' + blocks);
    expect(result).toContain('Parent');
    expect(result).toContain('Child');
  });

  it('returns empty string for null input', () => {
    expect(blockNoteToPlainText(null as any)).toBe('');
  });
});

describe('getDocumentPlainText', () => {
  it('returns contentText when available', () => {
    const doc = { contentText: 'Direct text content' };
    expect(getDocumentPlainText(doc)).toBe('Direct text content');
  });

  it('returns BlockNote text when content starts with __BN__', () => {
    const blocks = JSON.stringify([
      { type: 'paragraph', content: [{ type: 'text', text: 'BN content', styles: {} }] },
    ]);
    const doc = { content: '__BN__' + blocks };
    expect(getDocumentPlainText(doc)).toBe('BN content');
  });

  it('prefers contentText over content', () => {
    const doc = { contentText: 'Prefer this', content: 'Ignore this' };
    expect(getDocumentPlainText(doc)).toBe('Prefer this');
  });

  it('returns empty string for null document', () => {
    expect(getDocumentPlainText(null)).toBe('');
  });

  it('returns empty string for undefined document', () => {
    expect(getDocumentPlainText(undefined)).toBe('');
  });
});

describe('isStudyGuideDocument', () => {
  it('returns true for study-guide role', () => {
    expect(isStudyGuideDocument({ role: 'study-guide' })).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isStudyGuideDocument({ role: 'Study-Guide' })).toBe(true);
  });

  it('trims whitespace', () => {
    expect(isStudyGuideDocument({ role: '  study-guide  ' })).toBe(true);
  });

  it('returns false for other roles', () => {
    expect(isStudyGuideDocument({ role: 'document' })).toBe(false);
  });

  it('returns false for null or undefined', () => {
    expect(isStudyGuideDocument(null)).toBe(false);
    expect(isStudyGuideDocument(undefined)).toBe(false);
  });

  it('returns false when role is missing', () => {
    expect(isStudyGuideDocument({})).toBe(false);
  });
});

describe('getDocumentPreviewText', () => {
  it('returns full text when shorter than maxChars', () => {
    const doc = { contentText: 'Short text' };
    expect(getDocumentPreviewText(doc, 100)).toBe('Short text');
  });

  it('truncates text when longer than maxChars', () => {
    const doc = { contentText: 'A'.repeat(200) };
    const result = getDocumentPreviewText(doc, 100);
    expect(result.length).toBeLessThanOrEqual(104);
    expect(result.endsWith('…')).toBe(true);
  });

  it('uses default 180 maxChars', () => {
    const doc = { contentText: 'A'.repeat(200) };
    const result = getDocumentPreviewText(doc);
    expect(result.endsWith('…')).toBe(true);
  });
});
