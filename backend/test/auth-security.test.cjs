const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JwtStrategy } = require('../src/auth/strategies/jwt.strategy');
const { AuthService } = require('../src/auth/auth.service');
const { JwtAuthGuard } = require('../src/auth/guards/jwt-auth.guard');
const { LogsService } = require('../src/logs/logs.service');
const user = { id: 1, username: 'fixture', isActive: true, role: 'user', isFirstLogin: false, passwordChangedAt: new Date(0) };
const payload = { sub: 1, sessionId: 'fixture-session', type: 'access' };
function strategy(session) {
  return new JwtStrategy({ get: () => 'fixture-secret-not-production-123456' }, {
    user: { findUnique: async () => user },
    userSession: { findFirst: async ({where}) => session && session.lastActivity >= where.lastActivity.gte ? session : null, updateMany: async () => ({count: 0}) },
    systemSettings: { findFirst: async () => ({ passwordExpiryEnabled: true, passwordExpiryDays: 30 }) },
  });
}
test('deleted, missing and expired sessions cannot authenticate', async () => {
  await assert.rejects(strategy(null).validate(payload), /세션/);
  await assert.rejects(strategy(null).validate({...payload, sessionId: undefined}), /세션/);
  await assert.rejects(strategy({lastActivity: new Date(0)}).validate(payload), /세션/);
});
test('valid session returns password expiry from current server policy', async () => {
  const result = await strategy({lastActivity: new Date()}).validate(payload);
  assert.equal(result.id, 1);
  assert.equal(result.passwordExpired, true);
});
test('expired passwords block business APIs but allow password change', async () => {
  const parent = Object.getPrototypeOf(JwtAuthGuard.prototype);
  const original = parent.canActivate;
  parent.canActivate = async () => true;
  try {
    const guard = new JwtAuthGuard();
    const context = path => ({switchToHttp: () => ({getRequest: () => ({path, user: {passwordExpired:true}})})});
    await assert.rejects(guard.canActivate(context('/api/customers')), /비밀번호/);
    assert.equal(await guard.canActivate(context('/api/auth/change-password')), true);
  } finally { parent.canActivate = original; }
});
test('duplicate-login allowed keeps previous sessions', async () => {
  let deletes = 0;
  const service = new AuthService({userSession:{findMany:async()=>[], deleteMany:async()=>{deletes++;return {count:0}},create:async()=>({})}}, {}, {}, {}, {});
  await service.manageUserSession(1, '127.0.0.1', {preventDuplicateLogin:false});
  assert.equal(deletes,0);
  await service.manageUserSession(1, '127.0.0.1', {preventDuplicateLogin:true});
  assert.equal(deletes,1);
});
test('refresh rejects idle sessions before issuing a token', async () => {
  let signed = false;
  const service = new AuthService({user:{findUnique:async()=>user},userSession:{findFirst:async({where})=> where.lastActivity ? null : {lastActivity:new Date(0)}}}, {verify:()=>({...payload,type:"refresh"}),sign:()=>{signed=true;}}, {get:()=> 'fixture'}, {}, {});
  await assert.rejects(service.refreshToken('fixture'));
  assert.equal(signed,false);
});
test('audit logs remove nested password fields and retain nonsecret changes', async () => {
  let saved;
  const logs = new LogsService({serviceLog:{create:async({data})=>{saved=data;return data}}});
  const value = JSON.stringify({name:'site',accessInfo:[{webPassword:'secret-web',serverSshPassword:'secret-ssh',serverRootPassword:'secret-root',webAccount:'admin'}]});
  await logs.createServiceLog({logType:'정보',action:'수정',beforeValue:value,afterValue:value});
  assert.ok(!JSON.stringify(saved).includes('secret-'));
  assert.equal(JSON.parse(saved.afterValue).name,'site');
  assert.equal(JSON.parse(saved.afterValue).accessInfo[0].webAccount,'admin');
});
test('exception logs redact passwords nested in accessInfo arrays and preserve expiry code', () => {
  const { AllExceptionsFilter } = require('../src/common/filters/http-exception.filter');
  const { ForbiddenException } = require('@nestjs/common');
  let logged, response;
  const filter = new AllExceptionsFilter({logError: (_type,_msg,_error,details)=>{logged=details;}});
  const body = {accessInfo:[{webPassword:'nested-secret',webAccount:'admin'}]};
  filter.catch(new ForbiddenException({message:'비밀번호 만료',code:'PASSWORD_EXPIRED'}), {
    switchToHttp:()=>({
      getRequest:()=>({method:'GET',url:'/api/customers',body,get:()=>'',query:{},params:{}}),
      getResponse:()=>({status:()=>({json:value=>{response=value;}})}),
    }),
  });
  assert.ok(!JSON.stringify(logged).includes('nested-secret'));
  assert.equal(body.accessInfo[0].webPassword,'nested-secret');
  assert.equal(response.code,'PASSWORD_EXPIRED');
});
test('nonexpired and first-login policy retains business/read and recovery access', async () => {
  const { isPasswordExpired } = require('../src/auth/session-policy');
  assert.equal(isPasswordExpired(new Date(),{passwordExpiryEnabled:true,passwordExpiryDays:30}),false);
  assert.equal(isPasswordExpired(null,{passwordExpiryEnabled:false,passwordExpiryDays:30}),false);
  assert.equal(isPasswordExpired(null,{passwordExpiryEnabled:true,passwordExpiryDays:30}),true);
  const parent=Object.getPrototypeOf(JwtAuthGuard.prototype), original=parent.canActivate;
  parent.canActivate=async()=>true;
  try {
    const guard=new JwtAuthGuard();
    const context=(path,user)=>({switchToHttp:()=>({getRequest:()=>({path,user})})});
    assert.equal(await guard.canActivate(context('/api/customers/99/source-management',{isFirstLogin:false,passwordExpired:false})),true);
    await assert.rejects(guard.canActivate(context('/api/customers',{isFirstLogin:true})),/비밀번호/);
    assert.equal(await guard.canActivate(context('/api/auth/logout',{isFirstLogin:true})),true);
  }finally{parent.canActivate=original;}
});
test('logout endpoint only ends the requesting session', async () => {
  const { AuthController } = require('../src/auth/auth.controller');
  let args;
  const controller=new AuthController({logout:async(...values)=>{args=values;}},{});
  await controller.logout({user:{id:1,sessionId:'current'},ip:'127.0.0.1'});
  assert.deepEqual(args,[1,'current','127.0.0.1']);
});
test('refresh allows a live session and binds its query to the same user', async () => {
  const service = new AuthService({user:{findUnique:async()=>user},systemSettings:{findFirst:async()=>({sessionTimeoutMinutes:30,sessionTimeoutWarningEnabled:true})},userSession:{findFirst:async({where})=>{
    assert.equal(where.userId,1);assert.equal(where.sessionId,payload.sessionId);assert.ok(where.lastActivity.gte instanceof Date);
    return {lastActivity:new Date()};
  }, update:async()=>({})}}, {verify:()=>({...payload,type:'refresh'}),sign:()=> 'fresh-token'}, {get:()=> undefined}, {}, {});
  const result = await service.refreshToken('fixture');
  assert.equal(result.accessToken, 'fresh-token');
  assert.equal(result.session.timeoutMinutes, 30);
  assert.equal(result.session.warningSeconds, 60);
});

