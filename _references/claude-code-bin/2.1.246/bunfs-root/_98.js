// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Fk as r}from"/$bunfs/root/_99.js";import{randomBytes as s}from"crypto";import{hostname as i}from"os";var a=/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/,c=/^[A-Za-z]{1,64}$/,m=/^([A-Za-z0-9][A-Za-z0-9._-]{0,63})\/([A-Za-z]{1,64})\/(\d{1,4})$/,I=8,d=64,u=9999,o={hostname:i,randomHex:(n)=>s(n).toString("hex")};function D(n=o){return`dev-${n.randomHex(I)}`}function E(n=o){let[t=""]=n.hostname().split(".");return r(t,d)}function _(n,t,e){if(!a.test(n)||!c.test(t)||!Number.isInteger(e)||e<0||e>u)throw Error("cannot form a device hook id from these inputs");return`${n}/${t}/${e}`}function A(n){let t=m.exec(n);return t?{instanceId:t[1],event:t[2],index:Number(t[3])}:null}
export{D as ok,E as pk,_ as qk,A as rk};
