import React, { PureComponent, Fragment } from 'react'
import { withRouter } from 'react-router'
import PropTypes from 'prop-types'
import { Query, Mutation } from 'react-apollo'
import { Link } from 'react-router-dom'

import { userPropTypes } from './User'
import { css } from 'emotion'

import client, {
  ADD_BOOK,
  LOCAL_USER,
  GET_BOOKS,
  GET_REQS_BY_BOOK,
  DEL_BOOK,
  TRADE_BOOK,
  SEARCH_GOOGLE_BOOK,
  VIEW_GOOGLE_BOOK,
  GET_REQS
} from '~/client/apolloClient'

import {
  buttonClass,
  buttonFlatClass,
  inputClass,
  spinner,
  EL,
} from './common'

const font = { fontFamily: 'fontello' }

export default class HomeBook extends PureComponent {
  static propTypes = userPropTypes
  state = {
    selectedBook: {},
    selectedBid: null,
    selectedUid: null,
    showError: true,
  }
  viewMore(selectedBook, selectedBid, selectedUid) {
    this.setState({ selectedBook, selectedBid, selectedUid })
  }
  render() {
    const { selectedBook, selectedBid, selectedUid } = this.state
    return (
      <div className="flex flex-column mx-auto">
        <h3>Books for trade</h3>
        <div className="m2 flex flex-wrap">
          <Query
            query={GET_BOOKS}
            // fetchPolicy="network-only"
          >
            {({ loading, error, data }) => {
              if (loading || (error && this.state.showError)) return (
                <EL
                  error={error}
                  loading={loading}
                  showError={this.state.showError}
                  onClick={() => { this.setState({ showError: false }) }}
                />
              )
              return (data.getBooks || []).map(({ id, gid, bid, uid }) => {
                return (
                  <GBook
                    key={id}
                    gid={gid}
                    selectCB={book => {
                      this.viewMore(book, bid, uid)
                    }}
                  />
                )
              })
            }}
          </Query>
          {selectedBook.id && (
            <Book
              book={selectedBook}
              close={() => { this.setState({ selectedBook: {} }) }}
              renderItems={() => {
                if (!this.props.user) return (
                  <div className="m1 center">
                    To request this book, please <Link className="decoration-none bold" to="/login">login</Link>
                  </div>
                )
                const { user } = this.props
                const isOwner = user.id === selectedUid
                if (isOwner) return <div className="m1 center">You own this book 😃</div>
                return (
                  <Query
                    query={GET_REQS_BY_BOOK}
                    variables={{ bid: selectedBid }}
                  >
                    {({ error: error2, loading: loading2, data: data2 }) => {
                      if (loading2 || (error2 && this.state.showError)) return (
                        <EL
                          error={error2}
                          loading={loading2}
                          showError={this.state.showError}
                          onClick={() => { this.setState({ showError: false }) }}
                        />
                      )
                      const nRequest = (data2.getReqsByBook || []).length
                      const userRequested = nRequest > 0 && data2.getReqsByBook.find(el => el.rid === user.id)
                      return (
                        <Fragment>
                          <div className="m1">
                            {nRequest > 0 && nRequest + (nRequest === 1 ? ' person is' : ' people are') + ' requesting this book'}
                          </div>
                          {userRequested ? (
                            <div className="m1">You requested this book on {new Date(userRequested.ts * 1000).toDateString()} {new Date(userRequested.ts * 1000).toLocaleTimeString()} 😃</div>
                          ) : (
                            <Mutation
                              mutation={TRADE_BOOK}
                              variables={{ token: user.token, type: 'request', bid: selectedBid, rid: user.id }}
                              update={proxyCache => {
                                const q = { query: GET_REQS_BY_BOOK, variables: { bid: selectedBid } }
                                q.data = {
                                  getReqsByBook: [].concat(proxyCache.readQuery(q).getReqsByBook, {
                                    __typename: 'BookUser',
                                    id: -1,
                                    bid: selectedBid,
                                    uid: selectedUid,
                                    rid: user.id,
                                    status: null,
                                    ts: Date.now() / 1000
                                  })
                                }
                                proxyCache.writeQuery(q)
                                this.setState({ selectedBook: {} })
                              }}
                              refetchQueries={() => [{ query: GET_REQS, variables: { id: user.id }, fetchPolicy: 'network-only' }]}
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
                                return (
                                  <button
                                    className={buttonClass + ' m2 self-center'}
                                    onClick={() => {
                                      mutate()
                                      this.setState({ showError: true })
                                    }}
                                    type="submit"
                                  >
                                    <b>Request</b>
                                  </button>
                                )
                              }}
                            </Mutation>
                          )}
                        </Fragment>
                      )
                    }}
                  </Query>
                )
              }}
            />
          )}
        </div>
      </div>
    )
  }
}
export class AddBook extends PureComponent {
  static propTypes = userPropTypes
  constructor(props) {
    super(props)
    const { id: uid } = this.props.user
    // this query is important so can later use client.readQuery
    client.query({ query: GET_BOOKS, variables: { uid } })
  }
  state = {
    data: [],
    loading: false,
    error: null,
    q: '', // query term
    selectedBook: {},
    showError: true
  }
  onChage = e => {
    this.setState({ q: e.currentTarget.value })
  }
  onKeyUp = e => {
    if (e.key !== 'Enter') return
    this.search()
  }
  search = () => {
    if (this.state.loading) return
    const q = encodeURIComponent(this.state.q.trim())
    if (!q) return
    client.query({
      query: SEARCH_GOOGLE_BOOK,
      variables: { q }
    }).then(({ data }) => {
      this.setState({ loading: false, data: data.searchGoogleBook })
    }).catch(error => {
      this.setState({ error, showError: true, loading: false })
    })
    this.setState({ loading: true })
  }
  viewMore(selectedBook) {
    this.setState({ selectedBook })
  }
  refInput = React.createRef()
  render() {
    const { q, data, loading, error, selectedBook } = this.state
    return (
      <div className="flex flex-column mx-auto">
        <h3>Add a book</h3>
        <div className="flex">
          <input
            className={inputClass + 'flex-auto'}
            type="text"
            ref={this.refInput}
            onChange={this.onChage}
            value={q}
            onKeyUp={this.onKeyUp}
          />
          {loading ? <span className="m1">{spinner}</span> : (
            <input
              className={buttonFlatClass + 'm1'}
              style={font}
              type="submit"
              value="&#xe802;"
              onClick={this.search}
              disabled={!q.trim()}
            />
          )}
        </div>
        {error && this.state.showError && (
          <EL
            error={error}
            showError={this.state.showError}
            onClick={() => { this.setState({ showError: false }) }}
          />
        )}
        <div className="m2 flex flex-wrap">
          {data.map(d => (
            <BookThumb
              key={d.id}
              data={d}
              onClick={() => { this.viewMore(d) }}
            />
          ))}
        </div>
        {selectedBook.id && (
          <Book
            book={selectedBook}
            close={() => { this.setState({ selectedBook: {} }) }}
            renderItems={() => <AddToMyBook book={selectedBook} />}
          />
        )}
      </div>
    )
  }
}


