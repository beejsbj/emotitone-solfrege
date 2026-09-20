import { writeFile } from 'node:fs/promises';

export async function writeGuideReceipt(path, report) {
  if (report.errors.length) {
    throw new Error(`Guide captured ${report.errors.length} browser error(s): ${report.errors.join('\n')}`);
  }
  await writeFile(path, JSON.stringify(report, null, 2));
}
