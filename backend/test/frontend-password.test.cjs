const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('password-expired responses activate existing UI flag without affecting other forbidden responses', async () => {
  let handleError;
  let user = {id:1,passwordExpired:false};
  const client = {interceptors:{request:{use:()=>{}},response:{use:(_ok,error)=>{handleError=error;}}}};
  const dependencies = {
    axios:{default:{create:()=>client}},
    '@/utils/constants':{API_BASE_URL:'/api'},
    '@/store/authStore':{useAuthStore:{getState:()=>({user,setUser:value=>{user=value;}})}},
    '@/lib/queryClient':{queryClient:{}},
  };
  const source = fs.readFileSync(path.resolve(__dirname,'../../frontend/src/api/axios.ts'),'utf8');
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(compiled,{exports:{},require:name=>{
    assert.ok(dependencies[name],`unexpected dependency ${name}`);
    return dependencies[name];
  }});
  const error = code=>({config:{url:'/customers'},response:{status:403,data:{code}}});
  await assert.rejects(handleError(error('FORBIDDEN')));
  assert.equal(user.passwordExpired,false);
  await assert.rejects(handleError(error('PASSWORD_EXPIRED')));
  assert.equal(user.passwordExpired,true);
});
