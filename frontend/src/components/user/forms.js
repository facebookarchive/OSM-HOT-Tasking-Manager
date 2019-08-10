import React from 'react';
import { FormattedMessage } from "react-intl";
import { Form, Field } from 'react-final-form';

import messages from './messages';
import { FormSubmitButton } from '../button';


const onSubmit = async values => {
  console.log(values);
}


export function UserInformationForm({userDetails}: Object) {
  return <div>
    <h3><FormattedMessage {...messages.personalInfo} /></h3>
    <Form onSubmit={onSubmit} initialValues={userDetails}
      render={({ handleSubmit, pristine, form, submitting, values }) => {
        return (
          <form onSubmit={handleSubmit}>
            <div>
              <label><FormattedMessage {...messages.name} /></label>
              <Field name="name" component="input" />
            </div>
            <div>
              <label><FormattedMessage {...messages.email} /></label>
              <Field name="emailAddress" component="input" />
            </div>
            <div>
              <label><FormattedMessage {...messages.city} /></label>
              <Field name="city" component="input" />
            </div>
            <div>
              <label><FormattedMessage {...messages.country} /></label>
              <Field name="country" component="input" />
            </div>
            <div>
              <label>Twitter</label>
              <Field name="twitterId" component="input" />
            </div>
            <div>
              <label>Facebook</label>
              <Field name="facebookId" component="input" />
            </div>
            <div>
              <label>Linkedin</label>
              <Field name="linkedinId" component="input" />
            </div>
            <FormSubmitButton disabled={submitting || pristine} className="bg-blue-dark white mh1 mv2" disabledClassName="bg-grey-light white mh1 mv2" >
              <FormattedMessage {...messages.save} />
            </FormSubmitButton>
          </form>
        );
      }}
    >
    </Form>
  </div>;
}
