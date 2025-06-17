import { mdToText } from '@/helpers/mdToHtml';

export const generateMessage = (
  message: string,
  subject: string,
  params?: any
) => {
  let template;
  switch (subject) {
    default:
      template = 'Hello world!';
      break;
  }
  return template;
};

export const generateSubject = (
  subject: string,
  message: string,
  params?: any
) => {
  let generate = subject;
  switch (subject) {
    default:
      generate = 'Hello World!';
      break;
  }
  return generate;
};
