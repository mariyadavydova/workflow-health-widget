import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Link from '@jetbrains/ring-ui/components/link/link';
import Island, {Header, Content as IslandContent} from '@jetbrains/ring-ui/components/island/island';
import LoaderInline from '@jetbrains/ring-ui/components/loader-inline/loader-inline';
import Text from '@jetbrains/ring-ui/components/text/text';
import EmptyWidget, {EmptyWidgetFaces} from '@jetbrains/hub-widget-ui/dist/empty-widget';
import {
  SuccessIcon
} from '@jetbrains/ring-ui/components/icon';

import 'file-loader?name=[name].[ext]!../../manifest.json'; // eslint-disable-line import/no-unresolved
import styles from './app.css';

export default class Content extends Component {

  static SortByNameComparator = (a, b) => {
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    if (aName > bName) {
      return 1;
    }
    if (aName < bName) {
      return -1;
    }
    return 0;
  };

  static propTypes = {
    brokenProjects: PropTypes.array,
    hasPermission: PropTypes.bool,
    isLoading: PropTypes.bool,
    homeUrl: PropTypes.string.isRequired,
    onRemove: PropTypes.func.isRequired
  };

  //-----RENDERING-DATA-----//

  renderNoPermissionsMessage() {
    return (
      <EmptyWidget
        face={EmptyWidgetFaces.OK}
        message={'You have no project admin permissions'}
      >
        <Link
          pseudo
          onClick={this.props.onRemove}
        >
          {'Remove widget'}
        </Link>
      </EmptyWidget>
    );
  }

  renderListOfProjects(projects) {
    return (
      <div>
        {projects.map(project => (
          <div className={styles.widget} key={`project-${project.id}`}>
            <Island className={styles['red-island']}>
              <Header border className={styles['red-island-header']}>
                <Link
                  pseudo={false}
                  target={'_top'}
                  href={this.projectSettingsUrl(project.ringId)}
                >
                  {project.name}
                </Link>
              </Header>
              <IslandContent
                className={styles['red-island-body']}
                fade={false}
              >
                {this.renderWorkflows(project)}
              </IslandContent>
            </Island>
          </div>
        ))}
      </div>
    );
  }

  renderSuccessMessage() {
    return (
      <EmptyWidget
        face={EmptyWidgetFaces.HAPPY}
        message={'Workflows are fine!'}
      >
        <SuccessIcon
          color={SuccessIcon.Color.GREEN}
          size={SuccessIcon.Size.Size14}
        />
      </EmptyWidget>
    );
  }

  renderWorkflows(project) {
    const workflows = Object.keys(project.wfs).
      map(key => project.wfs[key]).
      sort((a, b) => {
        if (this.wfTitle(a) > this.wfTitle(b)) {
          return 1;
        }
        if (this.wfTitle(a) < this.wfTitle(b)) {
          return -1;
        }
        return 0;
      });

    return (
      <div>
        {workflows.map(workflow => (
          <div className={styles.widget} key={`workflow-${workflow.id}`}>
            <p className={styles['wf-name']}>{this.wfTitle(workflow)}</p>
            {this.renderProblems(workflow)}
          </div>
        ))}
      </div>
    );
  }

  renderProblems(wf) {
    if (wf.loading) {
      return (
        <div className={styles.widget}>
          <Text className={styles['message-s']}>
            {'Loading...'}
          </Text>
        </div>
      );
    }

    const problems = Object.entries(wf.problems).sort((a, b) => {
      if (a[1] > b[1]) {
        return 1;
      }
      if (a[1] < b[1]) {
        return -1;
      }
      return 0;
    });

    return (
      <div>
        <ul className={styles['error-list']}>
          {problems.map(entry => (
            <li key={entry[0]}>
              <Text>{entry[1]}</Text>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  wfTitle(project) {
    return project.title ? project.title : project.name;
  }

  projectSettingsUrl(projectRingId) {
    return `${this.props.homeUrl}/admin/editProject/${projectRingId}?tab=workflow`;
  }

  render() {
    const {
      isLoading, hasPermission, brokenProjects
    } = this.props;

    if (isLoading) {
      return (<LoaderInline/>);
    }
    if (!hasPermission) {
      return this.renderNoPermissionsMessage();
    }
    if (brokenProjects && brokenProjects.length) {
      return this.renderListOfProjects(
        brokenProjects.sort(Content.SortByNameComparator)
      );
    }
    return this.renderSuccessMessage();
  }
}
