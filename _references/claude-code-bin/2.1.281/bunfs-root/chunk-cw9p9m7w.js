// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{w}from"/$bunfs/root/chunk-q93sw3mb.js";import{s,n}from"/$bunfs/root/chunk-b8sc2vbx.js";import{ms}from"/$bunfs/root/chunk-p3rmcwrk.js";import{e,r}from"/$bunfs/root/chunk-srmsc891.js";import{_}from"/$bunfs/root/chunk-0dapr5gw.js";function dr(R){let t=w(10),{message:a,bold:f,dimColor:g,subtitle:o}=R,d=f===void 0?!1:f,m=g===void 0?!1:g,p;if(t[0]===_)p=e(ms,{}),t[0]=p;else p=t[0];let l;if(t[1]!==d||t[2]!==m||t[3]!==a)l=r(s,{flexDirection:"row",children:[p,r(n,{bold:d,dimColor:m,children:[" ",a]})]}),t[1]=d,t[2]=m,t[3]=a,t[4]=l;else l=t[4];let i;if(t[5]!==o)i=o&&e(n,{dimColor:!0,children:o}),t[5]=o,t[6]=i;else i=t[6];let c;if(t[7]!==l||t[8]!==i)c=r(s,{flexDirection:"column",children:[l,i]}),t[7]=l,t[8]=i,t[9]=c;else c=t[9];return c}
export{dr};
