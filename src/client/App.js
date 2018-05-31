import React, { Component, Fragment } from 'react'
import { Switch, Route } from 'react-router'
import { Link } from 'react-router-dom'

import './styles/index.css'

export default class App extends Component {
  render() {
    return (
      <Fragment>
        <Header />
        <div className="mx-auto" style={{ maxWidth: '40rem' }}>
        </div>
      </Fragment>
    )
  }
}
