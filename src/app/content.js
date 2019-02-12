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

  static getName = entity =>
    (typeof entity === 'object'
      ? (entity.title || entity.name || '')
      : (entity || ''));

  static sortByNameComparator = (a, b) => {
    const aName = Content.getName(a).toLowerCase();
    const bName = Content.getName(b).toLowerCase();
    if (aName > bName) {
      return 1;
    }
    if (aName < bName) {
      return -1;
    }
    return 0;
  };

  static getProjectsSortedModel = projects => {
    return (projects || []).sort(Content.sortByNameComparator).
      map(withSortedWorkflows);

    function withSortedWorkflows(project) {
      return Object.assign({}, project, {
        workflows: Object.keys(project.wfs).
          map(key => project.wfs[key]).
          map(withSortedProblems).
          sort(Content.sortByNameComparator)
      });
    }

    function withSortedProblems(workflow) {
      return Object.assign({}, workflow, {
        problems: (workflow.problems || []).
          sort(Content.sortByNameComparator)
      });
    }
  };

  static propTypes = {
    brokenProjects: PropTypes.array,
    hasPermission: PropTypes.bool,
    isLoading: PropTypes.bool,
    homeUrl: PropTypes.string.isRequired,
    onRemove: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {projects: []};
  }

  static getDerivedStateFromProps(props) {
    return {
      projects: Content.getProjectsSortedModel(
        props.brokenProjects
      )
    };
  }

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

  renderProject(project) {
    return (
      <div key={`project-${project.id}`}>
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
            {this.renderWorkflows(project.workflows)}
          </IslandContent>
        </Island>
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

  renderWorkflows(workflows) {
    return (
      <div>
        {workflows.map(workflow => (
          <div className={styles.widget} key={`workflow-${workflow.id}`}>
            <p className={styles['wf-name']}>{Content.getName(workflow)}</p>
            {this.renderProblems(workflow)}
          </div>
        ))}
      </div>
    );
  }

  renderProblems(workflow) {
    if (workflow.loading) {
      return (
        <Text className={styles['message-s']}>
          {'Loading...'}
        </Text>
      );
    }

    return (
      <div>
        <ul className={styles['error-list']}>
          {workflow.problems.map(problem => (
            <li key={`problem-${problem.id}`}>
              <Text>{problem.message}</Text>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  projectSettingsUrl(projectRingId) {
    return `${this.props.homeUrl}/admin/editProject/${projectRingId}?tab=workflow`;
  }

  render() {
    const {isLoading, hasPermission} = this.props;
    const {projects} = this.state;

    if (isLoading) {
      return (<LoaderInline/>);
    }
    if (!hasPermission) {
      return this.renderNoPermissionsMessage();
    }
    if (projects && projects.length) {
      return (
        <div>
          {projects.map(
            project => this.renderProject(project)
          )}
        </div>
      );
    }
    return this.renderSuccessMessage();
  }
}
