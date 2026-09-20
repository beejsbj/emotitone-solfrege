import { writeFile } from 'node:fs/promises';

export function collectGuideBrowserErrors(errors, message) {
  if (message.method === 'Runtime.exceptionThrown') {
    const details = message.params.exceptionDetails;
    errors.push(details.exception?.description || details.text || JSON.stringify(details));
  }
  if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
    errors.push(`console.${message.params.type}: ${message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ')}`);
  }
}

export async function writeGuideReceipt(path, report) {
  if (report.errors.length) {
    throw new Error(`Guide captured ${report.errors.length} browser error(s): ${report.errors.join('\n')}`);
  }
  await writeFile(path, JSON.stringify(report, null, 2));
}
