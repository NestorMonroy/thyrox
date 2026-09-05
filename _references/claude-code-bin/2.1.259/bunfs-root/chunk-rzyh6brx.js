// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{ua}from"/$bunfs/root/chunk-6gfsqcth.js";import{iCt}from"/$bunfs/root/chunk-vct94q6a.js";import{Gl}from"/$bunfs/root/chunk-77152aqa.js";import{Mhe}from"/$bunfs/root/chunk-v6qjye3q.js";import{_y}from"/$bunfs/root/chunk-4v0x54d2.js";import{lu}from"/$bunfs/root/chunk-sy4cv1c2.js";import{W}from"/$bunfs/root/chunk-qyvz15br.js";var a=W(_y(),1);var c=Gl(),d=ua(),l=lu(),u=_y(),S=Mhe();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=W(lu(),1),ZTt=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=W(lu(),1);var eCt=(e={})=>i.memoize(i.chain(iCt(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{ZTt,eCt};
