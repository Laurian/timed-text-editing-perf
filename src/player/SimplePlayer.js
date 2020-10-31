import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import VisibilitySensor from 'react-visibility-sensor';

import samples from '../data/samples';

import './SimplePlayer.css';

const SimplePlayer = () => {
  const { id } = useParams();
  const location = useLocation();

  const { liteDOM, contentVis, genSC } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return [...params.keys()].reduce((acc, key) => ({ ...acc, [key]: params.get(key) === 'true' }), {});
  }, [location]);

  const player = useRef();
  const { audio, transcript } = useMemo(() => samples.find(({ id: _id }) => _id === id), [id]);
  const [segments, setSegments] = useState(null);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const result = await axios(transcript);
      setSegments(result.data);
    };
    segments || fetchData();
  }, [transcript, setSegments, segments]);

  const timeUpdate = useCallback(() => setTime(player.current?.currentTime), [setTime, player]);
  const watchCurrentTime = useCallback(() => setInterval(() => timeUpdate(), 75), [timeUpdate]);

  const seek = useCallback(({ nativeEvent: { target } }) => {
    if (target.tagName !== 'SPAN') return;

    const time = parseFloat(target.getAttribute('data-start'));
    if (time && player.current) player.current.currentTime = time;
  }, []);

  return (
    <div className={`simple-player contentVis-${contentVis} genSC-${genSC}`}>
      <audio controls preload="auto" src={audio} ref={player} onTimeUpdate={timeUpdate} onCanPlay={watchCurrentTime} />
      <div onClick={seek}>{segments ? <MemoizedTranscript {...{ segments, liteDOM }} /> : <em>loading…</em>}</div>
      {segments ? <Karaoke {...{ time, segments, genSC }} /> : null}
    </div>
  );
};

const Transcript = ({ segments, liteDOM }) => {
  if (liteDOM)
    return (
      <div className="transcript">
        {segments.map(({ speaker, start, duration, items }, index) => (
          <VisibilitySensor partialVisibility={true}>
            {({ isVisible }) => (
              <p
                key={`${index}+${start}`}
                data-speaker={speaker}
                data-start={start}
                data-duration={duration}
                data-segment={`${start}+${duration}`}
              >
                {isVisible
                  ? items.map(([text, start, duration], index) => (
                      <>
                        <span
                          key={`${index}+${start}`}
                          data-start={start}
                          data-duration={duration}
                          data-item={`${start}+${duration}`}
                        >
                          {text}
                        </span>{' '}
                      </>
                    ))
                  : items.map(([text]) => text).join(' ')}
              </p>
            )}
          </VisibilitySensor>
        ))}
      </div>
    );

  return (
    <div className="transcript">
      {segments.map(({ speaker, start, duration, items }, index) => (
        <p
          key={`${index}+${start}`}
          data-speaker={speaker}
          data-start={start}
          data-duration={duration}
          data-segment={`${start}+${duration}`}
        >
          {items.map(([text, start, duration], index) => (
            <>
              <span
                key={`${index}+${start}`}
                data-start={start}
                data-duration={duration}
                data-item={`${start}+${duration}`}
              >
                {text}
              </span>{' '}
            </>
          ))}
        </p>
      ))}
    </div>
  );
};

const MemoizedTranscript = React.memo(Transcript);

const Karaoke = ({ time, segments, genSC }) => {
  const segmentIndex = useMemo(
    () =>
      segments.findIndex(
        ({ start, duration }, index) =>
          start <= time &&
          (time < start + duration || (index < segments.length - 1 && time < segments[index + 1].start))
      ),
    [segments, time]
  );

  const segment = useMemo(() => segments[segmentIndex], [segments, segmentIndex]);

  const playedSegments = useMemo(() => [...segments].slice(0, segmentIndex), [segments, segmentIndex]);

  const items = useMemo(() => segment?.items.filter(([text, start, duration]) => start <= time), [segment, time]);

  const item = useMemo(() => items?.slice(-1).pop(), [items]);

  useEffect(() => {
    let element;

    if (item) element = document.querySelector(`span[data-item="${item[1]}+${item[2]}"]`);
    if (!element && segment) element = document.querySelector(`p[data-segment="${segment.start}+${segment.duration}"]`);

    element?.scrollIntoView({ block: 'center' });
  }, [item, segment]);

  if (genSC)
    return (
      <style scoped>
        {segment ? `p[data-segment="${segment.start}+${segment.duration}"] ~ p { font-weight: 300; }` : null}
        {item ? `span[data-item="${item[1]}+${item[2]}"] ~ span { font-weight: 300; }` : null}

        {item
          ? `span[data-item="${item[1]}+${item[2]}"] { color: white; background-color: red; outline: 5px solid red; outline-radius: 5px}`
          : null}
      </style>
    );

  return (
    <style scoped>
      {playedSegments?.map(segment => `p[data-segment="${segment.start}+${segment.duration}"] { font-weight: 500; }`)}
      {items?.map(item => `span[data-item="${item[1]}+${item[2]}"] { font-weight: 500; }`)}

      {item
        ? `span[data-item="${item[1]}+${item[2]}"] { color: white; background-color: red; outline: 5px solid red; outline-radius: 5px}`
        : null}
    </style>
  );
};
export default SimplePlayer;
