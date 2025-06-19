'use server';

import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '@/constants/message.constant';
import bcrypt from 'bcryptjs';
import { users } from '@prisma/client';
import jwt from 'jsonwebtoken';
import response from '@/utils/response';
import { prisma } from '@/utils/prisma';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

const USER_SECRET = process.env.SECRET_APP || 'your-default-user-secret';

async function _checkUserExists(email: string) {
  const user = await prisma.users.findUnique({
    where: {
      email,
    },
  });
  return user || null;
}

async function _generateToken(user: users) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    USER_SECRET,
    {
      expiresIn: '3d',
    }
  );
  await prisma.user_tokens.upsert({
    where: {
      user_id: user.id,
    },
    update: {
      token: accessToken,
    },
    create: {
      user_id: user.id,
      token: accessToken,
    },
  });
  return accessToken;
}

export async function verifyToken(token: string | undefined) {
  if (!token) {
    throw new Error(MESSAGE_ERROR.UNAUTHORIZED);
  }

  try {
    const decodedPayload = jwt.verify(token, USER_SECRET);
    if (typeof decodedPayload === 'string' || !decodedPayload.id) {
      throw new Error(MESSAGE_ERROR.LOGIN_FAIL);
    }

    // Cache user data for session duration
    const cacheKey = CACHE_KEY.USER_BY_TOKEN(token);
    return redis.cached(
      cacheKey,
      async () => {
        const tokenInDb = await prisma.user_tokens.findUnique({
          where: { token },
          include: {
            users: {
              include: {
                user_profiles: true,
              },
            },
          },
        });

        if (!tokenInDb) {
          throw new Error(MESSAGE_ERROR.UNAUTHORIZED);
        }

        return tokenInDb.users;
      },
      '3 days' // Cache for token expiration duration
    );
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      await prisma.user_tokens.deleteMany({
        where: {
          token: token,
        },
      });
      // Invalidate cache on token expiry
      await redis.del(CACHE_KEY.USER_BY_TOKEN(token));
      throw new Error(MESSAGE_ERROR.LOGIN_FAIL);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(MESSAGE_ERROR.LOGIN_FAIL);
    }
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(MESSAGE_ERROR.SOME_THING_WENT_WRONG);
  }
}

export async function _hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    const user = await _checkUserExists(email);
    if (!user) {
      throw new Error(MESSAGE_ERROR.USER_NOT_FOUND);
    }
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash || ''
    );
    if (!isPasswordValid) {
      throw new Error(MESSAGE_ERROR.LOGIN_FAIL);
    }
    const token = await _generateToken(user as users);
    return response<string>({
      status: 200,
      data: token,
      message: MESSAGE_SUCCESS.LOGIN_SUCCESS,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(MESSAGE_ERROR.SOME_THING_WENT_WRONG);
  }
}

export async function register({
  email,
  password,
  username,
}: {
  email: string;
  password: string;
  username: string;
}) {
  try {
    const existingUser = await _checkUserExists(email);
    if (existingUser) {
      throw new Error(MESSAGE_ERROR.USER_ALREADY_EXISTS);
    }
    const user = await prisma.users.create({
      data: {
        email,
        password_hash: await _hashPassword(password),
      },
    });
    await prisma.user_profiles.create({
      data: {
        user_id: user.id,
        full_name: username,
      },
    });
    const token = await _generateToken(user as users);
    return response<string>({
      status: 201,
      data: token,
      message: MESSAGE_SUCCESS.REGISTER_SUCCESS,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(MESSAGE_ERROR.SOME_THING_WENT_WRONG);
  }
}

export async function refreshToken({ token: _token }: { token: string }) {
  try {
    const user = await verifyToken(_token);
    if (!user) {
      throw new Error(MESSAGE_ERROR.UNAUTHORIZED);
    }
    // Invalidate old token cache
    await redis.del(CACHE_KEY.USER_BY_TOKEN(_token));

    const token = await _generateToken(user as users);
    return response<string>({
      status: 200,
      data: token,
      message: MESSAGE_SUCCESS.REFRESH_TOKEN_SUCCESS,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(MESSAGE_ERROR.SOME_THING_WENT_WRONG);
  }
}

export async function logout({ token }: { token: string }) {
  try {
    await prisma.user_tokens.deleteMany({
      where: {
        token,
      },
    });
    // Invalidate cache on logout
    await redis.del(CACHE_KEY.USER_BY_TOKEN(token));

    return response<string>({
      status: 200,
      message: MESSAGE_SUCCESS.LOGOUT_SUCCESS,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(MESSAGE_ERROR.SOME_THING_WENT_WRONG);
  }
}
