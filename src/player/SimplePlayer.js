import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import VisibilitySensor from 'react-visibility-sensor';

import samples from '../data/samples';

import './SimplePlayer.css';

const SimplePlayer = () => {
  const { id } = useParams();
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

  const timeUpdate = useCallback(() => setTime(player.current.currentTime), [setTime, player]);
  const watchCurrentTime = useCallback(() => setInterval(() => timeUpdate(), 75), [timeUpdate]);

  const seek = useCallback(({ nativeEvent: { target } }) => {
    if (target.tagName !== 'SPAN') return;

    const time = parseFloat(target.getAttribute('data-start'));
    if (time) player.current.currentTime = time;
  }, []);

  return (
    <div className="simple-player">
      <audio controls preload="auto" src={audio} ref={player} onTimeUpdate={timeUpdate} onCanPlay={watchCurrentTime} />
      <div onClick={seek}>{segments ? <MemoizedTranscript segments={segments} /> : <em>loading…</em>}</div>
      {segments ? <Karaoke {...{ time, segments }} /> : null}
    </div>
  );
};

const Transcript = ({ segments }) => (
  <div className="transcript">
    {segments.map(({ speaker, start, duration, items }) => (
      <VisibilitySensor partialVisibility={true}>
        {({ isVisible }) => (
          <p data-speaker={speaker} data-start={start} data-duration={duration} data-segment={`${start}+${duration}`}>
            {isVisible
              ? items.map(([text, start, duration]) => (
                  <span data-start={start} data-duration={duration} data-item={`${start}+${duration}`}>
                    {`${text} `}
                  </span>
                ))
              : items.map(([text]) => text).join(' ')}
          </p>
        )}
      </VisibilitySensor>
    ))}
  </div>
);

const MemoizedTranscript = React.memo(Transcript);

const Karaoke = ({ time, segments }) => {
  const segment = useMemo(
    () =>
      segments.find(
        ({ start, duration }, index) =>
          start <= time &&
          (time < start + duration || (index < segments.length - 1 && time < segments[index + 1].start))
      ),
    [segments, time]
  );

  const item = useMemo(
    () =>
      segment?.items
        .filter(([text, start, duration]) => start <= time)
        .slice(-1)
        .pop(),
    [segment, time]
  );

  useEffect(() => {
    let element;

    if (item) element = document.querySelector(`span[data-item="${item[1]}+${item[2]}"]`);
    if (!element && segment) element = document.querySelector(`p[data-segment="${segment.start}+${segment.duration}"]`);

    element?.scrollIntoView({ block: 'center' });
  }, [item, segment]);

  return (
    <style scoped>
      {segment ? `p[data-segment="${segment.start}+${segment.duration}"] ~ p { font-weight: 300; }` : null}
      {item ? `span[data-item="${item[1]}+${item[2]}"] ~ span { font-weight: 300; }` : null}
    </style>
  );
};

export default SimplePlayer;
