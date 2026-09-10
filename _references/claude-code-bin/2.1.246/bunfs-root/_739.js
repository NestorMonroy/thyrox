// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{S_c as A}from"/$bunfs/root/_784.js";import{g$c as b}from"/$bunfs/root/_792.js";import{i$c as y}from"/$bunfs/root/_794.js";import{Axd as T,txd as t,xxd as c}from"/$bunfs/root/_837.js";var a=(e)=>async(s)=>{e.logger?.debug("@aws-sdk/credential-provider-web-identity - fromWebToken");let{roleArn:o,roleSessionName:r,webIdentityToken:i,providerId:n,policyArns:_,policy:S,durationSeconds:N}=e,{roleAssumerWithWebIdentity:l}=e;if(!l){let{getDefaultRoleAssumerWithWebIdentity:I}=await import("/$bunfs/root/chunk-11dq0ct6.js").then((m)=>t(m.default,1));l=I({...e.clientConfig,credentialProviderLogger:e.logger,parentClientConfig:{...s?.callerClientConfig,...e.parentClientConfig}},e.clientPlugins)}return l({RoleArn:o,RoleSessionName:r??`aws-sdk-js-session-${Date.now()}`,WebIdentityToken:i,ProviderId:n,PolicyArns:_,Policy:S,DurationSeconds:N})};var d=()=>{};import{readFileSync as k}from"fs";var g,p,E,m="AWS_WEB_IDENTITY_TOKEN_FILE",w="AWS_ROLE_ARN",W="AWS_ROLE_SESSION_NAME",O=(e={})=>async(s)=>{e.logger?.debug("@aws-sdk/credential-provider-web-identity - fromTokenFile");let o=e?.webIdentityTokenFile??process.env[m],r=e?.roleArn??process.env[w],i=e?.roleSessionName??process.env[W];if(!o||!r)throw new p.CredentialsProviderError("Web identity configuration not specified",{logger:e.logger});let n=await a({...e,webIdentityToken:E.externalDataInterceptor?.getTokenRecord?.()[o]??k(o,{encoding:"ascii"}),roleArn:r,roleSessionName:i})(s);if(o===process.env[m])g.setCredentialFeature(n,"CREDENTIALS_ENV_VARS_STS_WEB_ID_TOKEN","h");return n};var f=c(()=>{d();g=t(b(),1),p=t(y(),1),E=t(A(),1)});var u=c(()=>{f();d()});
export{a as wUc,O as xUc,u as yUc};
