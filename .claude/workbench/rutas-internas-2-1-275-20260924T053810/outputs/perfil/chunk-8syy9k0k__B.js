function B(e,r,n){if(n===void 0){let s=T(g(e,"configs",`${r}.json`));if(s!==null)try{n=JSON.parse(s)}catch{}}return n?.authentication?.credentials_path??g(e,"credentials",`${r}.json`)}
