'use client';
// Temporary browser fixture: never included in the final production build.
import Home from '../page';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { Conversation, Message, Profile } from '@/types/chat';
import { useEffect, useState } from 'react';
const date = new Date().toISOString();
const me: Profile = {id:'me',username:'aarav',display_name:'Aarav Sharma',hostel:'Suvalsar',hostel_block:'B11',branch:'btech-cse',mess:'pine-mess',avatar_key:null,created_at:date};
const peer: Profile = {...me,id:'peer',username:'ananya',display_name:'Ananya Singh', branch:'Computer Science',hostel:'Gauri Kunj',hostel_block:'A',mess:'Pine Mess'};
const conversations: Conversation[] = [
 {id:'sample-chat',type:'direct',title:null,created_by:'me',last_seq:4,last_message_at:date,last_activity_at:date,created_at:date,conversation_members:[me,peer].map(p=>({conversation_id:'sample-chat',user_id:p.id,role:'member',joined_at:date,left_at:null,last_read_seq:4,profiles:p}))},
 {id:'campus-chat',type:'group',title:'#Kamand Prompt',campus_room_slug:'kamandprompt',created_by:'me',last_seq:0,last_message_at:null,last_activity_at:date,created_at:date,conversation_members:[]},
];
const messages: Message[] = ['Are you heading to the library after class?', 'Yes! Let’s meet near the entrance at 4.', 'Perfect. I’ll bring my notes.', 'See you there!'].map((body,i)=>({id:`m${i}`,conversation_id:'sample-chat',seq:i+1,sender_id:i%2?'me':'peer',client_message_id:`retry${i}`,body,kind:'text',created_at:date,edited_at:null,deleted_at:null,attachments:[],message_reactions:[]}));
export default function Preview(){
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  api.getAccessToken=()=> 'fixture-only';
  api.getMe=async()=>({data:{user:{id:'me',email:'sample@example.com'},profile:me}});
  api.getUser=async()=>({data:peer});
  api.getConversations=async()=>({data:conversations});
  api.getMessages=async()=>({data:messages,next_cursor:null});
  api.markRead=async()=>({data:{conversation_id:'sample-chat',user_id:'me',last_read_seq:4}});
  api.getCampusRoomPermissions=async slug=>({data:{roomSlug:slug,isAdmin:false,canBookEvents:false,canResolveTickets:false,canUpdateMenu:false}});
  api.getCampusTickets=async()=>({data:[{id:'sample-ticket',title:'Hallway light needs repair',description:'Sample report for design review. The light outside the common room is flickering in the evening.',scope:'hostel',category:'Electrical',campus:'North',clusterOrMess:'Suvalsar',specificLocation:'B11 · Common room',status:'Under Investigation',upvotes:8,upvotedBy:[],createdBy:'peer',creatorName:'Sample resident',createdAt:date,canManage:false}]});
  api.getMessMenu=async(_slug, weekday)=>{
    const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const todayWeekday=days.indexOf(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',weekday:'long'}).format(new Date()))+1;
    const selected=weekday ?? todayWeekday;
    const breakfast=['Aloo onion paratha, chutney, curd, cornflakes','Idli, sambhar & coconut chutney, fruits, dalia, bread (4 pieces only)','Upma, coconut chutney, fruits, cornflakes, bread (4 pieces only)','Plain paratha, aloo tamatar sabji, fruits, dalia, bread (4 pieces only)','Uttapam, sambhar & coconut chutney, fruits, cornflakes, bread (4 pieces only)','Poha, green chutney, fruits, dalia, bread (4 pieces only)','Masala onion dosa, sambhar & coconut chutney, cornflakes'];
    const lunch=['Rajma, cabbage-matar, roti, jeera rice, curd','Baigan bharta, black masoor, roti, rice, boondi raita','Kadhi pakora, aloo jeera, roti, jeera rice','Sitafal, white chole, poori, rice, masala chaach','Kaala chana, mix dal, roti, jeera rice, buttermilk','Sepu badi, masoor dal, roti, rice','Bhature, chole, khichdi, fried mirch, buttermilk'];
    const dinner=['Mix veg, arhar dal, roti, rice, cold custard with 4 fruits','Manchurian, dal makhni, roti, jeera rice, sewai kheer','Paneer, dal fry, roti, rice, gulab jamun','Mix veg, moong masoor dal, roti, rice, rice kheer','Malai kofta, chana dal, roti, rice, besan barfi','Lauki chana, dal tadka, roti, rice, boondi laddu','Veg biryani, aloo soyabean, roti, rice, ice cream + veg raita'];
    const salad='\nAlso included: green salad with beetroot, onion, carrot, tomato, cucumber, lemon, and pickle.';
    return {data:{messName:'Sample dining hall',weekday:selected,todayWeekday,day:days[selected-1],breakfast:breakfast[selected-1]+'\nAlso included: milk (200 ml), butter, jam, sprouts (black chana and moong), coffee, and a tea bag.',lunch:lunch[selected-1]+salad,dinner:dinner[selected-1]+salad,specialNotice:'Dahi is served on a plate.\nPaneer options: matar paneer, kadhai paneer, or shahi paneer.\nSample data for design review.'}};
  };
  socketManager.connect=()=>{}; socketManager.disconnect=()=>{}; socketManager.isConnected=()=>false;
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setReady(true);
 },[]);
 return ready ? <><Home/><div style={{position:'fixed',bottom:4,right:8,fontSize:10,color:'var(--text-muted)',pointerEvents:'none'}}>Sample data · design review</div></>:null;
}
