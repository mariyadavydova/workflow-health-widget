import DashboardAddons from 'hub-dashboard-addons';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Link from '@jetbrains/ring-ui/components/link/link';
import Heading, {H1, H2, H3, H4} from '@jetbrains/ring-ui/components/heading/heading';
import Island, {Header, Content} from '@jetbrains/ring-ui/components/island/island';
import Text from '@jetbrains/ring-ui/components/text/text';
import Tooltip from '@jetbrains/ring-ui/components/tooltip/tooltip';

import 'file-loader?name=[name].[ext]!../../manifest.json'; // eslint-disable-line import/no-unresolved
import styles from './app.css';

class Widget extends Component {
  static propTypes = {
    dashboardApi: PropTypes.object,
    registerWidgetApi: PropTypes.func
  };

  constructor(props) {
    super(props);
    const {registerWidgetApi, dashboardApi} = props;

    this.state = {
    };

    registerWidgetApi({
      onRefresh: () => this.loadStatus()
    });

    this.loadStatus();
  }

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
        brokenProjects: {
          <project.id>: {
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
          },
          <project.id>: ...
        }
      },
      <service.id>: ...
    }
  */

  //-----LOADING-DATA-----//

  loadStatus() {
    const fields = 'id,name,applicationName,homeUrl';
    const query = 'applicationName:YouTrack';
    const url = 'api/rest/services?top=-1' +
          '&fields=' + fields +
          '&query=' + query;

    this.props.dashboardApi.fetchHub(url).then(response => {
      var youtracks = (response && response.services) || [];
      var data = {};

      youtracks.forEach(yt => {
        if (!!yt.homeUrl) {
          data[yt.id] = {
            name: yt.name,
            url: yt.homeUrl,
            loading: true,
            hasPermissions: true,
            hasGlobalPermission: false,
            permittedProjects: []
          };
        }
      });

      this.setState({data: data});

      Object.keys(data).forEach(key => {
        this.loadPermissions(key);
      });
    });
  }

  loadPermissions(key) {
    var {data} = this.state;

    const fields = 'id,project(id)';
    const query = 'permission:jetbrains.jetpass.project-update';
    const url = 'api/rest/users/me/sourcedprojectroles?top=-1' +
          '&fields=' + fields +
          '&query=' + query;

    this.props.dashboardApi.fetchHub(url).then(response => {
      var roles = response.sourcedprojectroles;
      if (!roles || !roles.length) {
        data[key].hasPermissions = false;
        this.setState({data: data});
      } else {
        data[key].permittedProjects =
          [...new Set(roles.map(role => role.project.id))];
        if (data[key].permittedProjects.indexOf("0") !== -1) {
          data[key].hasGlobalPermission = true;
        }
        this.loadWorkflows(key);
      }
    });
  }

  loadWorkflows(key) {
    var {data} = this.state;
    const fields = 'id,name,title,usages(project(id,ringId,name),isBroken)';
    const url = 'api/admin/workflows?$top=-1&fields=' + fields;

    this.props.dashboardApi.fetch(key, url).then(workflows => {
      var brokenProjects = {};
      var hasGlobalPermission = data[key].hasGlobalPermission;
      var permittedProjects = data[key].permittedProjects;

      workflows.forEach(wf => {
        if (wf.usages.length) {
          if (wf.usages.find(us => us.isBroken)) {
            var projects = wf.usages.filter(us => us.isBroken).
                map(us => ({
                  id: us.project.id,
                  name: us.project.name,
                  ringId: us.project.ringId,
                  wfs: {}
                }));
            projects.forEach(p => {
              if (hasGlobalPermission || permittedProjects.indexOf(p.ringId) !== -1) {
                if (!brokenProjects[p.id]) {
                  brokenProjects[p.id] = p;
                }
                brokenProjects[p.id].wfs[wf.id] = {
                  name: wf.name,
                  title: wf.title,
                  loading: true,
                  problems: []
                };
              }
            });
          }
        }
      });

      data[key].brokenProjects = brokenProjects;
      data[key].loading = false;
      this.setState({data: data});

      Object.keys(data[key].brokenProjects).forEach(projectId => {
        this.loadRules(key, projectId);
      });
    });
  }

  loadRules(key, projectId) {
    var {data} = this.state;
    const fields = 'rule(id,workflow(id,name)),isBroken,problems(id,message)';
    const url = 'api/admin/projects/' + projectId +
          '/workflowRules?$top=-1&fields=' + fields;

    this.props.dashboardApi.fetch(key, url).then(usages => {
      usages.filter(usage => usage.isBroken).forEach(usage => {
        var wfId = usage.rule.workflow.id;
        var problems = data[key].brokenProjects[projectId].wfs[wfId].problems;
        usage.problems.forEach(problem => {
          if (problems.indexOf(problem.message) === -1) {
            problems.push(problem.message);
          }
        });
        data[key].brokenProjects[projectId].wfs[wfId].loading = false;
      });

      this.setState({data: data});
    });
  }

  //-----RENDERING-DATA-----//

  render() {
    const {data} = this.state;

    if (data) {
      return (
        <div className={styles.widget}>
          {Object.keys(data).map(key => (
            <div className={styles.widget} key={key}>
              <Tooltip title={data[key].url}>
                <H2>{data[key].name}</H2>
              </Tooltip>
              {this.renderProjects(data[key])}
            </div>
          ))}
        </div>
      );
    } else {
      return (
        <div className={styles.widget}>
          <H3 caps>Loading...</H3>
        </div>
      );
    }
  }

  renderProjects(yt) {
    if (!yt.hasPermissions) {
      return (
        <div className={styles.widget}>
          <H3 caps>You have no project admin permissions here!</H3>
        </div>
      )
    } else if (yt.loading) {
      return (
        <div className={styles.widget}>
          <H3 caps>Loading...</H3>
        </div>
      )
    } else if (yt.brokenProjects && Object.keys(yt.brokenProjects).length) {
      var projects = Object.entries(yt.brokenProjects).sort((a, b) => {
        if (a[1].name > b[1].name) return 1;
        if (a[1].name < b[1].name) return -1;
        return 0;
      });
      return (
        <div className={styles.widget}>
          <H3>Some projects have workflow configuration errors:</H3>
          {projects.map(entry => (
            <div className={styles.widget} key={entry[0]}>
              <Island>
                <Header border>
                  <Link
                    pseudo={false}
                    target={'_top'}
                    href={this.projectSettingsUrl(yt, entry[0])}
                  >
                    {entry[1].name}
                  </Link>
                </Header>
                <Content>
                  {this.renderWorkflows(entry[1])}
                </Content>
              </Island>
            </div>
          ))}
        </div>
      )
    } else {
      return (
        <div className={styles.widget}>
          <H3>There are no workflow configuration errors in your projects!</H3>
        </div>
      )
    };
  }

  renderWorkflows(project) {
    var wfs = Object.entries(project.wfs).sort((a, b) => {
      if (this.wfTitle(a[1]) > this.wfTitle(b[1])) return 1;
      if (this.wfTitle(a[1]) < this.wfTitle(b[1])) return -1;
      return 0;
    });
    return (
      <div className={styles.widget}>
        {wfs.map(entry => (
          <div className={styles.widget} key={entry[0]}>
            <H3>{this.wfTitle(entry[1])}</H3>
            {this.renderProblems(entry[1])}
          </div>
        ))}
      </div>
    )
  }

  renderProblems(wf) {
    if (wf.loading) {
      return (
        <div className={styles.widget}>
          <Text info>Loading...</Text>
        </div>
      )
    } else {
      var problems = Object.entries(wf.problems).sort((a, b) => {
        if (a[1] > b[1]) return 1;
        if (a[1] < b[1]) return -1;
        return 0;
      });
      return (
        <div className={styles.widget}>
          <ul>
            {problems.map(entry => (
              <li key={entry[0]}><Text>{entry[1]}</Text></li>
            ))}
          </ul>
        </div>
      )
    }
  }

  wfTitle(project) {
    return project.title ? project.title : project.name;
  }

  projectSettingsUrl(yt, projectId) {
    return yt.url + '/admin/editProject/' +
      yt.brokenProjects[projectId].ringId + '?tab=workflow';
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
