import React, { PureComponent, Fragment } from 'react'
import { Query, Mutation } from 'react-apollo'

import {
  buttonFlatClass,
  buttonClass,
  spinner,
  ErrorButton
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
            if (error && this.state.showError) return ErrorButton({
              onClick: () => { this.setState({ showError: false }) },
              children: 'Oops something went wrong!'
            })
            if (loading) return <span className="m1">{spinner}</span>
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
                        {d => (
                          <Query
                            query={GET_USER_DETAIL}
                            variables={{ id: book.rid }}
                          >
                            {({ data: { getUserDetail }, loading: loading2, error: error2 }) => {
                              if (error2 && this.state.showError) return ErrorButton({
                                onClick: () => { this.setState({ showError: false }) },
                                children: 'Oops something went wrong!'
                              })
                              if (loading2) return <span className="m1">{spinner}</span>

                              const base = (
                                <Fragment>
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
                                </Fragment>
                              )

                              const status = book.status !== null
                                ? <div className="my-auto">You {book.status ? 'accepted' : 'declined'} this trade</div>
                                : (
                                  <Fragment>
                                    <Mutation
                                      mutation={TRADE_BOOK}
                                      refetchQueries={() => [
                                        { query: GET_REQS, variables: { id: user.id } },
                                        { query: GET_BOOKS }, // not very efficient, but needed for now
                                        { query: GET_BOOKS, variables: { uid: user.id } }
                                      ]}
                                    >
                                      {(mutate, { loading: loading3, error: error3 }) => {
                                        if (error3 && this.state.showError) return ErrorButton({
                                          onClick: () => { this.setState({ showError: false }) },
                                          children: 'Oops something went wrong!'
                                        })
                                        if (loading3) return <span className="m1">{spinner}</span>
                                        const variables = { token: user.token, bid: book.bid, rid: book.rid }
                                        const className = buttonClass + ' mx1 '
                                        return (
                                          <Fragment>
                                            <button
                                              className={className}
                                              type="button"
                                              onClick={() => {
                                                variables.type = 'accept'
                                                mutate({ variables })
                                              }}
                                            >
                                              Accept
                                            </button>
                                            <button
                                              className={className + ' border-red '}
                                              type="button"
                                              onClick={() => {
                                                variables.type = 'decline'
                                                mutate({ variables })
                                              }}
                                            >
                                              Decline
                                            </button>
                                          </Fragment>
                                        )
                                      }}
                                    </Mutation>
                                  </Fragment>
                                )
                              return (
                                <div className="flex m1 my2">
                                  {base}
                                  {status}
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
