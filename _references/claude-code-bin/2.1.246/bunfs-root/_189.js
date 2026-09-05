// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{VWb as _,YWb as F,bWb as s,jWb as m}from"/$bunfs/root/_611.js";import{VXb as e,jYb as H}from"/$bunfs/root/_612.js";import{Ivd as u,dwd as M}from"/$bunfs/root/_832.js";import{xxd as d}from"/$bunfs/root/_837.js";import{posix as l}from"path";function h(t){return t!==""&&t===t.trim()&&Buffer.byteLength(t,"utf8")<=O&&!t.startsWith(".")&&!_(t)&&!t.includes("\\")&&!C.test(t)&&!S.test(t)&&!t.endsWith("~")&&!t.endsWith(".swp")&&!t.endsWith(".tmp")}function E(t){return t.length>r.length&&t.endsWith(r)}function I(t){return s(t)}function L(t){return E(I(t))}function a(t){if(t.length>D||!u(t)||t.normalize("NFC")!==t)return null;let n=t.split("/");if(!n.every(h))return null;let[i,...o]=n;if(o.length===0)return i===T?"claude_md":null;let p=o.slice(0,-1),c=o.at(-1)??"";if(!E(c)||p.some(L))return null;if(o.length>f)return null;return i===x?"rule":i===N?"output_style":null}function w(t){return a(t)!==null}function Y(t){let n=a(t);return n===null?null:{destination:t,kind:n}}var W,A="/mnt/user-data/working",X,b=32,B=524288,G=2097152,D=200,O=237,f=4,T="CLAUDE.md",x="rules",N="output-styles",k="settings.json",r=".md",C,S;var R=d(()=>{M();m();H();F();W=l.dirname(e),X=l.join(A,e),C=/[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800\u{1D159}\u2024-\u2026\u2044\u2215\u2216\u2236\u2571\u2572\u27CB\u27CD\u29F5\u29F8\u29F9\u02D0\u05C3\u0589\uA789\uFE13\uFE52\uFE55\uFE68\uFF0E\uFF0F\uFF1A\uFF3C\uFF61\u3002]|(?!\u0020)\p{Zs}/u,S=/^\p{M}/u});
export{X as Yt,b as Zt,B as _t,G as $t,D as au,x as bu,N as cu,k as du,I as eu,a as fu,w as gu,Y as hu,R as iu};
