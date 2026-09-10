// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{a}from"/$bunfs/root/chunk-bxegdt3f.js";import{L}from"/$bunfs/root/chunk-vmja0gjy.js";var m={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function l(t){return t.replace(/[&<>"']/g,(e)=>m[e]??e)}var u=`*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{min-height:100vh;background:#FAF9F5;color:#141413;font:15px/1.5 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;display:flex;align-items:center;justify-content:center;padding:48px 24px}
main{width:100%;max-width:560px}
.status{display:inline-flex;align-items:center;gap:8px;padding:4px 10px 4px 8px;border-radius:999px;background:rgba(85,138,66,.10);color:#345C28;font-size:12.5px;font-weight:500;letter-spacing:-.005em;margin-bottom:20px}
.status::before{content:"";width:6px;height:6px;border-radius:50%;background:#558A42;box-shadow:0 0 0 3px rgba(85,138,66,.18)}
.status.err{background:rgba(166,50,68,.08);color:#671D28}
.status.err::before{background:#A63244;box-shadow:0 0 0 3px rgba(166,50,68,.15)}
h1{font-family:ui-serif,Charter,"Iowan Old Style",Georgia,serif;font-weight:400;font-size:32px;line-height:1.15;letter-spacing:-.02em;margin:0 0 10px;text-wrap:balance}
.sub{margin:0;color:#4D4C48;font-size:15px;line-height:1.55;max-width:52ch}
.detail{margin-top:20px;background:#FFF;border:.5px solid rgba(31,30,29,.15);border-left:3px solid #A63244;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.5;color:#3D3D3A;word-break:break-word}
@media (max-width:520px){h1{font-size:26px}body{padding:32px 18px}}`;function gE(t){let{ok:e,heading:r,message:n,detail:i}=t,d=e?'<span class="status">Connected</span>':'<span class="status err">Error</span>',o=i?`<div class="detail">${l(i)}</div>`:"",s=e?"<script>setTimeout(function(){try{window.close()}catch(e){}},1500)</script>":"";return`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Claude Code</title><style>${u}</style></head><body><main>${d}<h1>${l(r)}</h1><p class="sub">${l(n)}</p>${o}</main>${s}</body></html>`}import{createServer as g}from"http";function jVe(t){let e=Array.isArray(t)?t[0]:t;return e?e:void 0}var f=L()==="windows"?{min:39152,max:49151}:{min:49152,max:65535},p=3118;function PLe(t=p){return`http://localhost:${t}/callback`}function b(){let t=a.MCP_OAUTH_CALLBACK_PORT;return t!==void 0&&t<=65535?t:void 0}async function pY(t){let e=b();if(e)return e;if(t&&await c(t))return t;let{min:r,max:n}=f,i=n-r+1,d=Math.min(i,100);for(let o=0;o<d;o++){let s=r+Math.floor(Math.random()*i);if(await c(s))return s}if(await c(p))return p;throw Error("No available ports for OAuth redirect")}async function c(t){try{return await new Promise((e,r)=>{let n=g();n.once("error",r),n.listen(t,"127.0.0.1",()=>{n.close(()=>e())})}),!0}catch{return!1}}
export{gE,jVe,PLe,pY};
