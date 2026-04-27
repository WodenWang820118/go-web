import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('static analytics bootstrapping', () => {
  it('does not load Google Tag Manager from index.html before consent', () => {
    const html = readFileSync(join(process.cwd(), 'src/index.html'), 'utf8');

    expect(html).not.toContain('googletagmanager.com');
    expect(html).not.toContain('GTM-TQXTJ3LC');
    expect(html).not.toContain('<noscript');
  });
});
