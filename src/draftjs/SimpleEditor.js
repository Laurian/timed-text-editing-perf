import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Editor, EditorState, convertFromRaw, convertToRaw, CompositeDecorator, EditorBlock } from 'draft-js';
import chunk from 'lodash.chunk';
import VisibilitySensor from 'react-visibility-sensor';

import samples from '../data/samples';

import 'draft-js/dist/Draft.css';
import './SimpleEditor.css';

const SimpleEditor = () => {
  const { id } = useParams();
  const location = useLocation();

  const { liteDOM, contentVis, genSC, paginated } = useMemo(() => {
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

    const time = parseFloat(target.parentElement.parentElement.getAttribute('data-start'));
    if (time && player.current) player.current.currentTime = time;
  }, []);

  const pagination = useMemo(() => (paginated ? 5 : segments ? segments.length : 1e3), [paginated, segments]);

  return (
    <div className={`simple-editor contentVis-${contentVis} genSC-${genSC}`}>
      <audio controls preload="auto" src={audio} ref={player} onTimeUpdate={timeUpdate} onCanPlay={watchCurrentTime} />
      <div onClick={seek}>
        {segments ? <MemoizedPages {...{ segments, liteDOM, pagination }} /> : <em>loading…</em>}
      </div>
      {segments ? <Karaoke {...{ time, segments, genSC, pagination }} /> : null}
    </div>
  );
};

const Pages = ({ segments, liteDOM, pagination }) => {
  const pages = useMemo(() => chunk(segments, pagination), [segments, pagination]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (page > pages.length - 1) return;
    setTimeout(() => {
      setPage(page + 1);
    }, 50 * page);
  }, [pages, page, setPage]);

  return (
    <div className="transcript">
      {pages.slice(0, page).map((segments, index) => (
        <Page {...{ segments, liteDOM }} editorKey={`e-${index}`} key={`e-${index}`} />
      ))}
    </div>
  );
};

const MemoizedPages = React.memo(Pages);

const Page = ({ segments, editorKey, liteDOM }) => {
  const [editorState, setEditorState] = useState(null);
  const [previewState, setPreviewState] = useState(null);

  useEffect(() => {
    if (!segments || editorState) return;

    const blocks = segments.map(({ speaker, start, duration, items }, index) => ({
      text: items.map(([text]) => text).join(' '),
      key: `s${index}-${start}-${duration}`,
      type: 'paragraph',
      data: { start, duration, speaker },
      // entityRanges: [],
      entityRanges: items.map(([text, start, duration], index) => {
        return {
          start,
          duration,
          offset:
            items
              .slice(0, index)
              .map(([text]) => text)
              .join(' ').length + (index === 0 ? 0 : 1),
          length: text.length,
          key: `e${index}-${start}-${duration}`,
        };
      }),
      inlineStyleRanges: [],
    }));

    const initEditorState = EditorState.set(
      EditorState.createWithContent(convertFromRaw({ blocks, entityMap: createEntityMap(blocks) }), decorator),
      { allowUndo: true }
    );

    setEditorState(initEditorState);
    setPreviewState(createPreview(initEditorState));
  }, [segments, editorState, setEditorState]);

  const customBlockRenderer = useCallback(contentBlock => {
    const type = contentBlock.getType();
    if (type === 'paragraph') {
      return {
        component: CustomBlock,
        editable: type === 'paragraph',
        props: {},
      };
    }
    return null;
  }, []);

  if (liteDOM)
    return editorState ? (
      <section data-editor-key={editorKey}>
        <VisibilitySensor intervalCheck={false} scrollCheck={true} partialVisibility={true}>
          {({ isVisible }) => {
            const state = isVisible ? editorState : previewState;

            return (
              <Editor
                editorKey={editorKey}
                readOnly={!isVisible}
                editorState={state}
                onChange={setEditorState}
                blockRendererFn={customBlockRenderer}
                stripPastedStyles
              />
            );
          }}
        </VisibilitySensor>
      </section>
    ) : (
      <em>loading editor…</em>
    );

  return editorState ? (
    <section data-editor-key={editorKey}>
      <Editor
        editorKey={editorKey}
        readOnly={false}
        editorState={editorState}
        onChange={setEditorState}
        blockRendererFn={customBlockRenderer}
        stripPastedStyles
      />
    </section>
  ) : (
    <em>loading editor…</em>
  );
};

