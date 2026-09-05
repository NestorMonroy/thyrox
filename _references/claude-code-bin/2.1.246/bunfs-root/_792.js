// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{vxd as n}from"/$bunfs/root/_837.js";var w=n(function(p){var r={warningEmitted:!1},a=(e)=>{if(e&&!r.warningEmitted&&parseInt(e.substring(1,e.indexOf(".")))<18)r.warningEmitted=!0,process.emitWarning(`NodeDeprecationWarning: The AWS SDK for JavaScript (v3) will
no longer support Node.js 16.x on January 6, 2025.

To continue receiving updates to AWS services, bug fixes, and security
updates please upgrade to a supported Node.js LTS version.

More information can be found at: https://a.co/74kJMmI`)};function o(e,t,s){if(!e.$source)e.$source={};return e.$source[t]=s,e}function u(e,t,s){if(!e.__aws_sdk_context)e.__aws_sdk_context={features:{}};else if(!e.__aws_sdk_context.features)e.__aws_sdk_context.features={};e.__aws_sdk_context.features[t]=s}function i(e,t,s){if(!e.$source)e.$source={};return e.$source[t]=s,e}p.emitWarningIfUnsupportedVersion=a;p.setCredentialFeature=o;p.setFeature=u;p.setTokenFeature=i;p.state=r});
export{w as g$c};
