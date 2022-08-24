import * as React from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { useDeepCompareEffect } from 'use-deep-compare';

export interface AnnounceKitProps {
  widget: string;
  lang?: string;
  user?: {
    id: string | number;
    name?: string;
    email?: string;
  };
  data?: {
    [key: string]: any;
  };
  user_token?: string;
  labels?: string[];
  children?: React.ReactNode;
  onRequestClose: () => void;
  style?: any;
}

export function AnnounceKit({
  widget,
  lang,
  user,
  user_token,
  labels,
  data,
  onRequestClose,
  style,
}: AnnounceKitProps) {
  const [state, setState] = React.useState<any>({});
  const params = { data, lang, user, user_token, labels, mobile: true };

  useDeepCompareEffect(() => {
    fetch(`${widget}/data.json`, {
      method: 'POST',
      body: JSON.stringify(params),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(resp => resp.json())
      .then(data => setState(data));
  }, [widget, params]);

  if (!state.posts) {
    return null;
  }

  return (
    <Frame
      widget={widget}
      params={params}
      onRequestClose={onRequestClose}
      onState={setState}
      style={style}
    />
  );
}

function Frame({ widget, params, onRequestClose, onState, style }) {
  const mounted = React.useRef<boolean>(false);
  const wv = React.useRef(null);

  const [state, setState] = React.useState({});

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const body = new URLSearchParams({
    'json-body': JSON.stringify(params),
  }).toString();

  const postMessage = msg => {
    wv.current.injectJavaScript(
      `window.postMessage(${JSON.stringify(msg)}, "*");`,
    );
  };

  return (
    <WebView
      ref={wv}
      allowsInlineMediaPlayback={true}
      injectedJavaScript={`
        var viewPortTag=document.createElement('meta');
        viewPortTag.name = "viewport";
        viewPortTag.content = "width=device-width, initial-scale=1, maximum-scale=1";
        document.getElementsByTagName('head')[0].appendChild(viewPortTag);
      `}
      originWhitelist={['*']}
      containerStyle={styles.webView}
      source={{
        uri: `${widget}/view?react-native`,
        method: 'post',
        body,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      }}
      onLoad={e => {
        postMessage({ event: 'R2L_INIT', payload: { params } });
      }}
      onMessage={event => {
        if (!mounted.current) {
          return;
        }

        let message;

        try {
          message = JSON.parse(event.nativeEvent.data);
        } catch {
          return;
        }

        switch (message.event) {
          case 'L2R_REQUEST': {
            if (message.payload == 'close') {
              onRequestClose?.();
            }

            break;
          }
          case 'L2R_PATCH_STATE':
            message.payload = { ...state, ...message.payload };
          // fallthrough
          case 'L2R_STATE':
            setState(message.payload);
            onState?.(message.payload);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  webView: {
    width: '100%',
    height: '100%',
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10,
  },
});
