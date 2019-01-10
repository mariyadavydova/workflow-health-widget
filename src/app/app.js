import DashboardAddons from 'hub-dashboard-addons';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {render} from 'react-dom';

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
        brokenProjects: {
          <project.id>: {
            name: <project.name>,
            ringId: <project.ringId>,
            wfs: {
              <wf.name>: {
                title: <wf.title>,
                loading: <true/false>,
                problems: [<problem.message>]
              },
              <wf.name>: ...
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
    this.props.dashboardApi.loadServices('YouTrack').then(youtracks => {
      var services = [];
      youtracks.forEach(yt => {
        if (yt.homeUrl) {
          services[yt.id] = {
            name: yt.name,
            url: yt.homeUrl,
            loading: true
          };
        }
      });
      this.setState({data: services});
      this.loadWorkflows();
    });
  }

  loadWorkflows() {
    var {data} = this.state;
    const fields = 'id,name,title,usages(project(id,ringId,name),isBroken)';
    const url = 'api/admin/workflows?$top=-1&fields=' + fields;
    Object.keys(data).forEach(key => {
      this.props.dashboardApi.fetch(key, url).then(workflows => {
        var brokenProjects = {};
        workflows.forEach(wf => {
          if (wf.usages.length) {
            if (wf.usages.find(us => us.isBroken)) {
              var projects = wf.usages.filter(us => us.isBroken).
                  map(us => ({
                    name: us.project.name,
                    id: us.project.id,
                    wfs: {}
                  }));
              projects.forEach(p => {
                if (!brokenProjects[p.id]) {
                  brokenProjects[p.id] = p;
                }
                brokenProjects[p.id].wfs[wf.name] = {
                  title: wf.title,
                  loading: true,
                  problems: []
                };
              });
            }
          }
        });
        data[key].brokenProjects = brokenProjects;
        data[key].loading = false;
        this.setState({data: data});
      });
    });
  }

  //-----RENDERING-DATA-----//

  renderProblems(wf) {
    if (wf.loading) {
      return (
        <p>Loading...</p>
      )
    } else {
      return (
        <div className={styles.widget}>
          {wf.problems.map(problem => (
            <p>{problem.message}</p>
          ))}
        </div>
      )
    }
  }

  renderWorkflows(project) {
    return (
      <div className={styles.widget}>
        {Object.keys(project.wfs).map(key => (
          <div className={styles.widget} key={key}>
            <h5 key={key}>{project.wfs[key].title}</h5>
            {this.renderProblems(project.wfs[key])}
          </div>
        ))}
      </div>
    )
  }

  renderProjects(yt) {
    if (yt.brokenProjects) {
      return (
        <div className={styles.widget}>
          {Object.keys(yt.brokenProjects).map(key => (
            <div className={styles.widget} key={key}>
              <h4>{yt.brokenProjects[key].name}</h4>
              {this.renderWorkflows(yt.brokenProjects[key])}
            </div>
          ))}
        </div>
      )
    } else if (yt.loading) {
      return (
        <h4>Loading...</h4>
      )
    } else {
      return (
        <h3>Horizon is clear!</h3>
      )
    };
  }

  render() {
    const {data} = this.state;

    if (data) {
      return (
        <div className={styles.widget}>
          {Object.keys(data).map(key => (
            <div className={styles.widget} key={key}>
              <h3>{data[key].name} ({data[key].url})</h3>
              {this.renderProjects(data[key])}
            </div>
          ))}
        </div>
      );
    } else {
      return (
        <div className={styles.widget}>
          <h3>Loading...</h3>
        </div>
      );
    }
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
