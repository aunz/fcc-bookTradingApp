import React, { Component, PureComponent, Fragment } from 'react'
import PropTypes from 'prop-types'
import { Switch, Route, Redirect, withRouter } from 'react-router'
import { Query, Mutation } from 'react-apollo'
import { Link } from 'react-router-dom'
import { css } from 'emotion'

import {
  buttonFlatClass,
  buttonClass,
  spinner,
  ErrorButton
} from './common'

import { userPropTypes } from './User'

import { GBook, Book } from './AddBook'

import client, {
  // ADD_BOOK,
  // LOCAL_USER,
  // GET_BOOKS,
  // GET_REQS_BY_BOOK,
  // DEL_BOOK,
  // TRADE_BOOK,
  // SEARCH_GOOGLE_BOOK,
  // VIEW_GOOGLE_BOOK
  GET_REQS,
  GET_USER_DETAIL,
  TRADE_BOOK,
} from '~/client/apolloClient'

export default class MyRequest extends PureComponent {
  static propTypes = userPropTypes
  state = {
    selectedBook: {},
    showError: true
  }
  render() {
    const { selectedBook } = this.state
    console.log(selectedBook)
    return (
      <div className="flex flex-column mx-auto">
        <h3>My requests</h3>
        <Query
          query={GET_REQS}
          variables={{ id: this.props.user.id }}
        >
          {({ data: { getReqs: { reqsByUser, userReqs } = {} }, loading, error }) => {
            if (error && this.state.showError) return ErrorButton({
              onClick: () => { this.setState({ showError: false }) },
              children: 'Oops something went wrong!'
            })
            if (loading) return <span className="m1">{spinner}</span>
            return (
              <Fragment>
                <div>
                  <h4>Books you requested</h4>
                  {reqsByUser.map(book => {
                    return (
                      <GBook
                        key={book.id}
                        gid={book.gid}
                      >
                        {d => (
                          <div className="flex m1 my2">
                            <button
                              className={buttonFlatClass + ' flex justify-center'}
                              style={{ width: '3rem' }}
                              type="button"
                              onClick={() => { this.setState({ selectedBook: d }) }}
                            >
                              <img
                                style={{ maxWidth: '3rem', maxHeight: '3rem' }}
                                src={d.smallThumbnail}
                                alt=""
                              />
                            </button>
                            <div className="flex flex-column">
                              <span>{d.title}</span>
                              <small className="silver my-auto">Requested on {new Date(book.ts * 1000).toDateString()}</small>
                            </div>
                          </div>
                        )}
                      </GBook>
                    )
                  })}
                </div>
                <div>
                  <h4>Books other people requested from you</h4>
                  {userReqs.map(book => {
                    return (
                      <GBook
                        key={book.id}
                        gid={book.gid}
                      >
                        {d => (
                          <Query
                            query={GET_USER_DETAIL}
                            variables={{ id: book.uid }}
                          >
                            {({ data: { getUserDetail }, loading: loading2, error: error2 }) => {
                              if (error2 && this.state.showError) return ErrorButton({
                                onClick: () => { this.setState({ showError: false }) },
                                children: 'Oops something went wrong!'
                              })
                              if (loading2) return <span className="m1">{spinner}</span>
                              return (
                                <div className="flex m1 my2">
                                  <button
                                    className={buttonFlatClass + ' flex justify-center'}
                                    style={{ width: '3rem' }}
                                    type="button"
                                    onClick={() => { this.setState({ selectedBook: d }) }}
                                  >
                                    <img
                                      style={{ maxWidth: '3rem', maxHeight: '3rem' }}
                                      src={d.smallThumbnail}
                                      alt=""
                                    />
                                  </button>
                                  <div className="flex flex-column mx1">
                                    <span>{d.title}</span>
                                    <small className="silver my-auto">Requested on {new Date(book.ts * 1000).toDateString()}</small>
                                  </div>
                                  <div
                                    className="flex flex-column mr1 px1 center "
                                    style={{ borderLeft: '1px solid silver', borderRight: '1px solid silver' }}
                                  >
                                    <span>Requested by</span>
                                    <span className="my-auto">{getUserDetail && getUserDetail.name}</span>
                                  </div>
                                  <Mutation
                                    mutation={TRADE_BOOK}
                                    variables={{
                                      type: 'accept',
                                      token: this.props.user.token,
                                      bid: book.bid,
                                      rid: book.rid,
                                    }}
                                  >
                                    {(mutate, { loading: loading3, error: error3 }) => {
                                      if (error3 && this.state.showError) return ErrorButton({
                                        onClick: () => { this.setState({ showError: false }) },
                                        children: 'Oops something went wrong!'
                                      })
                                      if (loading3) return <span className="m1">{spinner}</span>
                                      return (
                                        <button
                                          className={buttonClass + ' mr1'}
                                          type="button"
                                          onClick={() => {
                                            mutate()
                                          }}
                                        >
                                          Accept
                                        </button>
                                      )
                                    }}
                                  </Mutation>
                                </div>
                              )
                            }}
                          </Query>
                        )}
                      </GBook>
                    )
                  })}
                </div>
              </Fragment>
            )
          }}
        </Query>
        {selectedBook.id && (
          <Book
            book={selectedBook}
            close={() => { this.setState({ selectedBook: {} }) }}
            renderItems={() => null}
          />
        )}
      </div>
    )
  }
}
