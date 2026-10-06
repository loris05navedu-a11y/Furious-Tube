const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const fs=require('fs');
(async()=>{
const env=await initializeTestEnvironment({projectId:'demo-ft',firestore:{rules:fs.readFileSync(require('path').join(__dirname,'../firestore.rules'),'utf8'),host:'localhost',port:8080}});
const now=Date.now();
await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await db.doc('users/adm').set({id:'adm',username:'Boss',admin:true});
  await db.doc('users/stf').set({id:'stf',username:'Staffy',staff:{until:null}});
  await db.doc('users/stf2').set({id:'stf2',username:'Staffy2',staff:{until:null}});
  await db.doc('users/exp').set({id:'exp',username:'Expired',staff:{until:now-1000}});
  await db.doc('users/bob').set({id:'bob',username:'Bob',timeOnSite:5,subscribers:[]});
  await db.doc('users/eve').set({id:'eve',username:'Eve',timeOnSite:0,subscribers:[]});
  await db.doc('videos/v1').set({id:'v1',title:'T',uploader:'Bob',uploaderId:'bob',likes:[],dislikes:[],comments:{},reports:[],views:0,hidden:false});
  await db.doc('videos/v2').set({id:'v2',title:'T2',uploader:'Eve',uploaderId:'eve',likes:[],dislikes:[],comments:{['c_eve_1']:{id:'c_eve_1',authorId:'eve',author:'Eve',text:'hi'}},reports:[],views:3,hidden:false});
});
const ctxOf=(uid,email,verified=true)=>env.authenticatedContext(uid,email?{email,email_verified:verified}:{}).firestore();
const bob=ctxOf('bob'),eve=ctxOf('eve'),stf=ctxOf('stf'),adm=ctxOf('adm','loris05.nav@gmail.com'),admFake=ctxOf('x','loris05.nav@gmail.com',false),anon=env.unauthenticatedContext().firestore();
const exp=ctxOf('exp');
let ok=0,bad=0;
const t=async(name,p,expect)=>{try{await (expect?assertSucceeds(p):assertFails(p));ok++;}catch(e){bad++;console.log('FAIL',name);}};
const U=(db,id)=>db.doc('users/'+id), V=(db,id)=>db.doc('videos/'+id);
// lecture
await t('anon read video',anon.doc('videos/v1').get(),true);
await t('anon write video',V(anon,'v1').update({views:1}),false);
// users self
await t('self avatar',U(bob,'bob').update({avatar:'http://x'}),true);
await t('self timeOnSite +5',U(bob,'bob').update({timeOnSite:10}),true);
await t('self timeOnSite +500',U(bob,'bob').update({timeOnSite:600}),false);
await t('self admin flag true (non admin)',U(bob,'bob').update({admin:true}),false);
await t('self staff',U(bob,'bob').update({staff:{until:null}}),false);
await t('self unban w/o ban',U(bob,'bob').update({banned:false}),false);
await t('other user update',U(eve,'bob').update({avatar:'x'}),false);
await t('rename ok',U(bob,'bob').update({username:'Bobby',usernameChangedAt:Date.now()}),true);
await t('rename again <24h',U(bob,'bob').update({username:'Bobby2',usernameChangedAt:Date.now()}),false);
await t('rename reserved',U(eve,'eve').update({username:'Staff Eve',usernameChangedAt:Date.now()}),false);
await t('rename furious shorter',U(eve,'eve').update({username:'furious shorter',usernameChangedAt:Date.now()}),false);
await t('rename bad chars',U(eve,'eve').update({username:'<b>x</b>',usernameChangedAt:Date.now()}),false);
await t('rename fake old stamp',U(eve,'eve').update({username:'Evee',usernameChangedAt:1}),false);
await t('rename without stamp',U(eve,'eve').update({username:'Evee'}),false);
// staff rename 4h
await env.withSecurityRulesDisabled(c=>c.firestore().doc('users/stf').update({usernameChangedAt:now-5*3600000}));
await t('staff rename after 5h',U(stf,'stf').update({username:'Stefy9',usernameChangedAt:Date.now()}),true);
await t('staff rename again',U(stf,'stf').update({username:'Stefy8',usernameChangedAt:Date.now()}),false);
// admin
await t('admin rename repeatedly',U(adm,'adm').update({username:'Boss2',usernameChangedAt:Date.now()}),true);
await t('admin rename again',U(adm,'adm').update({username:'admin Boss',usernameChangedAt:Date.now()}),true);
await t('unverified admin email',U(admFake,'bob').update({staff:{until:null}}),false);
await t('admin sets staff',U(adm,'eve').update({staff:{until:null}}),true);
await t('admin removes staff',U(adm,'eve').update({staff:null}),true);
// create
await t('create own profile',env.authenticatedContext('new1').firestore().doc('users/new1').set({id:'new1',username:'Newbie',date:1,timeOnSite:0,banned:false}),true);
await t('create profile as other',env.authenticatedContext('new2').firestore().doc('users/zzz').set({id:'zzz',username:'Zed'}),false);
await t('create profile admin flag',env.authenticatedContext('new3').firestore().doc('users/new3').set({id:'new3',username:'Newbie3',admin:true}),false);
await t('create profile staff name',env.authenticatedContext('new4').firestore().doc('users/new4').set({id:'new4',username:'official_x'}),false);
await t('create profile with staff',env.authenticatedContext('new5').firestore().doc('users/new5').set({id:'new5',username:'Newbie5',staff:{until:null}}),false);
// subscribe
await t('subscribe',U(eve,'bob').update({subscribers:['eve']}),true);
await t('subscribe as someone else',U(eve,'bob').update({subscribers:['eve','zed']}),false);
await t('unsubscribe',U(eve,'bob').update({subscribers:[]}),true);
await t('subscribe + other field',U(eve,'bob').update({subscribers:['eve'],avatar:'x'}),false);
// ban
await t('staff bans 2h',U(stf,'bob').update({banned:true,bannedUntil:now+7200000}),true);
await t('staff unban temp',U(stf,'bob').update({banned:false,bannedUntil:null}),true);
await t('staff bans 5h',U(stf,'eve').update({banned:true,bannedUntil:now+5*3600000}),false);
await t('staff bans permanent',U(stf,'eve').update({banned:true}),false);
await t('staff bans admin',U(stf,'adm').update({banned:true,bannedUntil:now+3600000}),false);
await t('staff bans staff',U(stf,'stf2').update({banned:true,bannedUntil:now+3600000}),false);
await t('expired staff bans',U(exp,'bob').update({banned:true,bannedUntil:now+3600000}),false);
await t('user bans',U(eve,'bob').update({banned:true,bannedUntil:now+3600000}),false);
await t('admin bans forever',U(adm,'eve').update({banned:true}),true);
await t('staff unbans permanent',U(stf,'eve').update({banned:false}),false);
// videos
const vid=(id,extra={})=>({id,title:'Ma vidéo',uploader:'Bobby',uploaderId:'bob',url:'u',thumb:'t',date:1,likes:[],dislikes:[],comments:{},reports:[],views:0,hidden:false,...extra});
await t('create video',V(bob,'n1').set(vid('n1')),true);
await t('create video as other',V(eve,'n2').set(vid('n2')),false);
await t('create video wrong uploader name',V(bob,'n3').set(vid('n3',{uploader:'Fake'})),false);
await t('create video w/ views',V(bob,'n4').set(vid('n4',{views:999})),false);
await t('like',V(eve,'v1').update({likes:['eve']}),true);
await t('like as other uid',V(eve,'v1').update({likes:['eve','zed']}),false);
await t('dislike swap',V(eve,'v1').update({likes:[],dislikes:['eve']}),true);
await t('view +1',V(eve,'v1').update({views:1}),true);
await t('view +100',V(eve,'v1').update({views:101}),false);
await t('edit title by other',V(eve,'v1').update({title:'hack'}),false);
await t('owner edit title',V(bob,'v1').update({title:'mine'}),false);
await t('owner meta',V(bob,'v1').update({uploader:'Bobby',uploaderAvatar:'x'}),true);
await t('comment add',V(eve,'v1').update({comments:{c_eve_5:{id:'c_eve_5',authorId:'eve',author:'Eve',text:'yo',date:1}},lastComment:'c_eve_5'}),true);
await t('comment as other',V(eve,'v1').update({comments:{c_bob_5:{id:'c_bob_5',authorId:'bob',author:'Bobby',text:'yo',date:1}},lastComment:'c_bob_5'}),false);
await t('comment wrong author name',V(eve,'v1').update({comments:{c_eve_6:{id:'c_eve_6',authorId:'eve',author:'Boss',text:'yo',date:1}},lastComment:'c_eve_6'}),false);
await t('comment delete own',V(eve,'v2').update({comments:{},lastComment:'c_eve_1'}),true);
await env.withSecurityRulesDisabled(c=>c.firestore().doc('videos/v2').update({comments:{c_eve_1:{id:'c_eve_1',authorId:'eve',author:'Eve',text:'hi'}}}));
await t('comment delete other',V(bob,'v2').update({comments:{},lastComment:'c_eve_1'}),false);
await t('comment delete other w/ lie',V(bob,'v2').update({comments:{},lastComment:'c_bob_1'}),false);
await t('staff delete comment',V(stf,'v2').update({comments:{},lastComment:'c_eve_1'}),true);
await t('report',V(eve,'v1').update({reports:['eve']}),true);
await t('report hide early',V(bob,'v1').update({reports:['bob'],hidden:true}),false);
await env.withSecurityRulesDisabled(c=>c.firestore().doc('videos/v1').update({hidden:true}));
await t('user unhide',V(bob,'v1').update({hidden:false}),false);
await env.withSecurityRulesDisabled(c=>c.firestore().doc('videos/v1').update({hidden:false}));
await t('staff hide',V(stf,'v1').update({hidden:true}),true);
await t('user delete other video',V(eve,'v1').delete(),false);
await t('owner delete',V(bob,'v1').delete(),true);
await t('staff delete',V(stf,'v2').delete(),true);
await t('admin anything',V(adm,'n1').update({title:'x'}),true);
// bins
await t('bins write v1',anon.doc('bins/x').set({a:1}),false);
await t('bins write auth',bob.doc('bins/x').set({items:[]}),true);
await t('config write user',bob.doc('config/app').set({dataV2:true}),false);
await t('config write admin',adm.doc('config/app').set({dataV2:true}),true);
await t('bins write after v2',bob.doc('bins/x').set({items:[]}),false);
await t('config read',anon.doc('config/app').get(),true);
console.log('ok',ok,'fail',bad);
await env.cleanup();process.exit(bad?1:0);
})();
