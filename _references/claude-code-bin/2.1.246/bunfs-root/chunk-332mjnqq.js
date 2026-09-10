// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{OR as c,RR as l}from"/$bunfs/root/_410.js";import{WR as m,cS as f}from"/$bunfs/root/_411.js";import{xxd as s}from"/$bunfs/root/_837.js";function N(o){if(!g.test(o))return o.length;let e=-1,n=()=>{e=-1},r=()=>{},a=new m({sourceCodeLocationInfo:!0},{onStartTag(t){let i=c.get(t.tagName);if(i!==void 0)a.state=i,a.lastStartTagName=t.tagName;if(t.tagName!=="html")n()},onEndTag(t){if(t.tagName!=="body"&&t.tagName!=="html")n();else if(e<0&&t.location)e=t.location.startOffset},onComment:r,onDoctype:r,onCharacter:n,onNullCharacter:n,onWhitespaceCharacter:r,onEof:r});return a.write(o,!0),e>=0?e:o.length}var g;var u=s(()=>{f();l();g=/<\/(?:body|html)[\t\n\f\r />]/i});u();export{N as runtimeBlockInsertionIndex};
