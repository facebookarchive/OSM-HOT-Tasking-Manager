import React, { useState } from 'react';
import { SwitchToggle } from '../formInputs';

export function TasksMapFilterControls({ state, changeState }) {
  const lineClasses = 'mv2 blue-dark f5';
  return (
    <div className="cf right-2 bottom-2 absolute bg-white pa2 br1">
      <SwitchToggle
        label={"Mapillary Overlay"}
        labelPosition="right"
        isChecked={state}
        onChange={() => {changeState()}}
      />
    </div>
  );
}
