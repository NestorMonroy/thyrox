// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{jxe}from"/$bunfs/root/chunk-e1ahn80a.js";class o{converted=new WeakMap;lookup(t){return this.converted.get(t)}remember(t,e){this.converted.set(t,e)}reset(){this.converted=new WeakMap}}var n=new o;function F$(t){let e=n.lookup(t);if(e)return e;let r=jxe(t,{unrepresentable:"throw"});return n.remember(t,r),r}var hLe="attached:",yLe="created:";function _Le(t){return t.startsWith("created:")}var q5="opened:";function kge(t){return t.startsWith("attached:")||t.startsWith("created:")||t.startsWith(q5)}function mx(t){return Object.entries(t).filter(([e])=>!e.startsWith(q5))}function Xrn(t){return{url:t.url,title:t.title,favicon:t.favicon,kind:"frame",updated_at:new Date(t.updatedAt).toISOString()}}
export{F$,hLe,yLe,_Le,q5,kge,mx,Xrn};
