// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Azt}from"/$bunfs/root/chunk-1mfrrmkr.js";import{_t}from"/$bunfs/root/chunk-c01w1545.js";import{w}from"/$bunfs/root/chunk-0a23e6xe.js";import{Iv,Z$}from"/$bunfs/root/chunk-29mppvsc.js";import{G,e}from"/$bunfs/root/chunk-rygnxyqy.js";import{Vt,sn,D}from"/$bunfs/root/chunk-cvh5tjew.js";D();import{PassThrough as u}from"stream";function m(){}var x9e=Vt(!1);function yA(r){let i=w(5),{children:t}=r,{exit:n}=Iv(),a,o;if(i[0]!==n)a=()=>{let d=setTimeout(n,0);return()=>clearTimeout(d)},o=[n],i[0]=n,i[1]=a,i[2]=o;else a=i[1],o=i[2];sn(a,o);let c;if(i[3]!==t)c=e(G,{children:t}),i[3]=t,i[4]=c;else c=i[4];return c}async function gO(r,t){r.render(e(yA,{children:t})),await r.waitUntilExit()}async function ZRe(r,{columns:t,storageV5:n}){let i="",a=!1,o=new u;if(t!==void 0)o.columns=t;return o.on("data",(c)=>{if(a)return;a=!0,i=c.toString()}),await(await Z$(e(yA,{children:e(x9e.Provider,{value:!0,children:e(Azt,{value:m,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function jWt(r,t){let n=await ZRe(r,t);return _t(n)}
export{x9e,yA,gO,ZRe,jWt};