test('session timeout policy is clamped to the supported 10-60 minute range', () => {
  const { getSessionTimeoutMinutes, getSessionTimeoutMs } = require('../src/auth/session-policy');
  assert.equal(getSessionTimeoutMinutes({ sessionTimeoutMinutes: 5 }), 10);
  assert.equal(getSessionTimeoutMinutes({ sessionTimeoutMinutes: 90 }), 60);
  assert.equal(getSessionTimeoutMinutes({ sessionTimeoutMinutes: 20 }), 20);
  assert.equal(getSessionTimeoutMs({ sessionTimeoutMinutes: 20 }), 20 * 60 * 1000);
});

test('session extension updates only the active session and returns a fixed 60-second warning policy', async () => {
  let updateArgs;
  const service = new AuthService(
    {
      systemSettings: { findFirst: async () => ({ sessionTimeoutMinutes: 10, sessionTimeoutWarningEnabled: false }) },
      userSession: {
        updateMany: async (args) => {
          updateArgs = args;
          return { count: 1 };
        },
      },
    },
    {},
    {},
    {},
    {},
  );

  const result = await service.extendSession(7, 'active-session');
  assert.equal(updateArgs.where.userId, 7);
  assert.equal(updateArgs.where.sessionId, 'active-session');
  assert.equal(result.timeoutMinutes, 10);
  assert.equal(result.warningEnabled, false);
  assert.equal(result.warningSeconds, 60);
});
