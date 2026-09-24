const test = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { ForbiddenException } = require('@nestjs/common');
const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { CreateUserDto } = require('../src/users/dto/create-user.dto.ts');
const { UsersService } = require('../src/users/users.service.ts');

test('user creation rejects roles outside the supported role enum', async () => {
  const errors = await validate(
    plainToInstance(CreateUserDto, {
      username: 'user01',
      name: 'User',
      role: 'unknown',
    }),
  );

  assert.ok(errors.some((error) => error.property === 'role'));
});

test('regular admins cannot create privileged accounts', async () => {
  let created = false;
  const service = new UsersService(
    {
      user: {
        count: async () => 0,
        create: async () => {
          created = true;
        },
      },
    },
    {},
  );

  await assert.rejects(
    service.create({ role: 'super_admin' }, 1, 'admin'),
    (error) => error instanceof ForbiddenException,
  );
  assert.equal(created, false);
});

test('unknown actor roles cannot create privileged accounts', async () => {
  let created = false;
  const service = new UsersService(
    {
      user: {
        count: async () => 0,
        create: async () => {
          created = true;
        },
      },
    },
    {},
  );

  await assert.rejects(
    service.create({ role: 'super_admin' }, 1, 'unknown'),
    (error) => error instanceof ForbiddenException,
  );
  assert.equal(created, false);
});

test('regular admins cannot reset privileged account passwords', async () => {
  let updated = false;
  const service = new UsersService(
    {
      user: {
        findUnique: async () => ({ username: 'root', name: 'Root', role: 'super_admin' }),
        update: async () => {
          updated = true;
        },
      },
    },
    {},
  );

  await assert.rejects(
    service.resetPassword(2, 1, 'admin'),
    (error) => error instanceof ForbiddenException,
  );
  assert.equal(updated, false);
});

test('unknown actor roles cannot reset passwords', async () => {
  let updated = false;
  const service = new UsersService(
    {
      user: {
        findUnique: async () => ({ username: 'user01', name: 'User', role: 'user' }),
        update: async () => {
          updated = true;
        },
      },
    },
    {},
  );

  await assert.rejects(
    service.resetPassword(2, 1, 'unknown'),
    (error) => error instanceof ForbiddenException,
  );
  assert.equal(updated, false);
});

test('privileged password reset does not return the default password', async () => {
  const service = new UsersService(
    {
      user: {
        findUnique: async () => ({ username: 'user01', name: 'User', role: 'user' }),
        update: async () => ({ id: 2 }),
      },
      systemSettings: {
        findFirst: async () => ({ defaultPassword: 'known-default' }),
      },
    },
    { createServiceLog: async () => undefined },
  );

  const result = await service.resetPassword(2, 1, 'super_admin');
  assert.deepEqual(result, { message: '비밀번호가 초기화되었습니다.' });
  assert.equal(Object.hasOwn(result, 'defaultPassword'), false);
});

test('new accounts require an IP when global IP restriction is enabled', async () => {
  let created = false;
  const service = new UsersService(
    {
      systemSettings: { findFirst: async () => ({ ipRestrictionEnabled: true }) },
      user: {
        create: async () => {
          created = true;
        },
      },
    },
    {},
  );

  await assert.rejects(
    service.create({ role: 'user', department: '기술팀' }, 1, 'admin'),
    /허용 IP를 1개 이상/,
  );
  assert.equal(created, false);
});

test('admin accounts are limited to two allowed IP addresses', async () => {
  let created = false;
  const service = new UsersService(
    {
      systemSettings: { findFirst: async () => ({ ipRestrictionEnabled: false }) },
      user: {
        create: async () => {
          created = true;
        },
      },
    },
    {},
  );

  await assert.rejects(
    service.create(
      {
        role: 'super_admin',
        allowedIpAddresses: ['192.168.10.1', '192.168.10.2', '192.168.10.3'],
      },
      1,
      'super_admin',
    ),
    /최대 2개/,
  );
  assert.equal(created, false);
});