const thumbClass = 'm1 p1 flex justify-center items-center border border-silver pointer outline-none ' + css({
  width: '9rem',
  height: '12rem',
  transition: 'opacity 0.3s ease',
  ':hover': {
    opacity: 0.5
  }
})
function BookThumb({ data, onClick }) {
  return (
    <div
      className={thumbClass}
      key={data.id}
      role="button"
      tabIndex="0"
      onClick={onClick}
      onKeyPress={() => {}}
    >
      <img
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        src={data.smallThumbnail}
        alt=""
      />
    </div>
  )
}
BookThumb.propTypes = {
  data: PropTypes.object, // eslint-disable-line
  onClick: PropTypes.func,
}

export class Book extends PureComponent {
  static propTypes = {
    book: PropTypes.object, // eslint-disable-line
    close: PropTypes.func,
    renderItems: PropTypes.func, // to render more items underneath the thumb
  }
  render() {
    const {
      title,
      authors, // [text]
      publisher,
      publishedDate, // yyyy-mm-dd
      description,
      pageCount, // num
      categories, // [text]
      previewLink,
      smallThumbnail
    } = this.props.book
    return (
      <div
        className={'my3 mx-auto p2 fixed flex items-start bg-white border rounded border-silver ' + css({ overflowY: 'auto' })}
        style={{ top: 0, right: 0, bottom: 0, left: 0, maxWidth: '60rem' }}
      >
        <div className="flex flex-column mr1" style={{ width: '8rem' }}>
          <img src={smallThumbnail} alt="" />
          {this.props.renderItems && this.props.renderItems(this.props, this.state)}
        </div>
        <div className="m1 flex-auto">
          <h3 className="mt0">{title}</h3>
          <h4 className="italic"><small>by </small>{authors.join(', ')}</h4>
          <p>{description}</p>
          <h4>
            <small>Categories</small>
            <br />
            {categories.join(', ')}
          </h4>
          <h4>
            <small>Publisher</small>
            <br />
            {publisher}
          </h4>
          <h4>
            <small>Published</small>
            <br />
            {publishedDate}
          </h4>
          <h4>
            <small>Pages</small>
            <br />
            {pageCount}
          </h4>
          <a className="decoration-none" href={previewLink} target="_blank" rel="noopener noreferrer">Preview</a>
        </div>
        <button
          className={buttonFlatClass}
          style={font}
          onClick={() => { this.props.close() }}
          type="button"
        >
          &#xe807;
        </button>
      </div>
    )
  }
}

