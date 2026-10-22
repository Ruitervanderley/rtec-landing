import { NextIntlClientProvider } from 'next-intl';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import messages from '@/locales/pt-BR.json';
import { BaseTemplate } from './BaseTemplate';

vi.mock('@/libs/I18nNavigation', () => ({
  Link: (props: React.ComponentProps<'a'>) => createElement('a', { href: props.href, className: props.className, children: props.children }),
}));

describe('Base template', () => {
  describe('Navigation', () => {
    it('renders the supplied navigation items', async () => {
      await render(
        <NextIntlClientProvider locale="pt-BR" messages={messages}>
          <BaseTemplate
            leftNav={(
              <>
                <li>link 1</li>
                <li>link 2</li>
                <li>link 3</li>
              </>
            )}
          >
            {null}
          </BaseTemplate>
        </NextIntlClientProvider>,
      );

      const menuItemList = page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('listitem');

      expect(menuItemList.elements()).toHaveLength(3);
    });

    it('renders footer with company name and rights text', async () => {
      await render(
        <NextIntlClientProvider locale="pt-BR" messages={messages}>
          <BaseTemplate leftNav={<li>1</li>}>{null}</BaseTemplate>
        </NextIntlClientProvider>,
      );

      const copyrightSection = page.getByText(/© /);

      expect(copyrightSection).toBeDefined();

      const [el] = await copyrightSection.elements();
      const text = el?.textContent ?? '';

      expect(text).toContain('RTEC');
      expect(text).toContain('Todos os direitos reservados');
    });
  });
});
