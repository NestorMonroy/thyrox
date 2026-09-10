// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Dm}from"/$bunfs/root/chunk-jcvfantf.js";import{cCt}from"/$bunfs/root/chunk-nryd0h40.js";import{tu}from"/$bunfs/root/chunk-7fpmaq7k.js";import{Ihe}from"/$bunfs/root/chunk-jv5gv4ym.js";import{xS}from"/$bunfs/root/chunk-8682ryag.js";import{Wd}from"/$bunfs/root/chunk-9fwgm5kp.js";import{fe}from"/$bunfs/root/chunk-1r5dbh9v.js";var a=fe(xS());var c=tu(),d=Dm(),l=Wd(),u=xS(),S=Ihe();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=fe(Wd()),aCt=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=fe(Wd());var lCt=(e={})=>i.memoize(i.chain(cCt(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{aCt,lCt};
