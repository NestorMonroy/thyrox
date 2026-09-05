// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{sRb as i,tRb as C}from"/$bunfs/root/_590.js";import{Lqc as p,Orc as a,Qrc as f,Rpc as r,Yac as n,cbc as c}from"/$bunfs/root/_668.js";import{Tbd as d}from"/$bunfs/root/_811.js";import{xxd as s}from"/$bunfs/root/_837.js";function o(){return{...t,...a("tengu_malort_pedway",t)}}function l(){let e=r();return e==="max"||e==="pro"}function A(){if(n("hipaa"))return!1;return l()&&o().enabled}function R(){let{enabled:e,coordinateMode:g,...u}=o();return u}function v(){let e=i();return e.frozenCoordinateMode??=o().coordinateMode,e.frozenCoordinateMode}var t;var m=s(()=>{f();c();p();d();C();t={enabled:!1,pixelValidation:!1,clipboardPasteMultiline:!0,mouseAnimation:!0,hideBeforeAction:!0,autoTargetDisplay:!0,clipboardGuard:!0,maskFailClosed:!0,adaptiveResolution:!1,coordinateMode:"pixels"}});
export{A as Glb,R as Hlb,v as Ilb,m as Jlb};
