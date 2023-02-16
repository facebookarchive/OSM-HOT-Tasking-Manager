import React from 'react';
import { Link } from '@reach/router';
import { useQueryParam, BooleanParam } from 'use-query-params';
import { FormattedMessage } from 'react-intl';

import messages from './messages';
import { Button } from '../button';
import { SwitchToggle } from '../formInputs';
import { useTagAPI } from '../../hooks/UseTagAPI';
import { useExploreProjectsQueryParams } from '../../hooks/UseProjectsQueryAPI';
import { MappingTypeFilterPicker } from './mappingTypeFilterPicker';
import { ProjectFilterSelect } from './filterSelectFields';
import { CommaArrayParam } from '../../utils/CommaArrayParam';
import { formatFilterCountriesData } from '../../utils/countries';

export const MoreFiltersForm = (props) => {
  /* one useQueryParams for the main form */
  const [formQuery, setFormQuery] = useExploreProjectsQueryParams();

  const handleInputChange = (event) => {
    const target = event.target;
    let value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    if (name === 'types' || !name) {
      // handle mappingTypes toggles in its separate fn inside that component
      // exactTypes doesn't have a name and is handled in a separate fn
      return;
    }
    setFormQuery(
      {
        ...formQuery,
        page: undefined,
        [name]: value,
      },
      'pushIn',
    );
  };

  /* dereference the formQuery */
  const {
    campaign: campaignInQuery,
    organisation: orgInQuery,
    location: countryInQuery,
    interests: interestInQuery,
  } = formQuery;
  const [campaignAPIState] = useTagAPI([], 'campaigns');
  const [orgAPIState] = useTagAPI([], 'organisations');
  const [countriesAPIState] = useTagAPI([], 'countries', formatFilterCountriesData);
  const [interestAPIState] = useTagAPI([], 'interests');

  const [mappingTypesInQuery, setMappingTypes] = useQueryParam('types', CommaArrayParam);
  const [exactTypes, setExactTypes] = useQueryParam('exactTypes', BooleanParam);

  const fieldsetStyle = 'w-100 bn';
  const titleStyle = 'w-100 db ttu fw5 blue-grey';

  const extraFilters = [
    {
      fieldsetName: 'campaign',
      selectedTag: campaignInQuery,
      options: campaignAPIState,
    },
    {
      fieldsetName: 'organisation',
      selectedTag: orgInQuery,
      options: orgAPIState,
    },
    {
      fieldsetName: 'location',
      selectedTag: countryInQuery,
      options: countriesAPIState,
    },
    {
      fieldsetName: 'interests',
      selectedTag: interestInQuery,
      options: interestAPIState,
      payloadKey: 'id',
    },
  ];

  return (
    <form className="pt4" onChange={handleInputChange}>
      <fieldset id="mappingType" className="bn dib">
        <legend className={titleStyle}>
          <FormattedMessage {...messages.typesOfMapping} />
        </legend>
        <MappingTypeFilterPicker
          mappingTypes={mappingTypesInQuery}
          setMappingTypesQuery={setMappingTypes}
        />
      </fieldset>

      <fieldset id="mappingTypesExact" className="bn dib v-mid mb4">
        {mappingTypesInQuery && mappingTypesInQuery.length ? (
          <SwitchToggle
            label={<FormattedMessage {...messages.exactMatch} />}
            isChecked={Boolean(exactTypes)}
            onChange={() => setExactTypes(!exactTypes || undefined)}
            labelPosition="right"
          />
        ) : (
          <></>
        )}
      </fieldset>
      {extraFilters.map((filter) => (
        <ProjectFilterSelect
          fieldsetName={filter.fieldsetName}
          selectedTag={filter.selectedTag}
          options={filter.options}
          payloadKey={filter.payloadKey}
          fieldsetStyle={fieldsetStyle}
          titleStyle={titleStyle}
          setQueryForChild={setFormQuery}
          allQueryParamsForChild={formQuery}
        />
      ))}
      <div className="tr w-100 mt3">
        <Link to="/explore">
          <Button className="bg-white blue-dark mr1 f6 pv2">
            <FormattedMessage {...messages.clear} />
          </Button>
        </Link>
        <Link to={props.currentUrl}>
          <Button className="white bg-primary mr1 f6 dib pv2">
            <FormattedMessage {...messages.apply} />
          </Button>
        </Link>
      </div>
    </form>
  );
};
