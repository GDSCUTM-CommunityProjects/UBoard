import { Comment } from '../../models/comment';
import db from '../../models';

// The return type of a Comment associated with the Post's User.
export type CommentsUser = Comment & {
  User: {
    userId: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  };
};

// The maximum number of results to return.
const MAX_RESULTS = 50;

export default class CommentController {
  protected commentsRepo: typeof Comment;

  constructor(commentsRepo: typeof Comment) {
    this.commentsRepo = commentsRepo;
  }

  /**
   * CRUD method to get all the comments on a particular post.
   *
   * @param postID  - The identifier used to find the specific post.
   * @param limit   - Limit the comments to a number of results.
   * @param offset  - Offset the results
   * @returns A data object containing the results.
   */
  async getComments(
    postID: string,
    limit: number,
    offset: number
  ): Promise<{
    status: number;
    data: { result?: CommentsUser[]; total?: number; message?: string };
  }> {
    const data = await Promise.all([
      this.commentsRepo.findByPk(postID, {
        limit: limit > MAX_RESULTS ? MAX_RESULTS : limit,
        // Since we are returning multiple results, we want to limit the data.
        attributes: ['id', 'body'],
        include: [
          {
            model: db.User,
            attributes: ['UserId', 'firstName', 'lastName', 'createdAt'],
          },
        ],
        order: [['createdAt', 'DESC']],
        offset: offset,
      }),
      this.commentsRepo.count(),
    ]);

    if (!data) {
      return {
        status: 404,
        data: { message: `Post ${postID} could not be found` },
      };
    }
    return {
      status: 200,
      data: {
        result: data[0] as any as CommentsUser[],
        total: data[1],
      },
    };
  }

  /**
   * Search for the comment if it exists
   *
   * @param commentID - The identifer used to find the specific comment
   * @returns The details of the post
   */
  async getComment(commentID: string): Promise<{
    status: number;
    data: { result?: CommentsUser; message?: string };
  }> {
    const data = (await this.commentsRepo.findByPk(commentID, {
      attributes: ['id', 'body'],
      include: [
        {
          model: db.User,
          attributes: ['UserId', 'firstName', 'lastName', 'createdAt'],
        },
      ],
    })) as CommentsUser;

    if (!data) {
      return {
        status: 404,
        data: { message: `Comment ${commentID} could not be found` },
      };
    }
    return {
      status: 200,
      data: { result: data },
    };
  }

  /**
   * Delete the post by a given ID.
   *
   * @param postID - The identifier of the post to destroy.
   * @returns A status object indicating the results of the action.
   */

  /**
   * Delete the post by a given ID.
   *
   * @param userId - The identifier of the post to destroy.
   * @param commentId
   * @returns
   */
  async deleteComment(
    userId: string,
    commentId: string
  ): Promise<{ status: number; data?: { message?: string } }> {
    const result = await this.commentsRepo.findOne({
      where: { id: commentId },
    });

    if (!result) {
      return {
        status: 404,
        data: {
          message: `Comment ${commentId} could not be deleted.`,
        },
      };
    } else if (result.UserId != userId) {
      return {
        status: 401,
        data: { message: 'Unauthorized to delete the comment.' },
      };
    }
    await result.destroy();
    return { status: 204 };
  }

  /**
   * @returns Create a new comment and return it.
   */
  async createComment(
    body: string,
    userID?: string,
    postID?: string
  ): Promise<{ status: number; data: { result?: Comment; message?: string } }> {
    if (!body || !userID || !postID) {
      return { status: 400, data: { message: 'Missing fields.' } };
    }

    const comment = await this.commentsRepo.create({
      body: body,
      UserId: userID,
      PostId: postID,
    });

    if (!comment) {
      return {
        status: 500,
        data: { message: 'Could not create the new post' },
      };
    }

    return { status: 200, data: { result: comment } };
  }

  /**
   * Update the post by ID.
   * @returns A result object indicating whether the update was successful, with the updated post if
   * it was updated.
   */
  async updateComment(
    currentUserId: string,
    commentID: string,
    body?: string
  ): Promise<{
    status: number;
    data?: { message?: string; result?: Comment };
  }> {
    const comment = (await this.getComment(commentID)).data.result;

    if (comment && comment.UserId == currentUserId) {
      try {
        comment.body = body || comment.body;
        await comment.save();
        return { status: 200, data: { result: comment } };
      } catch (err) {
        console.error(`Could not update comment ${commentID}\n`, err);
        return {
          status: 500,
          data: { message: 'Could not update the comment.' },
        };
      }
    } else if (comment) {
      return {
        status: 401,
        data: { message: 'Not authorized to edit this comment.' },
      };
    }
    return { status: 404, data: { message: 'Could not find comment.' } };
  }
}
