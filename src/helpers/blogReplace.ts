import moment from 'moment';
import { formatDate } from './date';

export default function blogReplace(markdown: string) {
  const dateNow = new Date();

  // Static keywords dictionary
  const keywords: { [key: string]: string } = {
    '{{MAIN_URL}}': process.env.NEXT_PUBLIC_HOST as string,
    '{{NOW}}': formatDate(dateNow.toISOString(), 'DD/MM/YYYY'),
    '{{YEAR}}': dateNow.getFullYear().toString(),
    '{{MONTH}}': (dateNow.getMonth() + 1).toString(),
    '{{DAY}}': dateNow.getDate().toString(),
  };

  // First, handle the dynamic date pattern {{DATE_DD/MM/YYYY}}
  let processedMarkdown = markdown.replace(
    /{{DATE_(\d{2}\/\d{2}\/\d{4})}}/g,
    (match, dateStr) => {
      try {
        // Parse the date string using moment
        const parsedDate = moment(dateStr, 'DD/MM/YYYY');

        // Check if the date is valid
        if (!parsedDate.isValid()) {
          return `_**${dateStr}**_`; // Return the original date string if invalid
        }

        // Return the relative time (e.g., "2 days ago")
        return `_**${parsedDate.fromNow()}**_`;
      } catch (error) {
        console.error(`Failed to parse date: ${dateStr}`, error);
        return match; // Return original match if parsing fails
      }
    }
  );

  // Then handle all static keywords
  processedMarkdown = processedMarkdown.replace(/{{(.*?)}}/g, (match, key) => {
    return keywords[`{{${key}}}`] || match;
  });

  return processedMarkdown;
}

/**
 * Removes markdown code block syntax and replaces variables in HTML content
 * @param content Content potentially containing markdown code blocks with variables
 * @param user Optional user object for personalized replacements
 * @returns Clean HTML with variables replaced
 */
export function removeMdCodeHtml(content: string): string {
  // Match markdown code block patterns
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

  // If no code blocks are found, return the original content
  if (!codeBlockRegex.test(content)) {
    return content;
  }

  // Reset regex lastIndex
  codeBlockRegex.lastIndex = 0;

  // Process each code block - first replace variables inside the code, then remove markdown syntax
  return content.replace(codeBlockRegex, (match, language, code) => {
    // Apply variable replacement to the code content
    return replaceHtmlVariables(code);
  });
}

/**
 * Replaces variables in HTML content
 * Same functionality as blogReplace but without converting to markdown links
 * @param html HTML content with variables
 * @param user Optional user object for personalized replacements
 * @returns HTML with variables replaced
 */
export function replaceHtmlVariables(html: string): string {
  const dateNow = new Date();

  // Static keywords dictionary for HTML (without markdown conversion)
  const keywords: { [key: string]: string } = {
    '{{MAIN_URL}}': process.env.NEXT_PUBLIC_HOST as string,
    '{{NOW}}': formatDate(dateNow.toISOString(), 'DD/MM/YYYY'),
    '{{YEAR}}': dateNow.getFullYear().toString(),
    '{{MONTH}}': (dateNow.getMonth() + 1).toString(),
    '{{DAY}}': dateNow.getDate().toString(),
  };

  // First, handle the dynamic date pattern {{DATE_DD/MM/YYYY}}
  let processedHtml = html.replace(
    /{{DATE_(\d{2}\/\d{2}\/\d{4})}}/g,
    (match, dateStr) => {
      try {
        const parsedDate = moment(dateStr, 'DD/MM/YYYY');
        if (!parsedDate.isValid()) {
          return dateStr; // Return the original date string if invalid
        }
        return parsedDate.fromNow();
      } catch (error) {
        console.error(`Failed to parse date: ${dateStr}`, error);
        return match; // Return original match if parsing fails
      }
    }
  );

  // Then handle all static keywords
  processedHtml = processedHtml.replace(/{{(.*?)}}/g, (match, key) => {
    return keywords[`{{${key}}}`] || match;
  });

  return processedHtml;
}
