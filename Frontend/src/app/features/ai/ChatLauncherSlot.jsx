import React,{createContext,useContext,useState} from 'react';

const ChatLauncherSlotContext=createContext(null);

export function ChatLauncherProvider({children}){
 const [host,setHost]=useState(null);
 return <ChatLauncherSlotContext.Provider value={{host,setHost}}>{children}</ChatLauncherSlotContext.Provider>;
}

export function useChatLauncherSlot(){
 return useContext(ChatLauncherSlotContext)?.setHost ?? null;
}

export function useChatLauncherHost(){
 const context=useContext(ChatLauncherSlotContext);
 return {host:context?.host??null,provided:context!=null};
}
