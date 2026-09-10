// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Arc as a,Qrc as c,nrc as f,xrc as n,yrc as o}from"/$bunfs/root/_668.js";import{xxd as r}from"/$bunfs/root/_837.js";async function i(){try{return await a("tengu_violin_strad")}catch{return!1}}function l(){try{return o("tengu_violin_strad",!1)}catch{return!1}}var u=r(()=>{c()});async function s(){try{return await a("tengu_violin_wood")}catch{return!1}}function d(){try{return o("tengu_violin_wood",!1)}catch{return!1}}async function S(){return await s()&&await i()}function y(){return d()&&l()}function A(){try{let{value:e,source:t}=n("tengu_violin_wood",!1);return e===!1&&_(t)}catch{return!1}}function _(e){switch(e){case"payload":case"override":case"disabled":return!0;case"fallback":return f();case"disk":return!1}}function w(e){try{return _(n(e,!1).source)}catch{return!1}}async function b(){try{return await a("tengu_violin_amati")}catch{return!1}}function E(){try{return o("tengu_violin_amati",!1)}catch{return!1}}function V(){return d()&&E()}async function v(){let[e,t]=await Promise.all([s(),b()]);return e&&t}var C=r(()=>{c();u()});
export{s as q$b,d as r$b,S as s$b,y as t$b,A as u$b,w as v$b,b as w$b,E as x$b,V as y$b,v as z$b,C as A$b};
