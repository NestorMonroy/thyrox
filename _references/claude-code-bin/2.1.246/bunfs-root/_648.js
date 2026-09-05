// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{vxd as A}from"/$bunfs/root/_837.js";var j=A(function(B){B.byteLength=l;B.toByteArray=C;B.fromByteArray=i;var F=[],c=[],p=typeof Uint8Array<"u"?Uint8Array:Array,x="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";for(d=0,s=x.length;d<s;++d)F[d]=x[d],c[x.charCodeAt(d)]=d;var d,s;c[45]=62;c[95]=63;function u(r){var e=r.length;if(e%4>0)throw Error("Invalid string. Length must be a multiple of 4");var t=r.indexOf("=");if(t===-1)t=e;var o=t===e?0:4-t%4;return[t,o]}function l(r){var e=u(r),t=e[0],o=e[1];return(t+o)*3/4-o}function y(r,e,t){return(e+t)*3/4-t}function C(r){var e,t=u(r),o=t[0],n=t[1],a=new p(y(r,o,n)),v=0,f=n>0?o-4:o,h;for(h=0;h<f;h+=4)e=c[r.charCodeAt(h)]<<18|c[r.charCodeAt(h+1)]<<12|c[r.charCodeAt(h+2)]<<6|c[r.charCodeAt(h+3)],a[v++]=e>>16&255,a[v++]=e>>8&255,a[v++]=e&255;if(n===2)e=c[r.charCodeAt(h)]<<2|c[r.charCodeAt(h+1)]>>4,a[v++]=e&255;if(n===1)e=c[r.charCodeAt(h)]<<10|c[r.charCodeAt(h+1)]<<4|c[r.charCodeAt(h+2)]>>2,a[v++]=e>>8&255,a[v++]=e&255;return a}function L(r){return F[r>>18&63]+F[r>>12&63]+F[r>>6&63]+F[r&63]}function g(r,e,t){var o,n=[];for(var a=e;a<t;a+=3)o=(r[a]<<16&16711680)+(r[a+1]<<8&65280)+(r[a+2]&255),n.push(L(o));return n.join("")}function i(r){var e,t=r.length,o=t%3,n=[],a=16383;for(var v=0,f=t-o;v<f;v+=a)n.push(g(r,v,v+a>f?f:v+a));if(o===1)e=r[t-1],n.push(F[e>>2]+F[e<<4&63]+"==");else if(o===2)e=(r[t-2]<<8)+r[t-1],n.push(F[e>>10]+F[e>>4&63]+F[e<<2&63]+"=");return n.join("")}});
export{j as q6b};
