import React, { PureComponent, Fragment } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

export default class Header extends PureComponent {
  static propTypes = {
    loggedIn: PropTypes.bool
  }
  render() {
    const { loggedIn } = this.props
    const className = 'white decoration-none m1 '
    return (
      <div className="flex h3 bg-color1 white justify-center">
        <Link
          to="/"
          className={className + 'icon-home'}
        />
        <Link
          to={'/' + loggedIn ? 'user' : 'login'}
          className={className + 'icon-user'}
        />
        {loggedIn && (
          <Fragment>
            <Link to="/addBook" className={className + 'icon-plus'} />
            <Link to="/myBook" className={className + 'icon-book'} />
            <Link to="/myRequest" className={className + 'icon-comment'} />
          </Fragment>
        )}
      </div>
    )
  }
}
