import DashboardAddons from 'hub-dashboard-addons';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import ConfigurableWidget from '@jetbrains/hub-widget-ui/dist/configurable-widget';
import LoaderInline from '@jetbrains/ring-ui/components/loader-inline/loader-inline';

import 'file-loader?name=[name].[ext]!../../manifest.json'; // eslint-disable-line import/no-unresolved
import styles from './app.css';

import Content from './content';
import Configuration from './configuration';

class Widget extends Component {
  //-----DATA-STRUCTURE-----//

  /*
    {
      <service.id>: {
        name: <service.name>,
        url: <service.homeUrl>,
        loading: <true/false>,
        hasPermissions: <true/false>,
        hasGlobalPermission: <true/false>,
        permittedProjects: [<project.id>],
        brokenProjects: [{
          name: <project.name>,
          id: <project.id>,
          ringId: <project.ringId>,
          wfs: {
            <wf.id>: {
              name: <wf.name>,
              title: <wf.title>,
              loading: <true/false>,
              problems: [<message>]
            },
            <wf.id>: ...
          }
        }]
      }
    }
  */

  static getWidgetTitle =
    (selectedYouTrack, youTracks, isConfiguring, counter) => {
      const defaultTitle = 'Workflow Health';

      if (isConfiguring) {
        return defaultTitle;
      }

      const href = `${selectedYouTrack.homeUrl}/admin/workflows`;
      if ((youTracks || []).length > 1) {
        return {
          text: `${defaultTitle} for ${selectedYouTrack.name || selectedYouTrack.homeUrl}`,
          href,
          counter
        };
      }
      return {text: defaultTitle, href, counter};
    };

  //-----LOADING-DATA-----//

  static propTypes = {
    dashboardApi: PropTypes.object,
    registerWidgetApi: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.initialize();
  }

  initialize() {
    this.setState({isLoading: true});
    this.props.dashboardApi.readConfig().then(config => {
      const isNew = !config;
      this.setState({isNew});
      this.loadStatus((config || {}).youTrack);
    });
  }

  loadStatus(predefinedYouTrack) {
    const fields = 'id,name,applicationName,homeUrl';
    const query = 'applicationName:YouTrack';
    const url = `api/rest/services?top=-1&fields=${fields}&query=${query}`;

    this.props.dashboardApi.fetchHub(url).then(response => {
      const youTracks = ((response && response.services) || []).
        filter(youtrack => !!youtrack.homeUrl);

      if (youTracks.length > 1) {
        const selectedYouTrack = predefinedYouTrack
          ? youTracks.filter(yt => yt.id === predefinedYouTrack.id)[0]
          : youTracks[0];
        const shouldSelectYouTrack = !predefinedYouTrack || !selectedYouTrack;
        this.setState({
          isConfiguring: shouldSelectYouTrack,
          isLoading: !shouldSelectYouTrack,
          selectedYouTrack,
          youTracks
        }, () =>
          !shouldSelectYouTrack && this.loadPermissions(selectedYouTrack.id)
        );

        this.props.registerWidgetApi({
          onRefresh: () => this.loadStatus(),
          onConfigure: () => this.setState({isConfiguring: true})
        });
      } else {
        this.props.registerWidgetApi({
          onRefresh: () => this.loadStatus()
        });
        this.setState({
          isConfiguring: false,
          selectedYouTrack: youTracks[0],
          youTracks
        }, () => this.loadPermissions(youTracks[0] && youTracks[0].id));
      }
    });
  }

  loadPermissions(ytServiceId) {
    const fields = 'id,project(id)';
    const query = 'permission:jetbrains.jetpass.project-update';
    const url = `${'api/rest/users/me/sourcedprojectroles?top=-1' +
          '&fields='}${ fields
    }&query=${ query}`;

    this.props.dashboardApi.fetchHub(url).then(response => {
      const roles = response.sourcedprojectroles;
      if (!roles || !roles.length) {
        this.setState({hasPermissions: false, isLoading: false});
      } else {
        const permittedProjects =
          [...new Set(roles.map(role => role.project.id))];
        this.setState({
          hasGlobalPermission: permittedProjects.indexOf('0') !== -1,
          hasPermissions: true,
          permittedProjects
        }, () => this.loadWorkflows(ytServiceId));
      }
    });
  }

