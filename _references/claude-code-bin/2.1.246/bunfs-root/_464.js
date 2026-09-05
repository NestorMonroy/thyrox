// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Jjd as d,Kjd as A,atd as f,zkd as u}from"/$bunfs/root/_826.js";import{xxd as s}from"/$bunfs/root/_837.js";class a{note=void 0;setNote(n){this.note=n}}function l(){return T.of(u().host)}function p(n){l().setNote(n)}function y(){return l().note}var T;var c=s(()=>{f();A();T=new d(()=>new a)});var R,S,U,V;var I=s(()=>{R=["SSL_CERT_FILE","NODE_EXTRA_CA_CERTS","REQUESTS_CA_BUNDLE","CURL_CA_BUNDLE","CLOUDSDK_CORE_CUSTOM_CA_CERTS_FILE","HTTPLIB2_CA_CERTS"],S=["AWS_CA_BUNDLE","DENO_CERT","CARGO_HTTP_CAINFO","PIP_CERT","GIT_SSL_CAINFO","GRPC_DEFAULT_SSL_ROOTS_FILE_PATH","NIX_SSL_CERT_FILE","HEX_CACERTS_PATH"],U=[...R,...S],V={UV_NATIVE_TLS:"true",DENO_TLS_CA_STORE:"system,mozilla"}});function E(n,r){let e=0,o=1;for(let _=0;_<10;_++){let i=r+_;if(i>=n.length)return;let t=n[i];if(e+=(t&127)*o,(t&128)===0)return{value:e,next:i+1};o*=128}return}function C(n,r){let e=0;while(e<n.length){let o=E(n,e);if(o===void 0)return!1;let _=o.value&7,i=Math.floor(o.value/8);switch(e=o.next,_){case 0:{let t=E(n,e);if(t===void 0)return!1;e=t.next,r.onVarint?.(i,t.value);break}case 1:if(e+8>n.length)return!1;e+=8;break;case 2:{let t=E(n,e);if(t===void 0||t.value>n.length-t.next)return!1;e=t.next+t.value,r.onBytes?.(i,n.subarray(t.next,e));break}case 5:if(e+4>n.length)return!1;e+=4;break;default:return!1}}return!0}function L(n,r){let e;return C(n,{onBytes(_,i){if(_===r)e=i}})?e:void 0}function P(n,r){let e=L(n,r);return e===void 0?void 0:N.decode(e)}var N;var x=s(()=>{N=new TextDecoder("utf-8",{ignoreBOM:!0})});
export{p as n3a,y as o3a,c as p3a,C as q3a,L as r3a,P as s3a,x as t3a,R as u3a,S as v3a,U as w3a,V as x3a,I as y3a};
