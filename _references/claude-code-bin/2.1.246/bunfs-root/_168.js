// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{FD as s,yD as r,zD as o}from"/$bunfs/root/_280.js";import{Csc as n,Esc as i}from"/$bunfs/root/_668.js";s();i();function u(){return n("editorMode","normal").value==="vim"}function c(){if(r())return"shift + \u23CE for newline";return o()?"\\\u23CE for newline":"backslash (\\) + return (\u23CE) for newline"}var f=new Set(["escape","return","enter","tab","backspace","delete","up","down","left","right","pageup","pagedown","home","end","insert","clear","center","undefined","mouse","f1","f2","f3","f4","f5","f6","f7","f8","f9","f10","f11","f12"]);function d(e,t){if(t.ctrl||t.meta)return!1;if(f.has(e))return!1;return e.length>0&&!/^\s/.test(e)}function p(e){return e.length>0&&".,?!:;)]".includes(e.charAt(0))}
export{u as fr,c as gr,d as hr,p as ir};
