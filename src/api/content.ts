'use server';

import { prisma } from '../utils/prisma';
import response from '../utils/response';
import { MESSAGE_ERROR, MESSAGE_SUCCESS } from '../constants/message.constant';
import { verifyToken } from './auth';
import { PAGINATE_DEFAULT } from '@/constants/paginate.constant';
import redis from '@/utils/redis';
import { CACHE_KEY } from '@/constants/redis.constant';

// Posts have long-term cache (several hours) as per DBML
export async function getPosts({
  page = PAGINATE_DEFAULT.PAGE,
  limit = PAGINATE_DEFAULT.LIMIT,
}: {
  page?: number;
  limit?: number;
}) {
  const cacheKey = CACHE_KEY.POSTS(page, limit);
  return redis.cached(
    cacheKey,
    async () => {
      try {
        const posts = await prisma.posts.findMany({
          where: { status: 'published' },
          include: {
            employees: { select: { full_name: true, avatar_url: true } },
            _count: { select: { post_comments: true } },
          },
          orderBy: { published_at: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        });
        const total = await prisma.posts.count({
          where: { status: 'published' },
        });
        return response({
          status: 200,
          data: posts,
          message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
          paginate: {
            total,
            page,
            limit,
          },
        });
      } catch (error) {
        return response({
          status: 500,
          message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
        });
      }
    },
    '6 hours' // Long-term cache as per DBML strategy
  );
}

// Individual posts have long-term cache (several hours) as per DBML
export async function getPostBySlug(slug: string) {
  const cacheKey = CACHE_KEY.POST_BY_SLUG(slug);
  return redis.cached(
    cacheKey,
    async () => {
      try {
        const post = await prisma.posts.findUnique({
          where: { slug, status: 'published' },
          include: {
            employees: { select: { full_name: true, avatar_url: true } },
            post_comments: {
              where: { status: 'approved' },
              include: {
                users: {
                  select: {
                    user_profiles: {
                      select: { full_name: true, avatar_url: true },
                    },
                  },
                },
                other_post_comments: {
                  where: { status: 'approved' },
                  include: {
                    users: {
                      select: {
                        user_profiles: {
                          select: { full_name: true, avatar_url: true },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { created_at: 'asc' },
            },
          },
        });
        if (!post) {
          return response({
            status: 404,
            message: MESSAGE_ERROR.PRODUCT_NOT_FOUND,
          });
        }
        return response({
          status: 200,
          data: post,
          message: MESSAGE_SUCCESS.GET_DATA_SUCCESS,
        });
      } catch (error) {
        return response({
          status: 500,
          message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
        });
      }
    },
    '6 hours' // Long-term cache as per DBML strategy
  );
}

// Comments require cache invalidation when new ones are added
export async function addComment(
  token: string,
  {
    postId,
    content,
    parentId,
  }: { postId: string; content: string; parentId?: string }
) {
  try {
    const user = await verifyToken(token);

    // Find the post to get the slug for cache invalidation
    const post = await prisma.posts.findUnique({
      where: { id: postId },
      select: { slug: true },
    });

    // Invalidate post-specific cache when new comment is added
    if (post?.slug) {
      await redis.del(CACHE_KEY.POST_BY_SLUG(post.slug));
    }
    // Also invalidate the main posts list cache (comment counts might change)
    await redis.delPattern(CACHE_KEY.POSTS_PATTERN());

    const newComment = await prisma.post_comments.create({
      data: {
        post_id: postId,
        content: content,
        parent_comment_id: parentId,
        user_id: user.id,
        commenter_name: user.user_profiles?.full_name,
        commenter_email: user.email,
        status: 'pending_approval', // Comments require moderation as per DBML
      },
    });
    return response({
      status: 201,
      data: newComment,
      message: 'Comment submitted for approval.',
    });
  } catch (error) {
    if (error instanceof Error) {
      return response({ status: 401, message: error.message });
    }
    return response({
      status: 500,
      message: MESSAGE_ERROR.SOME_THING_WENT_WRONG,
    });
  }
}
