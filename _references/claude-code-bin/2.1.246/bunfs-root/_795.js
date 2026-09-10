// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Axd as A,vxd as t}from"/$bunfs/root/_837.js";var o=t(function(b){var i=(r)=>typeof ArrayBuffer==="function"&&r instanceof ArrayBuffer||Object.prototype.toString.call(r)==="[object ArrayBuffer]";b.isArrayBuffer=i});var y=t(function(g){var m=o(),f=A("buffer"),B=(r,e=0,u=r.byteLength-e)=>{if(!m.isArrayBuffer(r))throw TypeError(`The "input" argument must be ArrayBuffer. Received type ${typeof r} (${r})`);return f.Buffer.from(r,e,u)},a=(r,e)=>{if(typeof r!=="string")throw TypeError(`The "input" argument must be of type string. Received type ${typeof r} (${r})`);return e?f.Buffer.from(r,e):f.Buffer.from(r)};g.fromArrayBuffer=B;g.fromString=a});var x=t(function(w){var n=y(),s=(r)=>{let e=n.fromString(r,"utf8");return new Uint8Array(e.buffer,e.byteOffset,e.byteLength/Uint8Array.BYTES_PER_ELEMENT)},h=(r)=>{if(typeof r==="string")return s(r);if(ArrayBuffer.isView(r))return new Uint8Array(r.buffer,r.byteOffset,r.byteLength/Uint8Array.BYTES_PER_ELEMENT);return new Uint8Array(r)},p=(r)=>{if(typeof r==="string")return r;if(typeof r!=="object"||typeof r.byteOffset!=="number"||typeof r.byteLength!=="number")throw Error("@smithy/util-utf8: toUtf8 encoder function only accepts string | Uint8Array.");return n.fromArrayBuffer(r.buffer,r.byteOffset,r.byteLength).toString("utf8")};w.fromUtf8=s;w.toUint8Array=h;w.toUtf8=p});
export{x as j$c};
