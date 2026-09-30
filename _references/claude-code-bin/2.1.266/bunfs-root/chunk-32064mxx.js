// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{eg}from"/$bunfs/root/chunk-ew5sacsk.js";import{ZIt}from"/$bunfs/root/chunk-pa2d8f9z.js";import{cu}from"/$bunfs/root/chunk-mdw0rg7r.js";import{a_e}from"/$bunfs/root/chunk-bv1erxkf.js";import{ow}from"/$bunfs/root/chunk-v62k7d6f.js";import{Qd}from"/$bunfs/root/chunk-sv3snfhn.js";import{ge}from"/$bunfs/root/chunk-7sg5wrey.js";var a=ge(ow());var c=cu(),d=eg(),l=Qd(),u=ow(),S=a_e();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=ge(Qd()),JIt=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=ge(Qd());var QIt=(e={})=>i.memoize(i.chain(ZIt(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{JIt,QIt};
