// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{_Ie}from"/$bunfs/root/chunk-v67w5hxq.js";class o{converted=new WeakMap;lookup(e){return this.converted.get(e)}remember(e,t){this.converted.set(e,t)}reset(){this.converted=new WeakMap}}var n=new o;function h0(e){let t=n.lookup(e);if(t)return t;let r=_Ie(e,{unrepresentable:"throw"});return n.remember(e,r),r}var d$e="attached:",u$e="created:";function p$e(e){return e.startsWith("created:")}var B3="opened:";function Kle(e){return e.startsWith("attached:")||e.startsWith("created:")||e.startsWith(B3)}function Hx(e){return Object.entries(e).filter(([t])=>!t.startsWith(B3))}function Yan(e){return{url:e.url,title:e.title,favicon:e.favicon,kind:"frame",updated_at:new Date(e.updatedAt).toISOString()}}
export{h0,d$e,u$e,p$e,B3,Kle,Hx,Yan};
