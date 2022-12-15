import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Field } from 'react-final-form';
import Select from 'react-select';
import { FormattedMessage } from 'react-intl';

import messages from './messages';
import { formatCountryList } from '../utils/countries';
import { fetchLocalJSONAPI } from '../network/genericJSONRequest';
import { CheckIcon } from './svgIcons';

export const RadioField = ({ name, value, className }: Object) => (
  <Field
    name={name}
    component="input"
    type="radio"
    value={value}
    className={`radio-input input-reset pointer v-mid dib h2 w2 mr2 br-100 ba b--blue-light ${
      className || ''
    }`}
  />
);

export const SwitchToggle = ({
  label,
  isChecked,
  onChange,
  labelPosition,
  small = false,
}: Object) => (
  <div className="v-mid justify-center bg-grey-dark">
    {label && labelPosition !== 'right' && <span className="di mr2 nowrap f6 dn-m">{label}</span>}
    <div className="relative dib">
      <input
        className="absolute z-5 w-100 h-100 o-0 pointer checkbox"
        type="checkbox"
        checked={isChecked}
        onChange={onChange}
      />
      <div
        className={`relative z-1 dib ${
          small ? 'w2 h1' : 'w3 h2'
        } bg-blue-grey overflow-hidden br4 v-mid bg-animate checkbox-wrapper`}
      >
        <div
          className={`absolute right-auto left-0 ${
            small ? 'w1 h1' : 'w2 h2'
          } br4 bg-white ba b-grey-light shadow-4 t-cb bg-animate ${
            small ? 'checkbox-toggle-sm' : 'checkbox-toggle'
          }`}
        ></div>
      </div>
    </div>
    {label && labelPosition === 'right' && <span className="di ml2 f6">{label}</span>}
  </div>
);

export const OrganisationSelect = ({ className, orgId, onChange }) => {
  const userDetails = useSelector((state) => state.auth.get('userDetails'));
  const token = useSelector((state) => state.auth.get('token'));
  const [organisations, setOrganisations] = useState([]);

  useEffect(() => {
    if (token && userDetails && userDetails.id) {
      const query = userDetails.role === 'ADMIN' ? '' : `&manager_user_id=${userDetails.id}`;
      fetchLocalJSONAPI(`organisations/?omitManagerList=true${query}`, token)
        .then((result) => setOrganisations(result.organisations))
        .catch((e) => console.log(e));
    }
  }, [userDetails, token]);

  const getOrgPlaceholder = (id) => {
    const orgs = organisations.filter((org) => org.organisationId === id);
    return orgs.length ? orgs[0].name : <FormattedMessage {...messages.selectOrganisation} />;
  };

  return (
    <Select
      classNamePrefix="react-select"
      isClearable={false}
      getOptionLabel={(option) => option.name}
      getOptionValue={(option) => option.organisationId}
      options={organisations}
      placeholder={getOrgPlaceholder(orgId)}
      onChange={onChange}
      className={className}
    />
  );
};

export function OrganisationSelectInput({ className }) {
  return (
    <Field name="organisation_id" className={className} required>
      {(props) => (
        <OrganisationSelect
          orgId={props.input.value}
          onChange={(value) => props.input.onChange(value.organisationId || '')}
          className="z-5"
        />
      )}
    </Field>
  );
}

export function UserCountrySelect({ className, isDisabled = false }: Object) {
  const locale = useSelector((state) => state.preferences.locale);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (locale) {
      setOptions(formatCountryList(locale));
    }
  }, [locale]);

  const getPlaceholder = (value) => {
    const placeholder = options.filter((option) => option.value === value);
    if (placeholder.length) {
      return placeholder[0].label;
    }
    return '';
  };

  return (
    <Field name="country" className={className}>
      {(props) => (
        <Select
          classNamePrefix="react-select"
          isDisabled={isDisabled}
          isClearable={false}
          options={options}
          placeholder={
            getPlaceholder(props.input.value) || <FormattedMessage {...messages.country} />
          }
          onChange={(value) => props.input.onChange(value.value)}
          className="z-5"
        />
      )}
    </Field>
  );
}

export const CheckBoxInput = ({ isActive, changeState, className = '', disabled }) => (
  <div
    role="checkbox"
    disabled={disabled}
    aria-checked={isActive}
    onClick={disabled ? () => {} : changeState}
    onKeyPress={disabled ? () => {} : changeState}
    tabIndex="0"
    className={`bg-white w1 h1 ma1 ba bw1 ${
      disabled ? 'b--grey-light' : 'b--primary'
    } br1 relative pointer ${className}`}
  >
    {isActive ? (
      <div
        className={`${disabled ? 'bg-grey-light' : 'bg-primary'} ba b--white bw1 br1 w-100 h-100`}
      ></div>
    ) : (
      <></>
    )}
  </div>
);

export const CheckBox = ({ activeItems, toggleFn, itemId }) => {
  const isActive = activeItems.includes(itemId);
  const changeState = (e) => {
    e.persist();
    e.preventDefault();
    e.stopPropagation();

    let copy = activeItems;
    if (copy.includes(itemId)) {
      copy = copy.filter((s) => s !== itemId);
    } else {
      copy = [...copy, itemId];
    }
    toggleFn(copy);
  };

  return <CheckBoxInput changeState={changeState} isActive={isActive} />;
};

export const SelectAll = ({ selected, setSelected, allItems, className }) => {
  const isActive = selected.length === allItems.length;
  const changeState = (e) => {
    e.preventDefault();
    if (isActive) {
      setSelected([]);
    } else {
      setSelected(allItems);
    }
  };

  return <CheckBoxInput changeState={changeState} isActive={isActive} className={className} />;
};

export const InterestsList = ({ interests, field, changeSelect }) => (
  <ul className="list w-100 pa0 flex flex-wrap">
    {interests.map((i) => (
      <li
        onClick={() => changeSelect(i.id)}
        className={`${
          i[field] === true ? 'b--blue-dark bw1' : 'b--grey-light'
        } bg-white w-30-ns w-100 ba pa3 f6 tc mb2 mr3 relative ttc pointer`}
        key={i.id}
      >
        {i.name}
        {i[field] === true && (
          <CheckIcon className="f7 pa1 br-100 bg-black white absolute right-0 top-0" />
        )}
      </li>
    ))}
  </ul>
);
