import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Link from '@jetbrains/ring-ui/components/link/link';
import Island, {Header, Content as IslandContent} from '@jetbrains/ring-ui/components/island/island';
import Text from '@jetbrains/ring-ui/components/text/text';
import {
  CancelledIcon,
  SuccessIcon,
  ExceptionIcon
} from '@jetbrains/ring-ui/components/icon';

import 'file-loader?name=[name].[ext]!../../manifest.json'; // eslint-disable-line import/no-unresolved
import styles from './app.css';

export default class Content extends Component {

  static propTypes = {
    brokenProjects: PropTypes.array,
    hasPermission: PropTypes.bool,
    isLoading: PropTypes.bool,
    homeUrl: PropTypes.string.isRequired
  };

  //-----RENDERING-DATA-----//

  renderProjects() {
    const {hasPermission, brokenProjects} = this.props;

    if (!hasPermission) {
      return (
        <div>
          <div className={styles['centered-icon']}>
            <CancelledIcon
              className="ring-icon"
              color={CancelledIcon.Color.RED}
              size={CancelledIcon.Size.Size64}
            />
            <p className={styles['message-m']}>
              {'You have no project admin permissions.'}
            </p>
          </div>
        </div>
      );
    }

    if (brokenProjects && brokenProjects.length) {
      const projects = brokenProjects.sort((a, b) => {
        if (a.name > b.name) {
          return 1;
        }
        if (a.name < b.name) {
          return -1;
        }
        return 0;
      });

      return (
        <div>
          <div className={styles['centered-icon']}>
            <ExceptionIcon
              className="ring-icon"
              color={ExceptionIcon.Color.RED}
              size={ExceptionIcon.Size.Size64}
            />
          </div>
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

    return (
      <div className={styles['centered-icon']}>
        <SuccessIcon
          className="ring-icon"
          color={SuccessIcon.Color.GREEN}
          size={SuccessIcon.Size.Size64}
        />
      </div>
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
    const {isLoading} = this.props;

    if (isLoading) {
      return (
        <div className={styles.widget}>
          <p className={styles['message-l']}>
            {'Loading...'}
          </p>
        </div>
      );
    }

    return (
      <div className={styles.widget}>
        {this.renderProjects()}
      </div>
    );
  }
}
