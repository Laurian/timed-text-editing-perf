import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import Home from './Home';
import SimplePlayer from './player/SimplePlayer';
import SimplePlayerLightDOM from './player/SimplePlayerLightDOM';

import reportWebVitals from './reportWebVitals';

import './index.css';

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <Switch>
        <Route path="/SimplePlayerLightDOM/:id">
          <SimplePlayerLightDOM />
        </Route>
        <Route path="/SimplePlayer/:id">
          <SimplePlayer />
        </Route>
        <Route path="/">
          <Home />
        </Route>
      </Switch>
    </Router>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);
