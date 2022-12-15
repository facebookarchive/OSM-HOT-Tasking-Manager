import React from 'react';

import { Jumbotron, SecondaryJumbotron } from '../components/homepage/jumbotron';
import { StatsSection } from '../components/homepage/stats';
import { MappingFlow } from '../components/homepage/mappingFlow';
import { WhoIsMapping } from '../components/homepage/whoIsMapping';
import { Testimonials } from '../components/homepage/testimonials/index';

export function Home() {
  return (
    <div className="pull-center">
      <Jumbotron />
      <StatsSection />
      <MappingFlow />
      <WhoIsMapping />
      <Testimonials />
      <SecondaryJumbotron />
    </div>
  );
}
