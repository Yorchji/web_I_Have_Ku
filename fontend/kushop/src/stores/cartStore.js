import {useSyncExternalStore} from 'react'
let state={theQty:0,cartId:null};const listeners=new Set();const emit=()=>listeners.forEach(fn=>fn());const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};const get=()=>state
const store={updateQty(){state={...state,theQty:state.theQty+1};emit()},setId(id){state={...state,cartId:id};emit()},clearCart(){state={theQty:0,cartId:null};emit()}}
export const useCartStore=()=>({...useSyncExternalStore(subscribe,get,get),...store})
