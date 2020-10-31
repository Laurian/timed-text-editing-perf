import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import samples from './data/samples';

import './Home.css';

const Home = () => {
  const [liteDOM, setLiteDOM] = useState(true);
  const [contentVis, setContentVis] = useState(true);
  const [genSC, setGenSC] = useState(true);

  return (
    <div className="home">
      <h3>Simple Player</h3>
      <fieldset>
        <legend>Options</legend>
        <label>
          <input type="checkbox" checked={liteDOM} onChange={({ target: { checked } }) => setLiteDOM(checked)} />
          render ligher DOM off-screen
        </label>
        <label>
          <input type="checkbox" checked={contentVis} onChange={({ target: { checked } }) => setContentVis(checked)} />
          use <code>content-visibility: auto;</code>
        </label>
        <label>
          <input type="checkbox" checked={genSC} onChange={({ target: { checked } }) => setGenSC(checked)} />
          use general sibling combinator <code>~</code> for karaoke
        </label>
      </fieldset>
      <ul>
        {samples.map(({ id, title }) => (
          <li key={id}>
            <a href={`/SimplePlayer/${id}?liteDOM=${liteDOM}&contentVis=${contentVis}&genSC=${genSC}`}>{title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
