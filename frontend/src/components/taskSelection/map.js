import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import bbox from '@turf/bbox';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import { FormattedMessage } from 'react-intl';
import WebglUnsupported from '../webglUnsupported';
import messages from './messages';
import {
  MAPBOX_TOKEN,
  TASK_COLOURS,
  MAP_STYLE,
  MAPBOX_RTL_PLUGIN_URL,
  MAPILLARY_TOKEN,
} from '../../config';
import lock from '../../assets/img/lock.png';
import redlock from '../../assets/img/red-lock.png';
import axios from 'axios';
import compassIcon from '../../assets/img/mapillary-compass.png';
import { SwitchToggle } from '../formInputs';

let lockIcon = new Image(17, 20);
lockIcon.src = lock;

let redlockIcon = new Image(17, 20);
redlockIcon.src = redlock;

mapboxgl.accessToken = MAPBOX_TOKEN;
try {
  mapboxgl.setRTLTextPlugin(MAPBOX_RTL_PLUGIN_URL);
} catch {
  console.log('RTLTextPlugin is loaded');
}

export const TasksMap = ({
  className,
  mapResults,
  taskBordersMap,
  priorityAreas,
  taskBordersOnly,
  taskCentroidMap,
  disableScrollZoom,
  selectTask,
  zoomedTaskId,
  navigate,
  animateZoom = true,
  showTaskIds = false,
  selected: selectedOnMap,
  earliestStreetImagery = '1970-01-01T00:00:00.000000Z',
  mapillaryOrganizationId,
}) => {
  const mapRef = React.createRef();
  const locale = useSelector((state) => state.preferences['locale']);
  const authDetails = useSelector((state) => state.auth.get('userDetails'));
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [mapillaryShown, setMapillaryShown] = useState(false);

  const [map, setMapObj] = useState(null);

  useLayoutEffect(() => {
    /* May be able to refactor this to just take
     * advantage of useRef instead inside other useLayoutEffect() */
    /* I referenced this initially https://philipprost.com/how-to-use-mapbox-gl-with-react-functional-component/ */
    mapboxgl.supported() &&
      setMapObj(
        new mapboxgl.Map({
          container: mapRef.current,
          style: MAP_STYLE,
          center: [0, 0],
          zoom: 1,
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
    // should run only when triggered from tasks list
    if (typeof zoomedTaskId === 'number') {
      const taskGeom = mapResults.features.filter(
        (task) => task.properties.taskId === zoomedTaskId,
      )[0].geometry;
      map.fitBounds(bbox(taskGeom), { padding: 40, maxZoom: 22, animate: true });
    }
  }, [zoomedTaskId, map, mapResults]);

  useLayoutEffect(() => {
    const onSelectTaskClick = (e) => {
      const task = e.features && e.features[0].properties;
      selectTask && selectTask(task.taskId, task.taskStatus);
    };

    const countryMapLayers = [
      taskBordersMap && 'outerhull-tasks-border',
      taskBordersMap && 'point-tasks-centroid',
      taskBordersMap && 'point-tasks-centroid-inner',
    ];
    const taskMapLayers = [
      'tasks-icon',
      'tasks-fill',
      'selected-tasks-border',
      'unselected-tasks-border',
      taskBordersMap && 'outerhull-tasks-border',
    ];

    const updateTMZoom = () => {
      // fit bounds to last mapped/validated task(s), if exists
      // otherwise fit bounds to all tasks
      if (zoomedTaskId?.length > 0) {
        const lastLockedTasks = mapResults.features.filter((task) =>
          zoomedTaskId.includes(task.properties.taskId),
        );

        const lastLockedTasksGeom = lastLockedTasks.reduce(
          (acc, curr) => {
            const geom = curr.geometry;
            return {
              type: 'MultiPolygon',
              coordinates: [...acc.coordinates, ...geom.coordinates],
            };
          },
          { type: 'MultiPolygon', coordinates: [] },
        );

        const screenWidth = window.innerWidth;
        map.fitBounds(bbox(lastLockedTasksGeom), {
          padding: screenWidth / 8,
          animate: false,
        });
      } else if (!taskBordersOnly) {
        map.fitBounds(bbox(mapResults), { padding: 40, animate: animateZoom });
      } else {
        map.fitBounds(bbox(mapResults), { padding: 220, maxZoom: 6.5, animate: animateZoom });
      }
    };

    const mapboxLayerDefn = () => {
      map.once('load', () => {
        map.resize();
      });
      if (map.getSource('tasks') === undefined) {
        map.addImage('lock', lockIcon, { width: 17, height: 20, data: lockIcon });
        map.addImage('redlock', redlockIcon, { width: 30, height: 30, data: redlockIcon });

        map.addSource('tasks', {
          type: 'geojson',
          data: mapResults,
        });

        map.addControl(new mapboxgl.NavigationControl());
        if (disableScrollZoom) {
          // disable map zoom when using scroll
          map.scrollZoom.disable();
        } else {
          map.scrollZoom.enable();
        }
        const locked = [
          'any',
          ['==', ['to-string', ['get', 'taskStatus']], 'LOCKED_FOR_MAPPING'],
          ['==', ['to-string', ['get', 'taskStatus']], 'LOCKED_FOR_VALIDATION'],
        ];

        let taskStatusCondition = ['case'];

        if (authDetails.id !== undefined) {
          const all_condition = ['all', locked, ['==', ['get', 'lockedBy'], authDetails.id]];
          taskStatusCondition = [...taskStatusCondition, ...[all_condition, 'redlock']];
        }
        taskStatusCondition = [...taskStatusCondition, ...[locked, 'lock', '']];

        map.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true,
            },
            trackUserLocation: true,
            showUserHeading: true,
          }),
        );

        map.addLayer({
          id: 'tasks-icon',
          type: 'symbol',
          source: 'tasks',
          layout: {
            'icon-image': taskStatusCondition,
            'icon-size': 0.7,
          },
        });

        map.addLayer(
          {
            id: 'tasks-fill',
            type: 'fill',
            source: 'tasks',
            paint: {
              'fill-color': [
                'match',
                ['get', 'taskStatus'],
                'READY',
                TASK_COLOURS.READY,
                'LOCKED_FOR_MAPPING',
                TASK_COLOURS.LOCKED_FOR_MAPPING,
                'MAPPED',
                TASK_COLOURS.MAPPED,
                'LOCKED_FOR_VALIDATION',
                TASK_COLOURS.LOCKED_FOR_VALIDATION,
                'VALIDATED',
                TASK_COLOURS.VALIDATED,
                'INVALIDATED',
                TASK_COLOURS.INVALIDATED,
                'BADIMAGERY',
                TASK_COLOURS.BADIMAGERY,
                'PENDING_IMAGE_CAPTURE',
                TASK_COLOURS.PENDING_IMAGE_CAPTURE,
                'MORE_IMAGES_NEEDED',
                TASK_COLOURS.MORE_IMAGES_NEEDED,
                'IMAGE_CAPTURE_DONE',
                TASK_COLOURS.IMAGE_CAPTURE_DONE,
                'rgba(0,0,0,0)',
              ],
              // 'fill-opacity': ['/', ['*', 2, ['get', 'taskId']], 1000], // Temporary.... creates a gradient
              'fill-opacity': 0.8,
            },
          },
          'tasks-icon',
        );

        map.addSource('mapillary', {
          type: 'vector',
          tiles: [
            `https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=${MAPILLARY_TOKEN}`,
          ],
          minzoom: 1,
          maxzoom: 14,
        });

        map.addLayer({
          id: 'mapillary-sequences',
          type: 'line',
          source: 'mapillary',
          'source-layer': 'sequence',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#05CB63',
            'line-width': 2,
          },
          layout: {
            visibility: 'none',
          },
        });
        map.addLayer({
          id: 'mapillary-images',
          type: 'circle',
          source: 'mapillary',
          'source-layer': 'image',
          paint: {
            'circle-color': '#05CB63',
            'circle-radius': 5,
          },
          layout: {
            visibility: 'none',
          },
        });

        map.loadImage(compassIcon, (error, image) => {
          if (error) throw error;

          map.addImage('compass', image);
        });

        map.addSource('point', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [0, 0],
                },
              },
            ],
          },
        });

        map.addLayer({
          id: 'mapillary-compass',
          type: 'symbol',
          source: 'point',
          layout: {
            'icon-image': 'compass',
            'icon-size': 0.5,
            visibility: 'none',
          },
        });

        map.addLayer({
          id: 'selected-tasks-border',
          type: 'line',
          source: 'tasks',
          paint: {
            'line-color': '#2c3038',
            'line-width': 2,
          },
          filter:
            selectedOnMap === undefined || selectedOnMap.length === 0
              ? ['in', 'taskId', '']
              : ['in', 'taskId'].concat(selectedOnMap),
        });

        map.addLayer(
          {
            id: 'unselected-tasks-border',
            type: 'line',
            source: 'tasks',
            paint: {
              'line-color': '#999db6',
              'line-width': 1,
            },
          },
          'selected-tasks-border',
        );
      }

      map.setFilter('mapillary-images', [
        'all',
        ['>=', ['get', 'captured_at'], new Date(earliestStreetImagery).getTime()],
      ]);

      map.setFilter('mapillary-sequences', [
        'all',
        ['>=', ['get', 'captured_at'], new Date(earliestStreetImagery).getTime()],
      ]);

      if (mapillaryOrganizationId > 0) {
        map.setFilter('mapillary-images', [
          'all',
          ['==', ['get', 'organization_id'], mapillaryOrganizationId],
        ]);

        map.setFilter('mapillary-sequences', [
          'all',
          ['==', ['get', 'organization_id'], mapillaryOrganizationId],
        ]);
      }

      if (map.getSource('tasks-outline') === undefined && taskBordersMap) {
        map.addSource('tasks-outline', {
          type: 'geojson',
          data: taskBordersMap,
        });

        map.addLayer({
          id: 'outerhull-tasks-border',
          type: 'line',
          source: 'tasks-outline',
          paint: {
            'line-color': '#68707f',
            'line-width': {
              base: 0.3,
              stops: [
                [1, 4],
                [10, 1],
                [12, 0.3],
              ],
            },
          },
          layout: {
            visibility: 'visible',
          },
        });
      }

      if (map.getSource('priority-area') === undefined && priorityAreas) {
        const priorityFeatureCollection = {
          type: 'FeatureCollection',
          features: priorityAreas.map((poly) => ({ type: 'Feature', geometry: poly })),
        };
        map.addSource('priority-area', {
          type: 'geojson',
          data: priorityFeatureCollection,
        });

        map.addLayer({
          id: 'priority-area-border',
          type: 'line',
          source: 'priority-area',
          paint: {
            'line-color': '#d73f3f',
            'line-dasharray': [2, 2],
            'line-width': 2,
            'line-opacity': 0.7,
          },
          layout: {
            visibility: 'visible',
          },
        });

        map.addLayer(
          {
            id: 'priority-area',
            type: 'fill',
            source: 'priority-area',
            paint: {
              'fill-color': '#d73f3f',
              'fill-outline-color': '#d73f3f',
              'fill-opacity': 0.4,
            },
            layout: {
              visibility: 'visible',
            },
          },
          'tasks-fill',
        );
      }

      if (map.getSource('tasks-centroid') === undefined && taskBordersMap && taskCentroidMap) {
        map.addSource('tasks-centroid', {
          type: 'geojson',
          data: taskCentroidMap,
        });

        map.addLayer({
          id: 'point-tasks-centroid-inner',
          type: 'circle',
          source: 'tasks-centroid',
          paint: {
            'circle-radius': {
              base: 3,
              stops: [
                [12, 4],
                [22, 180],
              ],
            },
            'circle-color': '#FFF',
          },
          layout: {
            visibility: 'visible',
          },
        });

        map.addLayer(
          {
            id: 'point-tasks-centroid',
            type: 'circle',
            source: 'tasks-centroid',
            paint: {
              'circle-radius': {
                base: 5,
                stops: [
                  [12, 10],
                  [22, 180],
                ],
              },
              'circle-color': '#d73f3f',
            },
            layout: {
              visibility: 'visible',
            },
          },
          'point-tasks-centroid-inner',
        );
      }

      if (showTaskIds) {
        map.on('mousemove', 'tasks-fill', function (e) {
          // when the user hover on a task they are validating, enable the task id dialog
          if (e.features[0].properties.lockedBy === authDetails.id) {
            setHoveredTaskId(e.features[0].properties.taskId);
          } else {
            setHoveredTaskId(null);
          }
        });
        map.on('mouseleave', 'tasks-fill', function (e) {
          // disable the task id dialog when the mouse go outside the task grid
          setHoveredTaskId(null);
        });
      }

      if (taskBordersOnly && navigate) {
        map.on('mouseenter', 'point-tasks-centroid', function (e) {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'point-tasks-centroid', function (e) {
          map.getCanvas().style.cursor = '';
        });
        map.on('click', 'point-tasks-centroid', () => navigate('./tasks'));
        map.on('click', 'point-tasks-centroid-inner', () => navigate('./tasks'));
      }

      map.on('mouseenter', 'tasks-fill', function (e) {
        if (selectTask) {
          // Change the cursor style as a UI indicator.
          map.getCanvas().style.cursor = 'pointer';
        }
      });

      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
      });

      function displayMapPopup(e) {
        popup.remove();

        map.getCanvas().style.cursor = 'pointer';
        let imageObj = e.features[0].properties;

        axios
          .get(
            `https://graph.mapillary.com/${imageObj.id}?fields=thumb_256_url,computed_compass_angle,camera_type`,
            {
              headers: {
                Authorization: `OAuth ${MAPILLARY_TOKEN}`,
              },
            },
          )
          .then((resp) => {
            popup
              .setLngLat([e.lngLat.lng, e.lngLat.lat])
              .setHTML(`<img src="${resp.data.thumb_256_url}"></img>`)
              .addTo(map);

            const geoJsonData = {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [e.lngLat.lng, e.lngLat.lat],
                  },
                },
              ],
            };

            map.getSource('point').setData(geoJsonData);
            map.setLayoutProperty('mapillary-compass', 'visibility', 'visible');
            map.setLayoutProperty(
              'mapillary-compass',
              'icon-rotate',
              resp.data.computed_compass_angle,
            );
          });
      }
      map.on('mousemove', 'mapillary-images', (e) => displayMapPopup(e));
      popup.on('close', () => map.setLayoutProperty('mapillary-compass', 'visibility', 'none'));

      map.on('click', 'tasks-fill', onSelectTaskClick);
      map.on('mouseleave', 'tasks-fill', function (e) {
        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = '';
      });
      updateTMZoom();
    };

    const someResultsReady = mapResults && mapResults.features && mapResults.features.length > 0;

    const mapReadyTasksReady =
      map !== null &&
      map.isStyleLoaded() &&
      map.getSource('tasks') === undefined &&
      someResultsReady;
    const tasksReadyMapLoading =
      map !== null &&
      !map.isStyleLoaded() &&
      map.getSource('tasks') === undefined &&
      someResultsReady;
    const mapLayersAlreadyDefined = map !== null && map.getSource('tasks') !== undefined;

    /* set up style/sources for the map, either immediately or on base load */
    if (mapReadyTasksReady && !mapLayersAlreadyDefined) {
      mapboxLayerDefn();
    } else if (tasksReadyMapLoading && !mapLayersAlreadyDefined) {
      map.on('load', mapboxLayerDefn);
    } else if (tasksReadyMapLoading || mapReadyTasksReady) {
      console.error('One of the hook dependencies changed and try to redefine the map');
    }

    /* refill the source on mapResults changes */
    if (mapLayersAlreadyDefined && someResultsReady) {
      map.getSource('tasks').setData(mapResults);

      /* update the click event so its functional scope can see the
       *  new selectedOnMap to be able to toggle it off.
       *  These will accumulate and need cleanup. */
      map.on('click', 'tasks-fill', onSelectTaskClick);

      if (taskBordersOnly === true) {
        taskMapLayers.forEach((lr) => lr && map.setLayoutProperty(lr, 'visibility', 'none'));
        countryMapLayers.forEach((lr) => lr && map.setLayoutProperty(lr, 'visibility', 'visible'));
      } else {
        countryMapLayers.forEach((lr) => lr && map.setLayoutProperty(lr, 'visibility', 'none'));
        taskMapLayers.forEach((lr) => lr && map.setLayoutProperty(lr, 'visibility', 'visible'));
        if (disableScrollZoom) {
          updateTMZoom();
        }
        if (selectedOnMap && selectedOnMap.length > 0) {
          map.setFilter('selected-tasks-border', ['in', 'taskId'].concat(selectedOnMap));
        } else {
          map.setFilter('selected-tasks-border', ['in', 'taskId', '']);
        }
      }
    }

    return () => {
      /* cleanup any extra click event listeners after each effect */
      if (map !== null && map.getSource('tasks') !== undefined && someResultsReady) {
        map.off('click', 'tasks-fill', onSelectTaskClick);
        countryMapLayers.forEach((lr) => lr && map.setLayoutProperty(lr, 'visibility', 'none'));
        taskMapLayers.forEach((lr) => lr && map.setLayoutProperty(lr, 'visibility', 'none'));
      }
    };
  }, [
    map,
    mapResults,
    priorityAreas,
    selectedOnMap,
    selectTask,
    taskBordersMap,
    taskCentroidMap,
    taskBordersOnly,
    disableScrollZoom,
    navigate,
    animateZoom,
    authDetails.id,
    showTaskIds,
    zoomedTaskId,
    earliestStreetImagery,
    mapillaryOrganizationId,
  ]);

  useEffect(() => {
    if (map) {
      mapillaryShown
        ? map.setLayoutProperty('mapillary-images', 'visibility', 'visible')
        : map.setLayoutProperty('mapillary-images', 'visibility', 'none');
      mapillaryShown
        ? map.setLayoutProperty('mapillary-sequences', 'visibility', 'visible')
        : map.setLayoutProperty('mapillary-sequences', 'visibility', 'none');
    }
  }, [mapillaryShown]);

  if (!mapboxgl.supported()) {
    return <WebglUnsupported className={`vh-75-l vh-50 fr ${className || ''}`} />;
  } else {
    return (
      <>
        {showTaskIds && hoveredTaskId && (
          <div className="absolute top-1 left-1 bg-primary white base-font fw8 f5 ph3 pv2 z-5 mr2 ">
            <FormattedMessage {...messages.taskId} values={{ id: hoveredTaskId }} />
          </div>
        )}
        <div id="map" className={className} ref={mapRef}>
          <div
            style={{ zIndex: 10 }}
            id={'mapillary-checkbox'}
            className={'cf left-1 top-1 pa2 absolute bg-white br1'}
          >
            <SwitchToggle
              isChecked={mapillaryShown}
              labelPosition="right"
              onChange={() => setMapillaryShown(!mapillaryShown)}
              label={<FormattedMessage {...messages.showMapillaryLayer} />}
            />
          </div>
        </div>
      </>
    );
  }
};
