export default function timer(time: string): number {
	// Trim whitespace and convert to lowercase for easier parsing
	const trimmedTime = time.trim().toLowerCase();

	// Supported time formats:
	// seconds: 'second', 'seconds', 'sec', 'secs'
	// minutes: 'minute', 'minutes', 'min', 'mins'
	// hours:   'hour', 'hours', 'hr', 'hrs'
	// days:    'day', 'days'
	// months:  'month', 'months'
	// years:   'year', 'years'

	// Regular expression to match the number and unit
	const timePattern =
		/^(\d+)\s*(seconds?|second|secs?|sec|minutes?|minute|mins?|min|hours?|hour|hrs?|hr|days?|day|months?|month|years?|year)$/i;
	const match = trimmedTime.match(timePattern);

	if (!match) {
		throw new Error('Invalid time format ' + trimmedTime);
	}

	const quantity = parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case 'sec':
		case 'secs':
		case 'second':
		case 'seconds':
			return quantity;
		case 'minute':
		case 'min':
		case 'mins':
		case 'minutes':
			return quantity * 60;
		case 'hour':
		case 'hr':
		case 'hrs':
		case 'hours':
			return quantity * 60 * 60;
		case 'day':
		case 'days':
			return quantity * 60 * 60 * 24;
		case 'month':
		case 'months':
			return quantity * 60 * 60 * 24 * 30; // Approximation, considering a month as 30 days
		case 'year':
		case 'years':
			return quantity * 60 * 60 * 24 * 365; // Approximation, considering a year as 365 days
		default:
			throw new Error('Invalid time unit');
	}
}
