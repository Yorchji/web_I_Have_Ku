import { createContext,useContext,useState } from 'react'
const AuthContext=createContext(null)
export function AuthProvider({children}){const [isLogin,setLogin]=useState(false);return <AuthContext.Provider value={{isLogin,login:()=>setLogin(true),logout:()=>setLogin(false)}}>{children}</AuthContext.Provider>}
export const useAuthStore=()=>useContext(AuthContext)
