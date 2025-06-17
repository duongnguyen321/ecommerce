import hljs from 'highlight.js';
import 'highlight.js/styles/monokai.min.css';
import MarkdownIt from 'markdown-it';
import '@/styles/dracula.css';
import blogReplace from './blogReplace';

export default function mdToHtml(markdown: string, html: boolean = false) {
  const md = new MarkdownIt({
    html,
    xhtmlOut: true,
    linkify: true,
    typographer: true,
    quotes: '“”‘’',
    langPrefix: 'hljs duonguyen-code language-',
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, {
            language: lang,
          }).value;
        } catch (__) {}
      } else {
        try {
          return hljs.highlightAuto(str).value;
        } catch (__) {}
      }
      return ''; // use external default escaping
    },
  });
  return md?.render(blogReplace(markdown));
}

export function mdToText(markdown: string) {
  return mdToHtml(markdown, false)
    .replace(/<[^>]*>?/gm, '')
    .replace(/\n/gm, ' ')
    .trim();
}
