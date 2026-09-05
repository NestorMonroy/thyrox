// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{x$c as s}from"/$bunfs/root/_801.js";import{Axd as u,xxd as l}from"/$bunfs/root/_837.js";function r(){if(i)return a;i=!0;let t="linux";if(t!=="darwin"&&t!=="linux"&&t!=="win32")return null;try{return a=s(),a}catch{}let o=`x64-${t}`,c=(t==="linux"?[o,`${o}-musl`]:[o]).flatMap((n)=>[`./vendor/audio-capture/${n}/audio-capture.node`,`../audio-capture/${n}/audio-capture.node`]);for(let n of c)try{return a=u(n),a}catch{}return null}function p(){return r()!==null}function f(t,o){let e=r();if(!e)return!1;return e.startRecording(t,o)}function m(){let t=r();if(!t)return;t.stopRecording()}function b(){let t=r();if(!t)return!1;return t.isRecording()}function v(t,o){let e=r();if(!e)return!1;return e.startPlayback(t,o)}function A(t){let o=r();if(!o)return;o.writePlaybackData(t)}function P(){let t=r();if(!t)return;t.stopPlayback()}function y(){let t=r();if(!t)return!1;return t.isPlaying()}function N(){let t=r();if(!t||!t.microphoneAuthorizationStatus)return 0;return t.microphoneAuthorizationStatus()}var a=null,i=!1;var d=()=>{};d();export{p as isNativeAudioAvailable,y as isNativePlaying,b as isNativeRecordingActive,N as microphoneAuthorizationStatus,v as startNativePlayback,f as startNativeRecording,P as stopNativePlayback,m as stopNativeRecording,A as writeNativePlaybackData};