const flatten = list => list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

const createEntityMap = blocks =>
  flatten(blocks.map(block => block.entityRanges)).reduce(
    (acc, data) => ({
      ...acc,
      [data.key]: { type: 'TOKEN', mutability: 'MUTABLE', data },
    }),
    {}
  );

const getEntityStrategy = mutability => (contentBlock, callback, contentState) => {
  contentBlock.findEntityRanges(character => {
    const entityKey = character.getEntity();
    return entityKey && contentState.getEntity(entityKey).getMutability() === mutability;
  }, callback);
};

const decorator = new CompositeDecorator([
  {
    strategy: getEntityStrategy('MUTABLE'),
    component: ({ entityKey, contentState, children }) => {
      const data = entityKey ? contentState.getEntity(entityKey).getData() : {};
      return (
        <span data-start={data.start} data-entity-key={data.key} className="Token">
          {children}
        </span>
      );
    },
  },
]);

const CustomBlock = props => (
  <div className="WrapperBlock" data-speaker={props.block.getData().get('speaker')}>
    <EditorBlock {...props} />
  </div>
);

const createPreview = editorState =>
  EditorState.set(
    EditorState.createWithContent(
      convertFromRaw({
        blocks: convertToRaw(editorState.getCurrentContent()).blocks.map(block => ({
          ...block,
          entityRanges: [],
          inlineStyleRanges: [],
        })),
        entityMap: {},
      }),
      decorator
    ),
    { allowUndo: false }
  );

const Karaoke = ({ time, segments, genSC, pagination }) => {
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
  const itemIndex = useMemo(() => segment?.items.findIndex(_item => _item === item), [segment, item]);

  useEffect(() => {
    let element;

    if (item) element = document.querySelector(`span[data-entity-key="e${itemIndex}-${item[1]}-${item[2]}"]`);
    if (!element && segment)
      element = document.querySelector(
        `div[data-offset-key="s${segmentIndex % 5}-${segment.start}-${segment.duration}-0-0"]`
      );

    element?.scrollIntoView({ block: 'center' });
  }, [item, segment, itemIndex, segmentIndex]);

  if (genSC)
    return (
      <style scoped>
        {segment
          ? `section[data-editor-key="e-${Math.floor(
              segmentIndex / pagination
            )}"] ~ section { font-weight: 300 !important; }`
          : null}
        {segment
          ? `div[data-offset-key="s${segmentIndex % pagination}-${segment.start}-${
              segment.duration
            }-0-0"] ~ div { font-weight: 300; }`
          : null}
        {item ? `span[data-entity-key="e${itemIndex}-${item[1]}-${item[2]}"] ~ span { font-weight: 300; }` : null}

        {item
          ? `span[data-entity-key="e${itemIndex}-${item[1]}-${item[2]}"] { color: white !important; background-color: red; outline: 5px solid red; outline-radius: 5px}`
          : null}
      </style>
    );

  return (
    <style scoped>
      {playedSegments?.map(
        (segment, i) =>
          `div[data-offset-key="s${i % pagination}-${segment.start}-${segment.duration}-0-0"] { font-weight: 500; }`
      )}
      {items?.map((item, i) => `span[data-entity-key="e${i}-${item[1]}-${item[2]}"] { font-weight: 500; }`)}

      {item
        ? `span[data-entity-key="e${itemIndex}-${item[1]}-${item[2]}"] { color: white !important; background-color: red; outline: 5px solid red; outline-radius: 5px}`
        : null}
    </style>
  );
};
export default SimpleEditor;
