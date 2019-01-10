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

  //-----LOADING-DATA-----//

  loadStatus() {
    this.props.dashboardApi.loadServices('YouTrack').then(youtracks => {
      var services = [];
      youtracks.forEach(yt => {
        if (yt.homeUrl) {
          services.push({
            id: yt.id,
            name: yt.name,
            url: yt.homeUrl,
            loading: true
          });
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
    data.forEach(yt => {
      this.props.dashboardApi.fetch(yt.id, url).then(workflows => {
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
                  problems: []
                };
              });
            }
          }
        });
        yt.brokenProjects = brokenProjects;
        yt.loading = false;
        this.setState({data: data});
      });
    });
  }

  //-----RENDERING-DATA-----//

  renderWorkflows(project) {
    return (
      <div>
        {Object.keys(project.wfs).map(key => (
          <h5 key={key}>{project.wfs[key].title}</h5>
        ))}
      </div>
    )
  }

  renderProjects(yt) {
    if (yt.brokenProjects) {
      return (
        <div>
          {Object.keys(yt.brokenProjects).map(key => (
            <div>
              <h4 key={key}>{yt.brokenProjects[key].name}</h4>
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
          {data.map(yt => (
            <div>
              <h3 key={yt.name}>{yt.name} ({yt.url})</h3>
              {this.renderProjects(yt)}
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
