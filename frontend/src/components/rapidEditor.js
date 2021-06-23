import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as iD from 'iD';
import 'iD/dist/iD.css';
import { OSM_CONSUMER_KEY, OSM_CONSUMER_SECRET, OSM_SERVER_URL } from '../config';
export default function RapidEditor({ editorRef, setEditorRef, setDisable, comment, presets }) {
  const dispatch = useDispatch();
  const session = useSelector((state) => state.auth.get('session'));
  const locale = useSelector((state) => state.preferences.locale);
  const windowInit = typeof window !== undefined;

  useEffect(() => {
    return () => {
      window.iD.coreContext('destroy');
      dispatch({ type: 'SET_VISIBILITY', isVisible: true });
    };
    // eslint-disable-next-line
  }, []);
  useEffect(() => {
    if (windowInit && !editorRef) {
      dispatch({ type: 'SET_VISIBILITY', isVisible: false });
      setEditorRef(window.iD.coreContext());
    }
  }, [windowInit, setEditorRef, editorRef, dispatch]);

  useEffect(() => {
    if (editorRef && comment) {
      editorRef.defaultChangesetComment(comment);
    }
  }, [comment, editorRef]);
  useEffect(() => {
    if (session && locale && iD && editorRef) {
      // if presets is not a populated list we need to set it as null
      try {
        if (presets.length) {
          window.iD.presetManager.addablePresetIDs(presets);
        } else {
          window.iD.presetManager.addablePresetIDs(null);
        }
      } catch (e) {
        window.iD.presetManager.addablePresetIDs(null);
      }
      editorRef
        .embed(true)
        .assetPath('/static/rapid/')
        .locale(locale)
        .setsDocumentTitle(false)
        .containerNode(document.getElementById('id-container'));
      editorRef.init();

      let osm = editorRef.connection();
      const auth = {
        urlroot: OSM_SERVER_URL,
        oauth_consumer_key: OSM_CONSUMER_KEY,
        oauth_secret: OSM_CONSUMER_SECRET,
        oauth_token: session.osm_oauth_token,
        oauth_token_secret: session.osm_oauth_token_secret,
      };
      osm.switch(auth);

      const thereAreChanges = (changes) =>
        changes.modified.length || changes.created.length || changes.deleted.length;

      editorRef.history().on('change', () => {
        if (thereAreChanges(editorRef.history().changes())) {
          setDisable(true);
        } else {
          setDisable(false);
        }
      });
    }
  }, [session, editorRef, setDisable, presets, locale]);

  return <div className="w-100 vh-minus-77-ns" id="id-container"></div>;
}
