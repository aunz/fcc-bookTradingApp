import React, { Component, PureComponent, Fragment } from 'react'
import PropTypes from 'prop-types'
import { Switch, Route, Redirect, withRouter } from 'react-router'
import { Query, Mutation } from 'react-apollo'
import { Link } from 'react-router-dom'
import { css } from 'emotion'

import { userPropTypes } from './User'

import client, {
  // ADD_BOOK,
  // LOCAL_USER,
  // GET_BOOKS,
  // GET_REQS_BY_BOOK,
  // DEL_BOOK,
  // TRADE_BOOK,
  // SEARCH_GOOGLE_BOOK,
  // VIEW_GOOGLE_BOOK
  GET_REQS
} from '~/client/apolloClient'

import {
  // buttonClass,
  // buttonFlatClass,
  // inputClass,
  spinner,
  ErrorButton,
} from './common'


export default class MyRequest extends PureComponent {
  static propTypes = userPropTypes
  state = {
    showError: true
  }
  render() {
    return (
      <div className="flex flex-column mx-auto">
        <h3>My requests</h3>
        <Query
          query={GET_REQS}
          variables={{ id: this.props.user.id }}
        >
          {({ data: { getReqsByUser, getUserReqs } , loading, error }) => {
            if (error && this.state.showError) return ErrorButton({
              onClick: () => { this.setState({ showError: false }) },
              children: 'Oops something went wrong!'
            })
            if (loading) return <span className="m1">{spinner}</span>
            console.log(getReqsByUser, getUserReqs)
            return null
          }}
        </Query>
      </div>
    )
  }
}

