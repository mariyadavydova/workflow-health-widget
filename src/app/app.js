import DashboardAddons from 'hub-dashboard-addons';
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Select from '@jetbrains/ring-ui/components/select/select';
import Panel from '@jetbrains/ring-ui/components/panel/panel';
import Button from '@jetbrains/ring-ui/components/button/button';
import EmptyWidget, {EmptyWidgetFaces} from '@jetbrains/hub-widget-ui/dist/empty-widget';

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
                  map(us => ({name: us.project.name, id: us.project.id}));
              projects.forEach(p => {
                if (!brokenProjects[p.id]) {
                  brokenProjects[p.id] = p;
                }
              });
            }
          }
        });
        yt.brokenProjects = brokenProjects;
        this.setState({data: data});
      });
    });
  }

  renderProjects(yt) {
    if (yt.brokenProjects) {
      return (
        <div>
          {Object.keys(yt.brokenProjects).map(key => (
            <h4 key={key}>{yt.brokenProjects[key].name}</h4>
          ))}
        </div>
      )
    } else {
      return (
        <p>OK!</p>
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
          <h1>Loading...</h1>
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
