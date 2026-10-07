import {useEffect,useState} from 'react';

// Keep a read projection mounted during refresh, never across scopes or access denial.
// Callers must disable mutations until the refreshed authority is available.
export function useRefreshingResource(load,scope,generation) {
 const [state,setState]=useState({scope,generation,data:null,error:null,loading:true});
 useEffect(()=>{
  let current=true;const controller=new AbortController();
  setState(previous=>({scope,generation,data:previous.scope===scope?previous.data:null,error:null,loading:true}));
  Promise.resolve().then(()=>load({signal:controller.signal})).then(data=>{
   if(current)setState({scope,generation,data,error:null,loading:false});
  }).catch(error=>{
   if(current)setState(previous=>({scope,generation,data:[401,403,404].includes(error.status)?null:previous.data,error,loading:false}));
  });
  return()=>{current=false;controller.abort();};
 },[scope,generation]); // load captures only the supplied scope and refresh generation.
 if(state.scope!==scope)return {data:null,error:null,loading:true};
 return state.generation===generation?state:{...state,error:null,loading:true};
}
