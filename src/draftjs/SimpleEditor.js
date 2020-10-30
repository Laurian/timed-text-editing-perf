import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Editor, EditorState } from 'draft-js';

import samples from '../data/samples';

import 'draft-js/dist/Draft.css';
import './SimpleEditor.css';

const SimpleEditor = () => {
  let { id } = useParams();
  const { audio, transcript } = useMemo(() => samples.find(({ id: _id }) => _id === id), [id]);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const result = await axios(transcript);
      console.log(result);
      setData(result.data);
    };
    data || fetchData();
  }, [transcript, setData, data]);

  return (
    <div className="simple-editor">
      <audio controls preload="true" src={audio} />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

// const BasicEditor = () => {
//   const [editorState, setEditorState] = React.useState(() => EditorState.createEmpty());

//   return <Editor editorState={editorState} onChange={setEditorState} />;
// };

export default SimpleEditor;
