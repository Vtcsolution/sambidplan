const toICSDate = (date) =>
  new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

const icsEscape = (str = '') =>
  String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export const generateICS = (events) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sambid//Federal Contract Deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((e) => {
    if (!e.dueDate) return;
    const dt = toICSDate(e.dueDate);
    const loc = [e.placeOfPerformance?.city, e.placeOfPerformance?.state].filter(Boolean).join(', ');
    const desc = [
      `Agency: ${e.agency || ''}`,
      e.naicsCode ? `NAICS: ${e.naicsCode}` : null,
      e.estimatedValue ? `Value: $${Number(e.estimatedValue).toLocaleString()}` : null,
      e.url ? `SAM.gov: ${e.url}` : null,
    ].filter(Boolean).join('\\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${e._id || e.sourceId || Date.now()}@sambid.co`,
      `DTSTART:${dt}`,
      `DTEND:${dt}`,
      `SUMMARY:${icsEscape(e.title)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      loc ? `LOCATION:${icsEscape(loc)}` : null,
      e.url ? `URL:${e.url}` : null,
      'END:VEVENT',
    ).filter(Boolean);
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

export const downloadICS = (events, filename = 'federal-deadlines.ics') => {
  const blob = new Blob([generateICS(events)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const googleCalendarUrl = (event) => {
  if (!event.dueDate) return '#';
  const dt = toICSDate(event.dueDate);
  const loc = [event.placeOfPerformance?.city, event.placeOfPerformance?.state].filter(Boolean).join(', ');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Federal Contract Deadline',
    dates: `${dt}/${dt}`,
    details: [
      `Agency: ${event.agency || ''}`,
      event.estimatedValue ? `Value: $${Number(event.estimatedValue).toLocaleString()}` : '',
      event.url ? `\nSAM.gov: ${event.url}` : '',
    ].filter(Boolean).join('\n'),
    location: loc,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const outlookCalendarUrl = (event) => {
  if (!event.dueDate) return '#';
  const start = new Date(event.dueDate).toISOString();
  const loc = [event.placeOfPerformance?.city, event.placeOfPerformance?.state].filter(Boolean).join(', ');
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title || 'Federal Contract Deadline',
    startdt: start,
    enddt: start,
    body: [
      `Agency: ${event.agency || ''}`,
      event.estimatedValue ? `Value: $${Number(event.estimatedValue).toLocaleString()}` : '',
      event.url ? `SAM.gov: ${event.url}` : '',
    ].filter(Boolean).join('\n'),
    location: loc,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};
