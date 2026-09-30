// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{M}from"/$bunfs/root/chunk-gh1pqen9.js";var f={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function c(t){return t.replace(/[&<>"']/g,(e)=>f[e]??e)}var b=`*,*::before,*::after{box-sizing:border-box}
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
@media (max-width:520px){h1{font-size:26px}body{padding:32px 18px}}`;function cC(t){let{ok:e,heading:i,message:n,detail:r}=t,o=e?'<span class="status">Connected</span>':'<span class="status err">Error</span>',d=r?`<div class="detail">${c(r)}</div>`:"",s=e?"<script>setTimeout(function(){try{window.close()}catch(e){}},1500)</script>":"";return`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Claude Code</title><style>${b}</style></head><body><main>${o}<h1>${c(i)}</h1><p class="sub">${c(n)}</p>${d}</main>${s}</body></html>`}import{createServer as h}from"http";function Gst(t){let e=Array.isArray(t)?t[0]:t;return e?e:void 0}var x=M()==="windows"?{min:39152,max:49151}:{min:49152,max:65535},m=3118,w={range:x,fallback:m};function kwe(t=m){return`http://localhost:${t}/callback`}function y(){let t=a.MCP_OAUTH_CALLBACK_PORT;return t!==void 0&&t<=65535?t:void 0}async function Pre(t,e=w){let i=y();if(i)return i;if(t&&await l(t))return t;let{min:n,max:r}=e.range,o=r-n+1,d=Math.min(o,100);for(let u=0;u<d;u++){let p=n+Math.floor(Math.random()*o);if(await l(p))return p}if(await l(e.fallback))return e.fallback;let s=await g(0);if(s!==void 0)return s;throw Error("No available ports for OAuth redirect")}async function l(t){return await g(t)!==void 0}async function g(t){try{return await new Promise((e,i)=>{let n=h();n.once("error",i),n.listen(t,"127.0.0.1",()=>{let r=n.address(),o=typeof r==="object"&&r?r.port:void 0;n.close(()=>o!==void 0?e(o):i(Error("no address on bound server")))})})}catch{return}}
export{cC,Gst,kwe,Pre};
