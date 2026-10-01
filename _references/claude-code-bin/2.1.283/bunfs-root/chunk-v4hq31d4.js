// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{gy}from"/$bunfs/root/chunk-6rzb8eet.js";import{edn}from"/$bunfs/root/chunk-dsffjtj4.js";import{a$e}from"/$bunfs/root/chunk-jf0qe4b6.js";import{eA}from"/$bunfs/root/chunk-r43dek6r.js";import{Ef}from"/$bunfs/root/chunk-nah21d6g.js";import{lf}from"/$bunfs/root/chunk-0jw7026c.js";import{be}from"/$bunfs/root/chunk-ghttqp33.js";var a=be(eA());var c=lf(),d=gy(),l=Ef(),u=eA(),S=a$e();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=be(Ef()),Qcn=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=be(Ef());var Zcn=(e={})=>i.memoize(i.chain(edn(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{Qcn,Zcn};
