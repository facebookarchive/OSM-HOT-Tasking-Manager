import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { FeaturedProjects } from '../featuredProjects';
import { ReduxIntlProviders } from '../../../utils/testWithIntl';

test('featuredProjects render title after loading projects', async () => {
  const { container } = await render(
    <ReduxIntlProviders>
      <FeaturedProjects />
    </ReduxIntlProviders>,
  );
  // render null while the API is loading
  expect(screen.queryByText('Featured Projects')).not.toBeInTheDocument();
  await waitFor(() => screen.getByText('Featured Projects'));
  expect(screen.getByText('Featured Projects').className).toBe('f2 mb0 ttu barlow-condensed fw8');
  // 2 inactive arrows
  expect(container.querySelectorAll('div.dib.mr2.primary.o-50').length).toBe(2);
  // project is rendered 2 times because a special formatting for mobile devices
  expect(screen.queryAllByText('City Buildings').length).toBe(2);
}, 10000);
