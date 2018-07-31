import React, { PureComponent, Fragment } from 'react'
import PropTypes from 'prop-types'
import { Query, Mutation } from 'react-apollo'

import {
  buttonFlatClass,
  buttonClass,
  EL,
} from './common'

import { userPropTypes } from './User'

import { GBook, Book } from './AddBook'

import {
  GET_BOOKS,
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
    const { user } = this.props
    return (
      <div className="flex flex-column mx-auto">
        <h3>My requests</h3>
        <Query
          query={GET_REQS}
          variables={{ id: user.id }}
        >
          {({ data: { getReqs: { reqsByUser, userReqs } = {} }, loading, error }) => {
            if (loading || (error && this.state.showError)) return (
              <EL
                error={error}
                loading={loading}
                showError={this.state.showError}
                onClick={() => { this.setState({ showError: false }) }}
              />
            )
            return (
              <Fragment>
                <div>
                  <h4>Books you requested from other traders</h4>
                  {(userReqs || []).map(book => {
                    return (
                      <GBook
                        key={book.id}
                        gid={book.gid}
                      >
                        {gbook => (
                          <div className="flex m1 my2">
                            <button
                              className={buttonFlatClass + ' flex justify-center'}
                              style={{ width: '3rem' }}
                              type="button"
                              onClick={() => { this.setState({ selectedBook: gbook }) }}
                            >
                              <img
                                style={{ maxWidth: '3rem', maxHeight: '3rem' }}
                                src={gbook.smallThumbnail}
                                alt=""
                              />
                            </button>
                            <div className="flex flex-column">
                              <span>{gbook.title}</span>
                              <small className="silver my-auto">Requested on {new Date(book.ts * 1000).toDateString()}</small>
                            </div>
                            <div
                              className="flex flex-column mx1 px1 center "
                              style={{ borderLeft: '1px solid silver', borderRight: '1px solid silver' }}
                            >
                              <span>Status</span>
                              <span className="my-auto bold">{book.status === 0 ? 'Declined' : (book.status ? 'Received' : 'Waiting') }</span>
                            </div>
                          </div>
                        )}
                      </GBook>
                    )
                  })}
                </div>
                <div>
                  <h4>Books other traders requested from you</h4>
                  {(reqsByUser || []).map(book => {
                    return (
                      <GBook
                        key={book.id}
                        gid={book.gid}
                      >
                        {gbook => (
                          <TradingBook
                            book={book}
                            user={user}
                            gbook={gbook}
                            selectBook={b => { this.setState({ selectedBook: b }) }}
                          />
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


class TradingBook extends PureComponent {
  static propTypes = {
    // gbook contains google book info, it's an extension to book
    gbook: PropTypes.object, // eslint-disable-line
    book: PropTypes.object, // eslint-disable-line
    user: PropTypes.object, // eslint-disable-line
    selectBook: PropTypes.func,
  }
  state = {
    showError: true
  }
  render() {
    const { gbook, book, user } = this.props
    return (
      <Query
        query={GET_USER_DETAIL}
        variables={{ id: book.rid }}
      >
        {({ data: { getUserDetail }, loading, error }) => {
          if (loading || (error && this.state.showError)) return (
            <EL
              error={error}
              loading={loading}
              showError={this.state.showError}
              onClick={() => { this.setState({ showError: false }) }}
            />
          )

          const status = book.status === null
            ? <Trade user={user} book={book} />
            : <div className="my-auto">You {book.status ? 'accepted' : 'declined'} this trade</div>

          return (
            <div className="flex m1 my2">
              <button
                className={buttonFlatClass + ' flex justify-center'}
                style={{ width: '3rem' }}
                type="button"
                onClick={() => { this.props.selectBook(gbook) }}
              >
                <img
                  style={{ maxWidth: '3rem', maxHeight: '3rem' }}
                  src={gbook.smallThumbnail}
                  alt=""
                />
              </button>
              <div className="flex flex-column mx1">
                <span>{gbook.title}</span>
                <small className="silver my-auto">Requested on {new Date(book.ts * 1000).toDateString()}</small>
              </div>
              <div
                className="flex flex-column mx1 px1 center "
                style={{ borderLeft: '1px solid silver', borderRight: '1px solid silver' }}
              >
                <span>Requested by</span>
                <span className="my-auto">{getUserDetail && getUserDetail.name}</span>
              </div>
              {status}
            </div>
          )
        }}
      </Query>
    )
  }
}

class Trade extends PureComponent {
  static propTypes = {
    user: PropTypes.object, // eslint-disable-line
    book: PropTypes.object, // eslint-disable-line
  }
  state = {
    showError: true
  }
  render() {
    const { user, book } = this.props
    return (
      <Mutation
        mutation={TRADE_BOOK}
        refetchQueries={() => [
          { query: GET_REQS, variables: { id: user.id } },
          { query: GET_BOOKS }, // not very efficient, but needed for now
          { query: GET_BOOKS, variables: { uid: user.id } }
        ]}
      >
        {(mutate, { loading, error }) => {
          if (loading || (error && this.state.showError)) return (
            <EL
              error={error}
              loading={loading}
              showError={this.state.showError}
              onClick={() => { this.setState({ showError: false }) }}
            />
          )
          const button = (type, text) => (
            <button
              className={buttonClass + ' mx1 '}
              type="button"
              onClick={() => {
                const variables = { token: user.token, bid: book.bid, rid: book.rid, type }
                this.setState({ showError: true })
                mutate({ variables })
              }}
            >
              {text}
            </button>
          )
          return (
            <Fragment>
              {button('accept', 'Accept')}
              {button('decline', 'Decline')}
            </Fragment>
          )
        }}
      </Mutation>
    )
  }
}
