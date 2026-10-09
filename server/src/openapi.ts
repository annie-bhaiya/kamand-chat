const uuid = { type: 'string', format: 'uuid' };
const text = { type: 'string' };
const seq = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const pageLimit = { type: 'integer', minimum: 1, maximum: 100, default: 50 };
function object(properties: Record<string, unknown>, required: string[] = []) { return { type: 'object', additionalProperties: false, properties, required }; }
type Route = { method: string; path: string; summary: string; body?: unknown; query?: Record<string, unknown>; status?: number; public?: boolean; multipart?: boolean };
const routes: Route[] = [
  { method:'get',path:'/api/campus/messes/{messSlug}/menu',summary:'One recurring day menu; defaults to today in Asia/Kolkata',public:true,query:{weekday:{type:'integer',minimum:1,maximum:7,description:'ISO weekday: Monday=1, Sunday=7. Omit for today.'}} },
  { method:'put',path:'/api/campus/messes/{messSlug}/menu',summary:'Assigned mess manager updates only the specified weekday',body:object({weekday:{type:'integer',minimum:1,maximum:7},breakfast:{...text,minLength:1,maxLength:2000},lunch:{...text,minLength:1,maxLength:2000},dinner:{...text,minLength:1,maxLength:2000},specialNotice:{...text,maxLength:2000}},['weekday','breakfast','lunch','dinner']) },
  { method:'get',path:'/api/campus/events',summary:'Persistent campus calendar, ordered by date and time',public:true,query:{venue:text,category:text} },
  { method:'post',path:'/api/campus/events',summary:'Create an event for an assigned organizer; overlapping bookings return conflict',status:201,body:object({title:{...text,minLength:3,maxLength:120},description:text,category:{enum:['Club Workshop','Fest Event','Sports Tournament','Placement & Tech Talk','General']},organizer:text,venue:{enum:['Auditorium A1/A2','A13 Hall','South Campus Grounds','SCEE Seminar Hall','Sports Complex','Other']},date:{...text,format:'date'},startTime:{...text,pattern:'^[0-2][0-9]:[0-5][0-9]$'},endTime:text},['title','category','organizer','venue','date','startTime','endTime']) },
  { method:'patch',path:'/api/campus/events/{id}',summary:'Edit or reschedule an assigned organizer’s event; send the complete event fields' },
  { method:'patch',path:'/api/campus/events/{id}/status',summary:'Change event status; approval checks venue availability',body:object({status:{enum:['pending','approved','conflict','completed','cancelled']}},['status']) },
  { method:'get',path:'/api/campus/tickets',summary:'Persistent maintenance reports visible to your residence or managed scope',query:{scope:{enum:['hostel','mess']},campus:{enum:['North','South']},status:text,cluster:text} },
  { method:'post',path:'/api/campus/tickets',summary:'Report an issue in an accessible hostel or mess',status:201,body:object({title:{...text,minLength:5,maxLength:160},description:text,scope:{enum:['hostel','mess']},category:text,campus:{enum:['North','South']},clusterOrMess:text,specificLocation:text},['title','scope','category','campus','clusterOrMess','specificLocation']) },
  { method:'post',path:'/api/campus/tickets/{id}/upvote',summary:'Toggle your vote; returns ticket and hasUpvoted' },
  { method:'patch',path:'/api/campus/tickets/{id}/status',summary:'Assigned caretakers and mess managers update status with saved history',body:object({status:{enum:['Reported','Under Investigation','Resolved by Warden/Caretaker']}},['status']) },
  { method:'get',path:'/health',summary:'Process liveness',public:true },
  { method:'get',path:'/ready',summary:'Supabase schema and Data API readiness',public:true },
  { method:'post',path:'/api/auth/register',summary:'Register; session may be null until email confirmation',public:true,status:201,body:object({email:{type:'string',format:'email'},password:{type:'string',minLength:8,maxLength:128},display_name:{type:'string',minLength:1,maxLength:80}},['email','password','display_name']) },
  { method:'post',path:'/api/auth/login',summary:'Sign in using email and password',public:true,body:object({email:{type:'string',format:'email'},password:text},['email','password']) },
  { method:'post',path:'/api/auth/refresh',summary:'Rotate access and refresh tokens',public:true,body:object({refresh_token:text},['refresh_token']) },
  { method:'post',path:'/api/auth/logout',summary:'Sign out the current session and disconnect its sockets',status:204,body:object({refresh_token:text},['refresh_token']) },
  { method:'get',path:'/api/auth/me',summary:'Current authentication user and application profile' },
  { method:'get',path:'/api/users',summary:'Search username prefixes with cursor pagination',query:{q:text,after_id:uuid,limit:pageLimit} },
  { method:'get',path:'/api/users/{userId}',summary:'Public profile of a registered user' },
  { method:'patch',path:'/api/users/me',summary:'Update your username, display name or avatar key',body:object({username:{type:'string',pattern:'^[a-z0-9_]{3,32}$'},display_name:{type:'string',minLength:1,maxLength:80},avatar_key:{type:['string','null'],maxLength:512}}) },
  { method:'post',path:'/api/users/me/avatar',summary:'Upload a profile picture',multipart:true,body:object({file:{type:'string',format:'binary'}},['file']) },
  { method:'delete',path:'/api/users/me/avatar',summary:'Remove your profile picture' },
  { method:'get',path:'/api/users/{userId}/avatar',summary:'Get a user profile picture',public:true },
  { method:'get',path:'/api/conversations',summary:'Your conversations ordered by latest activity',query:{cursor:text,limit:pageLimit} },
  { method:'post',path:'/api/conversations/direct',summary:'Create or retrieve a direct conversation',body:object({user_id:uuid},['user_id']) },
  { method:'post',path:'/api/conversations/groups',summary:'Create a group with the caller as owner',status:201,body:object({title:{type:'string',minLength:1,maxLength:120},member_ids:{type:'array',items:uuid,minItems:1,maxItems:99}},['title','member_ids']) },
  { method:'get',path:'/api/conversations/{conversationId}',summary:'Conversation and member profiles' },
  { method:'patch',path:'/api/conversations/{conversationId}',summary:'Rename a group as its owner',body:object({title:{type:'string',minLength:1,maxLength:120}},['title']) },
  { method:'post',path:'/api/conversations/{conversationId}/members',summary:'Add a member as the group owner',status:201,body:object({user_id:uuid},['user_id']) },
  { method:'delete',path:'/api/conversations/{conversationId}/members/{userId}',summary:'Remove a group member or leave your group' },
  { method:'get',path:'/api/conversations/{conversationId}/messages',summary:'History descending; after_seq returns catch-up messages ascending',query:{before_seq:seq,after_seq:seq,limit:pageLimit} },
  { method:'get',path:'/api/conversations/{conversationId}/messages/search',summary:'Search undeleted message text in a conversation',query:{q:text,before_seq:seq,limit:pageLimit} },
  { method:'post',path:'/api/conversations/{conversationId}/messages',summary:'Save a message; reuse client_message_id to retry safely',body:object({client_message_id:uuid,body:{type:'string',maxLength:10000,default:''},attachment_ids:{type:'array',items:uuid,maxItems:10,default:[]}},['client_message_id']) },
  { method:'post',path:'/api/conversations/{conversationId}/read',summary:'Advance your read position monotonically',body:object({seq},['seq']) },
  { method:'patch',path:'/api/messages/{messageId}',summary:'Edit your own message',body:object({body:{type:'string',minLength:1,maxLength:10000}},['body']) },
  { method:'delete',path:'/api/messages/{messageId}',summary:'Soft-delete your own message' },
  { method:'post',path:'/api/messages/{messageId}/reactions',summary:'Add a reaction idempotently',body:object({emoji:{type:'string',minLength:1,maxLength:32}},['emoji']) },
  { method:'delete',path:'/api/messages/{messageId}/reactions',summary:'Remove your reaction',body:object({emoji:{type:'string',minLength:1,maxLength:32}},['emoji']) },
  { method:'post',path:'/api/conversations/{conversationId}/attachments',summary:'Upload a private draft file; link its ID when sending a message',status:201,multipart:true,body:object({file:{type:'string',format:'binary'}},['file']) },
  { method:'get',path:'/api/conversations/{conversationId}/attachments',summary:'List sent attachments in a conversation' },
  { method:'get',path:'/api/attachments/{attachmentId}/url',summary:'Get a private, 60-second download URL' },
  { method:'delete',path:'/api/attachments/{attachmentId}',summary:'Delete your unattached upload',status:204 },
];
const paths: Record<string, Record<string, unknown>> = {};
const calendarCreate = routes.find(route => route.method === 'post' && route.path === '/api/campus/events')!;
routes.find(route => route.method === 'patch' && route.path === '/api/campus/events/{id}')!.body = calendarCreate.body;
for (const route of routes) {
  const parameters = [...Array.from(route.path.matchAll(/\{([^}]+)\}/g), m => ({name:m[1],in:'path',required:true,schema:m[1]==='messSlug'?text:uuid})), ...Object.entries(route.query ?? {}).map(([name,schema]) => ({name,in:'query',required:name==='q' && route.path.endsWith('/search'),schema}))];
  const status=String(route.status ?? 200);
  const responses: Record<string,unknown> = { [status]: { description:status==='204'?'No content':'Success', ...(status==='204'?{}:{content:{'application/json':{schema:{$ref:'#/components/schemas/Success'}}}}) } };
  for(const error of ['400','401','403','404','409','413','415','429','502','503']) responses[error]={description:'Request rejected or service unavailable',content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}};
  (paths[route.path] ??= {})[route.method] = {
    summary:route.summary,operationId:`${route.method}_${route.path.replace(/[^a-zA-Z0-9]+/g,'_')}`,security:route.public?[]:[{bearerAuth:[]}],parameters,
    ...(route.body?{requestBody:{required:true,content:{[route.multipart?'multipart/form-data':'application/json']:{schema:route.body}}}}:{}),responses,
  };
}
export const openapi = {
  openapi:'3.1.0',info:{title:'First Commit Chat API',version:'1.0.0',description:'Express REST API backed by Supabase Auth, PostgreSQL and private Storage. Socket.IO events are documented in README.md.'},servers:[{url:'/'}],paths,
  components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT'}},schemas:{Success:{type:'object',properties:{data:{},next_cursor:{type:['string','integer','null']}}},Error:{type:'object',properties:{error:{type:'object',properties:{code:text,message:text,details:{type:'array',items:{type:'object'}}}},request_id:text}}}},
};
