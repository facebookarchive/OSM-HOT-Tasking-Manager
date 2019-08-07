import React from "react";
import { FormattedMessage } from "react-intl";

import messages from './messages';


export const MappingLevelMessage = (props) =>  {
  const {level, ...otherProps} = props;
  const message = level ? <FormattedMessage {...messages["mappingLevel"+level]} /> : "";
  return (
    <span {...otherProps}>
      {message}
    </span>);
}
