// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Qoe}from"/$bunfs/root/chunk-w711fa4d.js";import{Y4t}from"/$bunfs/root/chunk-pkeky95d.js";var m=/<\/(?:body|html)[\t\n\f\r />]/i;function f(o){if(!m.test(o))return o.length;let e=-1,n=()=>{e=-1},r=()=>{},a=new Qoe({sourceCodeLocationInfo:!0},{onStartTag(t){let i=Y4t.get(t.tagName);if(i!==void 0)a.state=i,a.lastStartTagName=t.tagName;if(t.tagName!=="html")n()},onEndTag(t){if(t.tagName!=="body"&&t.tagName!=="html")n();else if(e<0&&t.location)e=t.location.startOffset},onComment:r,onDoctype:r,onCharacter:n,onNullCharacter:n,onWhitespaceCharacter:r,onEof:r});return a.write(o,!0),e>=0?e:o.length}export{f as runtimeBlockInsertionIndex};
