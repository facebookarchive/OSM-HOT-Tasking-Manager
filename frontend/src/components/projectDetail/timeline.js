import React from 'react';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Legend,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useIntl } from 'react-intl';

import messages from './messages';
import { formatTimelineData, formatTimelineTooltip } from '../../utils/formatChartJSData';
import { CHART_COLOURS } from '../../config';
import { useTimeDiff } from '../../hooks/UseTimeDiff';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, TimeScale, Legend, Tooltip);

export default function ProjectTimeline({ tasksByDay }: Object) {
  const intl = useIntl();
  const unit = useTimeDiff(tasksByDay);
  const mappedTasksConfig = {
    color: CHART_COLOURS.navy,
    label: intl.formatMessage(messages.mappedTasks),
  };
  const validatedTasksConfig = {
    color: CHART_COLOURS.magenta,
    label: intl.formatMessage(messages.validatedTasks),
  };

  return (
    <Line
      data={formatTimelineData(tasksByDay, mappedTasksConfig, validatedTasksConfig)}
      options={{
        plugins: {
          legend: { position: 'top', align: 'end', labels: { boxWidth: 12 } },
          tooltip: {
            callbacks: { label: (context) => formatTimelineTooltip(context, true) },
          },
        },
        scales: { xAxes: [{ type: 'time', time: { unit: unit } }] },
      }}
    />
  );
}
