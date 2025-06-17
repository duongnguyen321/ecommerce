import validateEmail from '@/helpers/regex';
import { createTransport } from 'nodemailer';
import { generateMessage, generateSubject } from './template';

export default async function send(
	message: string,
	subject: string,
	email: string | string[],
	params?: any
) {
	if (!validateEmail(email)) {
		return false;
	}

	let transporter = global?.transporter;
	if (!transporter) {
		transporter = createTransport({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			auth: {
				user: process.env.MAILER_NAME as string,
				pass: process.env.MAILER_PASS as string,
			},
		});
		global.transporter = transporter;
	}
	try {
		const template = generateMessage(message, subject, params);
		const title = generateSubject(subject, message, params);
		const info = await transporter.sendMail({
			from: `"${title}" <${process.env.MAILER_NAME as string}>`,
			to: email,
			subject: title,
			html: template,
		});
		if (info.messageId) {
			return true;
		}
	} catch (e) {
		console.error(e);
		return false;
	}
}
