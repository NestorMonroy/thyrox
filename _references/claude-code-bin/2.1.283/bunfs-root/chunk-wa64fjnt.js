// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{ORe}from"/$bunfs/root/chunk-379zyrv7.js";class o{converted=new WeakMap;lookup(t){return this.converted.get(t)}remember(t,e){this.converted.set(t,e)}reset(){this.converted=new WeakMap}}var n=new o;function d$(t){let e=n.lookup(t);if(e)return e;let r=ORe(t,{unrepresentable:"throw"});return n.remember(t,r),r}var oDe="attached:",sDe="created:";function iDe(t){return t.startsWith("created:")}var _3="opened:";function Cme(t){return t.startsWith("attached:")||t.startsWith("created:")||t.startsWith(_3)}function qR(t){return Object.entries(t).filter(([e])=>!e.startsWith(_3))}function ktn(t){return{url:t.url,title:t.title,favicon:t.favicon,kind:"frame",updated_at:new Date(t.updatedAt).toISOString()}}
export{d$,oDe,sDe,iDe,_3,Cme,qR,ktn};
