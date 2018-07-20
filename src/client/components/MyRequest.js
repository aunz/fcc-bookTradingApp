import React, { Component, PureComponent, Fragment } from 'react'
import PropTypes from 'prop-types'
import { Switch, Route, Redirect, withRouter } from 'react-router'
import { Query, Mutation } from 'react-apollo'
import { Link } from 'react-router-dom'
import { css } from 'emotion'

import { userPropTypes } from './User'

export default class MyRequest extends PureComponent {
  static propTypes = userPropTypes
  render() {
    const { name, email, loc } = this.props.user
    return (
      <div className="flex flex-column mx-auto">
        <h3>My requests</h3>
      </div>
    )
  }
}