  loadWorkflows(ytServiceId) {
    const fields = 'id,name,title,usages(project(id,ringId,name),isBroken)';
    const url = `api/admin/workflows?$top=-1&fields=${fields}`;

    this.props.dashboardApi.fetch(ytServiceId, url).then(workflows => {
      const brokenProjectsSet = {};
      const {hasGlobalPermission, permittedProjects} = this.state;

      workflows.forEach(workflow => {
        if (workflow.usages.length) {
          if (workflow.usages.find(usage => usage.isBroken)) {
            const projects = workflow.usages.filter(usage => usage.isBroken).
              map(usage => ({
                id: usage.project.id,
                name: usage.project.name,
                ringId: usage.project.ringId,
                wfs: {}
              }));
            projects.forEach(project => {
              if (hasGlobalPermission ||
                permittedProjects.indexOf(project.ringId) !== -1) {
                if (!brokenProjectsSet[project.id]) {
                  brokenProjectsSet[project.id] = project;
                }
                brokenProjectsSet[project.id].wfs[workflow.id] = {
                  id: workflow.id,
                  name: workflow.name,
                  title: workflow.title,
                  loading: true,
                  problems: []
                };
              }
            });
          }
        }
      });

      const brokenProjects = Object.keys(brokenProjectsSet).map(
        projectId => brokenProjectsSet[projectId]
      );
      this.setState({brokenProjects, isLoading: false});

      brokenProjects.forEach(project => {
        this.loadRules(ytServiceId, project).
          then(() => this.setState({brokenProjects}));
      });
    });
  }

  loadRules(ytServiceId, project) {
    const fields = 'rule(id,workflow(id,name)),isBroken,problems(id,message)';
    const url = `api/admin/projects/${ project.id
    }/workflowRules?$top=-1&fields=${ fields}`;

    return this.props.dashboardApi.fetch(ytServiceId, url).then(usages => {
      usages.filter(usage => usage.isBroken).forEach(usage => {
        const wfId = usage.rule.workflow.id;
        const problems = project.wfs[wfId].problems;
        usage.problems.forEach(usageProblem => {
          const exists = problems.some(
            problem => problem.message === usageProblem.message
          );
          if (!exists) {
            problems.push(usageProblem);
          }
        });
        project.wfs[wfId].loading = false;
      });

      return project;
    });
  }

  removeWidget = () =>
    this.props.dashboardApi.removeWidget();

  cancelConfigurationForm = () => {
    if (this.state.isNew) {
      this.removeWidget();
    } else {
      this.setState({isConfiguring: false});
    }
  };

  submitConfigurationForm = youTrack => {
    this.setState({
      selectedYouTrack: youTrack,
      isConfiguring: false,
      isLoading: true,
      isNew: false
    });
    this.loadStatus(youTrack);
    this.props.dashboardApi.storeConfig({youTrack});
  };

  renderContent = () => (
    <Content
      brokenProjects={this.state.brokenProjects}
      hasPermission={this.state.hasPermissions}
      isLoading={this.state.isLoading}
      homeUrl={this.state.selectedYouTrack.homeUrl}
      onRemove={this.removeWidget}
    />
  );

  renderConfiguration = () => (
    <Configuration
      onCancel={this.cancelConfigurationForm}
      onSave={this.submitConfigurationForm}
      selectedYouTrack={this.state.selectedYouTrack}
      youTracks={this.state.youTracks}
      dashboardApi={this.props.dashboardApi}
    />
  );

  //-----RENDERING-DATA-----//

  render() {
    const {
      selectedYouTrack, youTracks, isConfiguring, brokenProjects
    } = this.state;

    if (!selectedYouTrack) {
      return (
        <div className={styles.widget}>
          <LoaderInline/>
        </div>
      );
    }

    const brokenProjectsNumber =
      brokenProjects ? brokenProjects.length : undefined;
    const title = Widget.getWidgetTitle(
      selectedYouTrack, youTracks, isConfiguring, brokenProjectsNumber
    );
    return (
      <div className={styles.widget}>
        <ConfigurableWidget
          isConfiguring={isConfiguring}
          dashboardApi={this.props.dashboardApi}
          widgetLoader={this.state.isLoading}
          widgetTitle={title}
          Configuration={this.renderConfiguration}
          Content={this.renderContent}
        />
      </div>
    );
  }
}

DashboardAddons.registerWidget((dashboardApi, registerWidgetApi) =>
  render(
    <Widget
      dashboardApi={dashboardApi}
      registerWidgetApi={registerWidgetApi}
    />,
    document.getElementById('app-container')
  )
);
