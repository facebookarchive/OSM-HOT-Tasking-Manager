import React, { useLayoutEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { navigate } from '@reach/router';
import mapboxgl from 'mapbox-gl';
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import { FormattedMessage } from 'react-intl';

import messages from './messages';
import { MAPBOX_TOKEN, MAP_STYLE, MAPBOX_RTL_PLUGIN_URL } from '../../config';
import { mapboxLayerDefn } from '../projects/projectsMap';
import { ListElements } from './topProjects';

mapboxgl.accessToken = MAPBOX_TOKEN;
try {
  mapboxgl.setRTLTextPlugin(MAPBOX_RTL_PLUGIN_URL);
} catch {
  console.log('RTLTextPlugin is loaded');
}

const UserCountriesMap = ({ projects }) => {
  const locale = useSelector(state => state.preferences['locale']);
  const geojson = {
    type: 'FeatureCollection',
    features: projects.mappedProjects.map(f => {
      return { type: 'Feature', geometry: f.centroid, properties: { projectId: f.projectId } };
    }),
  };

  const [map, setMap] = useState(null);

  const mapRef = React.createRef();

  useLayoutEffect(() => {
    setMap(
      new mapboxgl.Map({
        container: mapRef.current,
        style: MAP_STYLE,
        zoom: 0,
        attributionControl: false,
      })
        .addControl(new mapboxgl.AttributionControl({ compact: false }))
        .addControl(new MapboxLanguage({ defaultLanguage: locale.substr(0, 2) || 'en' })),
    );

    return () => {
      map && map.remove();
    };
    // eslint-disable-next-line
  }, []);

  useLayoutEffect(() => {
    if (map) {
      map.resize(); //https://docs.mapbox.com/help/troubleshooting/blank-tiles/
      map.on('load', () => mapboxLayerDefn(map, geojson, id => navigate(`/projects/${id}/`)));
    }
  }, [map, geojson]);

  return (
    <div id="map" className="w-two-thirds-l w-100 fl" style={{ height: '40vh' }} ref={mapRef}></div>
  );
};

export const CountriesMapped = ({ projects, userStats }) => {
  const countries = userStats.countriesContributed.countries.slice(0, 5);
  const tasksNo = countries.map(c => c.total);
  const maxTaskNo = Math.max(...tasksNo);

  const countriesPercent = countries.map(c => {
    return { ...c, percent: c.total / maxTaskNo };
  });

  return (
    <div className="bg-white blue-dark shadow-4 w-100 cf">
      <div className="w-third-l w-100 fl pb3 pt2 ph3">
        <h3 className="f4 mt0 fw6 pt3">
          <FormattedMessage {...messages.topCountriesTitle} />
        </h3>
        <ListElements
          data={countriesPercent}
          valueField={'total'}
          nameField={'name'}
          linkBase={'/explore/?location='}
          linkField={'name'}
        />
      </div>
      <UserCountriesMap projects={projects} />
    </div>
  );
};