const AddToMyBook = withRouter(class AddToMyBook extends PureComponent {
  static propTypes = {
    book: PropTypes.object, // eslint-disable-line
    history: PropTypes.object, // eslint-disable-line
  }
  state = {
    showError: false
  }
  render() {
    return (
      <Mutation
        mutation={ADD_BOOK}
        update={(proxyCache, { data: { addBook } }) => {
          addBook.gid = this.props.book.id

          const q = { query: GET_BOOKS }

          q.data = { getBooks: [].concat(addBook, proxyCache.readQuery(q).getBooks) }
          proxyCache.writeQuery(q)

          q.variables = { uid: proxyCache.readQuery({ query: LOCAL_USER }).localUser.id }
          q.data = { getBooks: [].concat(addBook, proxyCache.readQuery(q).getBooks) }
          proxyCache.writeQuery(q)

          const q2 = {
            query: GET_REQS,
            variables: proxyCache.readQuery({ query: LOCAL_USER }).localUser,
            data: {
              getReqs: {
                reqsByUser: [],
                userReqs: [],
                __typename: 'BookReq'
              }
            }
          }

          proxyCache.writeQuery(q2)
        }}
      >
        {(mutate, { loading, error }) => {
          if (error && this.state.showError) return (
            <EL
              error={error}
              showError={this.state.showError}
              onClick={() => { this.setState({ showError: false }) }}
            />
          )
          if (loading) return <span className="m2 self-center">{spinner}</span>
          return (
            <button
              className={buttonClass + ' m2 self-center'}
              onClick={() => {
                const { token } = client.readQuery({ query: LOCAL_USER }).localUser
                mutate({ variables: { token, gid: this.props.book.id } })
                  .then(() => {
                    this.props.history.push('/myBook')
                  })
              }}
              type="submit"
            >
              <b>Add</b>
            </button>
          )
        }}
      </Mutation>
    )
  }
})

export class MyBook extends PureComponent {
  state = {
    selectedBook: {},
    selectedBid: null,
    selectedId: null,
    showError: true,
  }
  viewMore(selectedBook, selectedId, selectedBid) {
    this.setState({ selectedBook, selectedId, selectedBid })
  }
  render() {
    const { selectedBook } = this.state
    return (
      <div className="flex flex-column mx-auto">
        <h3>My books</h3>
        <div className="m2 flex flex-wrap">
          <Query
            query={GET_BOOKS}
            variables={{ uid: client.readQuery({ query: LOCAL_USER }).localUser.id }}
            // fetchPolicy="network-only"
          >
            {({ loading, error, data }) => {
              if (loading || (error && this.state.showError)) return (
                <EL
                  error={error}
                  loading={loading}
                  showError={this.state.showError}
                  onClick={() => { this.setState({ showError: false }) }}
                />
              )
              return (data.getBooks || []).map(({ id, gid, bid }) => {
                return (
                  <GBook
                    key={id}
                    gid={gid}
                    selectCB={book => {
                      this.viewMore(book, id, bid)
                    }}
                  />
                )
              })
            }}
          </Query>
          {selectedBook.id && (
            <Book
              book={selectedBook}
              close={() => { this.setState({ selectedBook: {} }) }}
              renderItems={() => (
                <Mutation
                  mutation={DEL_BOOK}
                  update={proxyCache => {
                    const { selectedId: id } = this.state

                    const q = { query: GET_BOOKS, data: {} }
                    q.data.getBooks = proxyCache.readQuery(q).getBooks.filter(b => b.id !== id)
                    proxyCache.writeQuery(q)

                    q.variables = { uid: client.readQuery({ query: LOCAL_USER }).localUser.id }
                    q.data.getBooks = proxyCache.readQuery(q).getBooks.filter(b => b.id !== id)
                    proxyCache.writeQuery(q)

                    this.setState({ selectedBook: {} })
                  }}
                >
                  {(mutate, { loading, error }) => {
                    if (error && this.state.showError) return (
                      <EL
                        error={error}
                        showError={this.state.showError}
                        onClick={() => { this.setState({ showError: false }) }}
                      />
                    )
                    if (loading) return <span className="m2 self-center">{spinner}</span>
                    return (
                      <button
                        className={buttonClass + ' m2 self-center'}
                        onClick={() => {
                          const { token } = client.readQuery({ query: LOCAL_USER }).localUser
                          mutate({ variables: { token, bid: this.state.selectedBid } })
                        }}
                        type="submit"
                      >
                        <b>DELETE</b>
                      </button>
                    )
                  }}
                </Mutation>
              )}
            />
          )}
        </div>
      </div>
    )
  }
}

export class GBook extends PureComponent {
  static propTypes = {
    gid: PropTypes.string.isRequired,
    selectCB: PropTypes.func,
    render: PropTypes.func,
    children: PropTypes.func,
  }
  state = {
    showError: true,
  }
  render() {
    return (
      <Query
        query={VIEW_GOOGLE_BOOK}
        variables={{ id: this.props.gid }}
      >
        {({ data, loading, error }) => {
          if (error && this.state.showError) return (
            <div className={thumbClass}>
              <EL
                error={error}
                showError={this.state.showError}
                onClick={() => { this.setState({ showError: false }) }}
              />
            </div>
          )
          const { render, children, selectCB } = this.props
          const child = children || render // children take precedence
          if (loading) return <div className={child ? '' : thumbClass}>{spinner}</div>
          return child ? child(data.viewGoogleBook) : <BookThumb data={data.viewGoogleBook} onClick={() => { selectCB(data.viewGoogleBook) }} />
        }}
      </Query>
    )
  }
}
