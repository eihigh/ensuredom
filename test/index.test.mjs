import { expect, test } from 'vitest';
import { page } from '@vitest/browser/context';
import { ensure } from 'ensuredom';

test('ensure', async () => {
	const main = document.createElement('main');
	main.textContent = 'Hello, World!';
	document.body.appendChild(main);
	const parent = await page();
	ensure(parent);
	expect(parent).toBeInstanceOf(HTMLElement);
});