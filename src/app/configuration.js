import React, {Component} from 'react';
import PropTypes from 'prop-types';

import ConfigurationForm from '@jetbrains/hub-widget-ui/dist/configuration-form';
import ServiceSelect from '@jetbrains/hub-widget-ui/dist/service-select';
import HttpErrorHandler from '@jetbrains/hub-widget-ui/dist/http-error-handler';

import styles from './app.css';

export default class Configuration extends Component {

  static propTypes = {
    dashboardApi: PropTypes.object.isRequired,
    onCancel: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    selectedYouTrack: PropTypes.object,
    youTracks: PropTypes.array.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.testConnection(this.props.selectedYouTrack);
  }

  testConnection = selectedYouTrack => {
    const testUrl = 'api/admin/workflows?$top=1&fields=id';
    this.setState({isLoading: true});

    this.props.dashboardApi.fetch(selectedYouTrack.id, testUrl).
      then(() => this.setState({errorMessage: null})).
      catch(err =>
        this.setState({errorMessage: HttpErrorHandler.getMessage(err)})
      ).
      finally(() => this.setState({isLoading: false}));
  };

  changeYouTrack = selectedYouTrack => {
    this.setState({selectedYouTrack});
    this.testConnection(selectedYouTrack);
  };

  submitForm = () =>
    this.props.onSave(this.getSelectedYouTrack());

  getSelectedYouTrack = () =>
    this.state.selectedYouTrack || this.props.selectedYouTrack;

  render() {
    const selectedYouTrack = this.getSelectedYouTrack();

    return (
      <ConfigurationForm
        className="ring-form"
        warning={this.state.errorMessage}
        isInvalid={!!this.state.errorMessage}
        isLoading={this.state.isLoading}
        onSave={this.submitForm}
        onCancel={this.props.onCancel}
      >
        <div className={styles.widgetForm}>
          <ServiceSelect
            className="ring-form__group"
            serviceList={this.props.youTracks}
            selectedService={selectedYouTrack}
            onServiceSelect={this.changeYouTrack}
            placeholder={'YouTrack Server'}
            label={'YouTrack Server'}
          />
        </div>
      </ConfigurationForm>
    );
  }
}
