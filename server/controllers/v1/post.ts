import sequelize, { Sequelize } from 'sequelize';
import { latLng, Post } from '../../models/post';
import { Tag } from '../../models/tags';
import { UserPostLikes } from '../../models/userPostLikes';
import { UserCheckin } from '../../models/usercheckin';
import { UserReports } from '../../models/userreport';
import { PostTag } from '../../models/PostTags';
import db from '../../models';
import { QueryTypes } from 'sequelize';
import { File } from '../../middleware/file-upload';
import FileManager from '../../services/fileManager';

// The return type of a Post associated with the Post's User.
export type PostUser = Post & {
  likeCount: number;
  doesUserLike: boolean;
  UserId: string;
  didUserReport: boolean;
  User: { firstName: string; lastName: string };
  isUserCheckedIn: boolean;
  usersCheckedIn: number;
  Tags: {
    text: string & { PostTags: PostTag }; // sequelize pluarlizes name
  }[];
};

export type PostUserPreview = {
  id: string;
  thumbnail: string;
  body: string;
  title: string;
  createdAt: Date;
  likeCount: number;
  doesUserLike: boolean;
  coords: latLng;
  location: string;
  isUserCheckedIn: boolean;
  usersCheckedIn: number;
  capacity: number;
  didUserReport: boolean;
  totalComments: number;
} & {
  Tags: {
    text: string & { PostTags: PostTag }; // sequelize pluarlizes name
  }[];
  User: { id: string; firstName: string; lastName: string };
};

// The maximum number of results to return.
const MAX_RESULTS = 50;

// The maximum number of reports before we remove a post.
export const MAX_REPORTS = 3;

export default class PostController {
  protected postsRepo: typeof Post;
  protected userPostLikesRepo: typeof UserPostLikes;
  protected userCheckinRepo: typeof UserCheckin;
  protected userPostReports: typeof UserReports;
  protected tagsRepo: typeof Tag;
  protected fileManager: FileManager;

  constructor(
    postsRepo: typeof Post,
    userPostLikesRepo: typeof UserPostLikes,
    userCheckinRepo: typeof UserCheckin,
    userReports: typeof UserReports,
    tagsRepo: typeof Tag,
    fileManager: FileManager
  ) {
    this.postsRepo = postsRepo;
    this.userPostLikesRepo = userPostLikesRepo;
    this.userCheckinRepo = userCheckinRepo;
    this.userPostReports = userReports;
    this.tagsRepo = tagsRepo;
    this.fileManager = fileManager;
  }

  /**
   * CRUD method to get all the posts.
   *
   * @param limit - Limit the posts to a number of results.
   * @param offset - Offset the results
   * @returns A data object containing the results.
   */
  async getPosts(
    userID: string,
    type: string,
    limit: number,
    offset: number
  ): Promise<{
    status: number;
    data: { result?: PostUserPreview[]; count: number; total: number };
  }> {
    const data = await Promise.all([
      this.postsRepo.findAndCountAll({
        limit: limit > MAX_RESULTS ? MAX_RESULTS : limit,
        // Since we are returning multiple results, we want to limit the data.
        attributes: [
          'type',
          'id',
          'body',
          'title',
          'createdAt',
          'thumbnail',
          'coords',
          'location',
          'capacity',
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM "UserPostLikes" as "Likes" WHERE "Likes"."postID" = "Post"."id")`
            ),
            'likeCount',
          ],
          [
            sequelize.literal(
              // https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-method-escape
              `(
                SELECT COUNT(*) FROM "UserPostLikes" as "Likes" 
                WHERE "Likes"."postID" = "Post"."id" 
                  AND "Likes"."userID" = ${db.sequelize.escape(`${userID}`)}
              )`
            ),
            'doesUserLike',
          ],

          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM "UserCheckins" as "Checkin" 
                  WHERE "Checkin"."postID" = "Post"."id" AND "Checkin"."userID" = ${db.sequelize.escape(
                    `${userID}`
                  )})`
            ),
            'isUserCheckedIn',
          ],
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM "UserCheckins" as "Checkin" 
                  WHERE "Checkin"."postID" = "Post"."id")`
            ),
            'usersCheckedIn',
          ],
          [
            sequelize.literal(
              // https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-method-escape
              `(SELECT COUNT(*) FROM "UserReports" as "Reports" 
                  WHERE "Reports"."postID" = "Post"."id" AND "Reports"."userID" = ${db.sequelize.escape(
                    `${userID}`
                  )})`
            ),
            'didUserReport',
          ],
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM "Comments"
                  WHERE "Comments"."PostId" = "Post"."id")`
            ),
            'totalComments',
          ],
        ],
        include: [
          {
            model: db.User,
            attributes: ['firstName', 'lastName', 'id'],
          },
          {
            model: db.Tag,
            attributes: ['text'],
          },
        ],
        order: [['createdAt', 'DESC']],
        offset: offset,
        where: type === 'All' ? Sequelize.literal('true') : { type: type },
      }),
      this.postsRepo.count({
        where: type === 'All' ? Sequelize.literal('true') : { type: type },
      }),
    ]);

    return {
      status: data[0].count > 0 ? 200 : 204,
      data: {
        result: (data[0].rows as any as PostUserPreview[]).map((p) => {
          // Must case to `any` as dataValues is not typed at the moment.
          // Context: https://github.com/RobinBuschmann/sequelize-typescript/issues/760
          p.likeCount = (p as any).dataValues.likeCount;
          p.doesUserLike = (p as any).dataValues.doesUserLike == 1;
          p.isUserCheckedIn = (p as any).dataValues.isUserCheckedIn == 1;
          p.usersCheckedIn = (p as any).dataValues.usersCheckedIn;
          p.didUserReport = (p as any).dataValues.didUserReport;
          return p;
        }),
        count: data[0].count,
        total: data[1],
      },
    };
  }

  async getUserPosts(
    userID: string,
    queryUserID: string,
    type: string,
    limit: number,
    offset: number
  ): Promise<{
    status: number;
    data: { result?: PostUserPreview[]; count: number; total: number };
  }> {
    const data = await Promise.all([
      this.postsRepo.findAndCountAll({
        limit: limit > MAX_RESULTS ? MAX_RESULTS : limit,
        // Since we are returning multiple results, we want to limit the data.
        attributes: [
          'type',
          'id',
          'body',
          'title',
          'createdAt',
          'thumbnail',
          'capacity',
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM "UserPostLikes" as "Likes" WHERE "Likes"."postID" = "Post"."id")`
            ),
            'likeCount',
          ],
          [
            sequelize.literal(
              // https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-method-escape
              `(
                SELECT COUNT(*) FROM "UserPostLikes" as "Likes" 
                WHERE "Likes"."postID" = "Post"."id" 
                  AND "Likes"."userID" = ${db.sequelize.escape(`${userID}`)}
              )`
            ),
            'doesUserLike',
          ],
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM "UserCheckins" as "Checkin" 
                  WHERE "Checkin"."postID" = "Post"."id" AND "Checkin"."userID" = ${db.sequelize.escape(
                    `${userID}`
                  )})`
            ),
            'isUserCheckedIn',
          ],
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM "UserCheckins" as "Checkin" 
                  WHERE "Checkin"."postID" = "Post"."id")`
            ),
            'usersCheckedIn',
          ],
          [
            sequelize.literal(
              // https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-method-escape
              `(SELECT COUNT(*) FROM "UserReports" as "Reports" 
                  WHERE "Reports"."postID" = "Post"."id" AND "Reports"."userID" = ${db.sequelize.escape(
                    `${userID}`
                  )})`
            ),
            'didUserReport',
          ],
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM "Comments"
                  WHERE "Comments"."PostId" = "Post"."id")`
            ),
            'totalComments',
          ],
        ],
        include: [
          {
            model: db.User,
            attributes: ['firstName', 'lastName', 'id'],
          },
          {
            model: db.Tag,
            attributes: ['text'],
          },
        ],
        order: [['createdAt', 'DESC']],
        offset: offset,
        where:
          type === 'All'
            ? { UserId: queryUserID }
            : { UserId: queryUserID, type: type },
      }),
      this.postsRepo.count({
        where:
          type === 'All'
            ? { UserId: queryUserID }
            : { UserId: queryUserID, type: type },
      }),
    ]);

    return {
      status: data[0].count > 0 ? 200 : 204,
      data: {
        result: (data[0].rows as any as PostUserPreview[]).map((p) => {
          p.likeCount = (p as any).dataValues.likeCount;
          p.doesUserLike = (p as any).dataValues.doesUserLike == 1;
          return p;
        }),
        count: data[0].count,
        total: data[1],
      },
    };
  }

  async searchForPosts(
    userID: string,
    type: string,
    query: string,
    limit: number,
    offset: number
  ): Promise<{
    status: number;
    data: { result?: PostUserPreview[]; count: number; total: number };
  }> {
    const weights = `(
      setweight(to_tsvector(coalesce("Post"."title", '')), 'A') || 
      setweight(to_tsvector(coalesce("User"."firstName", '')), 'B') || 
      setweight(to_tsvector(coalesce("User"."lastName", '')), 'B') || 
      setweight(to_tsvector(coalesce("PostTag"."TagText", '')), 'C') || 
      setweight(to_tsvector(coalesce("Post"."location", '')), 'C') || 
      setweight(to_tsvector(coalesce("Post"."body", '')), 'D') 
    )`;
    const data = await Promise.all([
      db.sequelize.query(
        `SELECT 
          "Post"."type",
          "Post"."id", 
          "Post"."body", 
          "Post"."title", 
          "Post"."createdAt", 
          "Post"."thumbnail", 
          "Post"."capacity",
          (
            SELECT COUNT(*) FROM "UserPostLikes" AS "Likes" 
            WHERE "Likes"."postID" = "Post"."id"
          ) AS "likeCount", 
          (
            SELECT COUNT(*) FROM "UserPostLikes" AS "Likes" 
            WHERE "Likes"."postID" = "Post"."id" AND "Likes"."userID" = $userID
          ) AS "doesUserLike", 
          (
            SELECT COUNT(*) FROM "UserCheckins" as "Checkin" 
            WHERE "Checkin"."postID" = "Post"."id" AND "Checkin"."userID" = $userID
          ) AS "isUserCheckedIn",
          (
            SELECT COUNT(*) FROM "UserCheckins" as "Checkin" 
            WHERE "Checkin"."postID" = "Post"."id"
          ) AS "usersCheckedIn",
          (
            SELECT COUNT(*) FROM "UserReports" as "Reports" 
            WHERE "Reports"."postID" = "Post"."id" AND "Reports"."userID" = $userID
          ) AS "didUserReport",
          (
            SELECT COUNT(*) FROM "Comments"
            WHERE "Comments"."PostId" = "Post"."id"
          ) AS "totalComments",
          json_build_object(
            'firstName', "User"."firstName", 
            'lastName', "User"."lastName",
            'id', "User"."id"
          ) AS "User",
          (
            SELECT json_agg(json_build_object('text', "PostTag"."TagText", 'PostTags', row_to_json("PostTag"))) 
            FROM "PostTags" AS "PostTag" WHERE "PostTag"."PostId" = "Post"."id"
          ) AS "Tags",
          ts_rank_cd(${weights}, "query", 1|4) AS "rank" 
        FROM "Posts" AS "Post" 
        LEFT OUTER JOIN "Users" AS "User" ON "Post"."UserId" = "User"."id" 
        LEFT OUTER JOIN (
          SELECT "PostId", string_agg("TagText", ' ') AS "TagText" 
          FROM "PostTags" GROUP BY 1
        ) AS "PostTag" ON "PostTag"."PostId" = "Post"."id"
        CROSS JOIN to_tsquery($query) AS "query" 
        WHERE "query" @@ ${weights} AND ("Post"."type" = $type OR $type = 'All')
        ORDER BY "rank" DESC 
        LIMIT $limit 
        OFFSET $offset;`,
        {
          bind: { userID, query, type, limit, offset },
          type: QueryTypes.SELECT,
        }
      ) as PostUserPreview[],
      db.sequelize.query(
        `SELECT count(*) FROM "Posts" AS "Post" 
        LEFT OUTER JOIN "Users" AS "User" ON "Post"."UserId" = "User"."id" 
        LEFT OUTER JOIN (
          SELECT "PostId", string_agg("TagText", ' ') AS "TagText" 
          FROM "PostTags" GROUP BY 1
        ) AS "PostTag" ON "PostTag"."PostId" = "Post"."id"
        CROSS JOIN to_tsquery($query) AS "query" 
        WHERE "query" @@ ${weights} AND ("Post"."type" = $type OR $type = 'All')`,
        {
          bind: { query, type },
          type: QueryTypes.SELECT,
        }
      ),
    ]);

    return {
      status: data[0].length > 0 ? 200 : 204,
      data: {
        result: data[0],
        count: data[0].length,
        total: Number(data[1][0].count),
      },
    };
  }

  /**
   * Search for the post by the given ID if it exists.
   *
   * @param userID - The user making the request.
   * @param postID - The identifier used to find the specific post.
   * @returns The details of the post
   */
  async getPost(
    userID: string,
    postID: string
  ): Promise<{
    status: number;
    data: { result?: PostUser; message?: string };
  }> {
    let data: undefined | PostUser = undefined;

    try {
      data = (await this.postsRepo.findByPk(postID, {
        attributes: [
          'type',
          'id',
          'title',
          'body',
          'thumbnail',
          'location',
          'createdAt',
          'coords',
          'capacity',
          'feedbackScore',
          'UserId',
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM "UserPostLikes" as "Likes" WHERE "Likes"."postID" = "Post"."id")`
            ),
            'likeCount',
          ],
          [
            sequelize.literal(
              // https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-method-escape
              `(
                SELECT COUNT(*) FROM "UserPostLikes" as "Likes" 
                WHERE "Likes"."postID" = "Post"."id" 
                  AND "Likes"."userID" = ${db.sequelize.escape(`${userID}`)}
              )`
            ),
            'doesUserLike',
          ],
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM "UserCheckins" as "Checkin" 
                  WHERE "Checkin"."postID" = "Post"."id" AND "Checkin"."userID" = ${db.sequelize.escape(
                    `${userID}`
                  )})`
            ),
            'isUserCheckedIn',
          ],
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM "UserCheckins" as "Checkin" 
                  WHERE "Checkin"."postID" = "Post"."id")`
            ),
            'usersCheckedIn',
          ],
          [
            // https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-method-escape
            `(SELECT COUNT(*) FROM "UserReports" as "Reports" 
                WHERE "Reports"."postID" = "Post"."id" AND "Reports"."userID" = ${db.sequelize.escape(
                  `${userID}`
                )})`,
            'didUserReport',
          ],
        ],
        include: [
          {
            model: db.User,
            attributes: ['firstName', 'lastName', 'userName'],
          },
          {
            model: db.Tag,
            attributes: ['text'],
          },
        ],
      })) as PostUser;
    } catch (err) {
      console.error(err);
    }

    if (!data) {
      return {
        status: 404,
        data: { message: `Post ${postID} could not be found` },
      };
    }
    const result = {
      status: 200,
      data: { result: data },
    };

    result.data.result.likeCount = (data as any).dataValues.likeCount;
    result.data.result.doesUserLike = (data as any).dataValues.doesUserLike;
    result.data.result.isUserCheckedIn = (
      data as any
    ).dataValues.isUserCheckedIn;
    result.data.result.usersCheckedIn = (data as any).dataValues.usersCheckedIn;
    result.data.result.didUserReport =
      (data as any).dataValues.didUserReport == 1;

    return result;
  }

  /**
   * Delete the post by a given ID.
   *
   * @param userId - The identifier of the Author of the post to destroy
   * @param postID - The identifier of the post to destroy.
   * @returns A status object indicating the results of the action.
   */
  async deletePost(
    userId: string,
    postID: string
  ): Promise<{ status: number; data?: { message?: string } }> {
    const result = await this.postsRepo.findOne({ where: { id: postID } });

    if (!result) {
      return {
        status: 404,
        data: { message: `Post ${postID} could not be deleted.` },
      };
    } else if (result.UserId != userId) {
      return {
        status: 401,
        data: { message: 'Unauthorized to delete the post.' },
      };
    }
    await result.destroy();
    return { status: 204 };
  }

  /**
   * Change the vote of a given post
   * @param postID - The identifier of the post the vote on.
   * @param amount - 1 if it should be incremented, -1 if it should be decremented.
   * @returns A status object indicating if the action was successful.
   */
  private async vote(
    postID: string,
    amount: 1 | -1
  ): Promise<{ status: number; data?: { result?: Post; message?: string } }> {
    // TODO: Once reporting has been implemented this can be removed
    const data = await this.postsRepo.findByPk(postID);

    if (!data) {
      return { status: 404, data: { message: 'Could not find post.' } };
    }

    try {
      (data.feedbackScore as number) += amount;
      await data.save();
      return { status: 204, data: { result: data } };
    } catch (err) {
      console.error(`Could not change vote for: ${postID}`);
      return {
        status: 400,
        data: {
          message: `Could not ${
            amount == 1 ? 'upvote' : 'report'
          } post: ${postID}`,
        },
      };
    }
  }

  /**
   * Report a given post.
   *
   * @param postID - The post to report.
   * @returns A status object indicating the result of the report.
   */
  async report(
    userID: string,
    postID: string
  ): Promise<{ status: number; data?: { message?: string } }> {
    const result = await this.userPostReports.reportPost(userID, postID);

    if (result >= MAX_REPORTS) {
      await (await this.postsRepo.findOne({
        where: { id: postID },
      }))!.destroy();
      return { status: 200, data: { message: 'Post has been deleted' } };
    }

    return { status: 204 };
  }

  /**
   * Upvote a given post.
   * @param userID - The user voting.
   * @param postID - The post to upvote.
   * @returns A status object indivating whether the post was upvoted.
   */
  async upVote(
    userID: string,
    postID: string
  ): Promise<{ status: number; data?: { result?: Post; message?: string } }> {
    const result = await this.userPostLikesRepo.likePost(userID, postID);
    if (result) {
      return { status: 204 };
    }
    return {
      status: 500,
      data: { message: `Could not like the post: ${postID}` },
    };
  }

  /**
   * Downvote a post.
   *
   * @param userID  - The user voting.
   * @param postID  - the post being voted on
   * @returns A status object with the result.
   */
  async downVote(
    userID: string,
    postID: string
  ): Promise<{ status: number; data?: { result?: Post; message?: string } }> {
    const result = await this.userPostLikesRepo.unlikePost(userID, postID);
    if (result) {
      return { status: 204 };
    }
    return {
      status: 500,
      data: { message: `Could not unlike the post: ${postID}` },
    };
  }

  /**
   * Checkin to a specific event.
   */
  async checkin(
    userID: string,
    postID: string
  ): Promise<{ status: number; data?: { result?: Post; message?: string } }> {
    const post = await this.getPost(userID, postID);

    if (!post || post.status != 200) {
      return {
        status: 500,
        data: { message: `Could not check-in to the event: ${postID}` },
      };
    }

    const howManyCheckedIn = await this.userCheckinRepo.howManyCheckedIn(
      postID
    );

    if (howManyCheckedIn + 1 > post.data.result!.capacity) {
      return {
        status: 409,
        data: { message: `Could not check-in to the event: ${postID}` },
      };
    }

    const result = await this.userCheckinRepo.checkin(userID, postID);

    if (result) {
      return { status: 204 };
    }
    return {
      status: 500,
      data: { message: `Could not check-in to the event: ${postID}` },
    };
  }

  /**
   * Check a user out of an event.
   */
  async checkout(
    userID: string,
    postID: string
  ): Promise<{ status: number; data?: { result?: Post; message?: string } }> {
    const result = await this.userCheckinRepo.checkout(userID, postID);
    if (result) {
      return { status: 204 };
    }
    return {
      status: 500,
      data: { message: `Could not check-out of the event: ${postID}` },
    };
  }

  /**
   * @returns Create a new post and return it.
   */
  async createPost(
    userID: string,
    type?: string,
    title?: string,
    body?: string,
    location?: string,
    capacity?: number,
    tags?: string[],
    coords?: latLng,
    file?: File
  ): Promise<{
    status: number;
    data: { result?: Post; message?: string };
  }> {
    if (
      !type ||
      !title ||
      !body ||
      location == undefined ||
      capacity == undefined ||
      (type === 'Events' && location === '')
    ) {
      return { status: 400, data: { message: 'Missing fields.' } };
    }

    let filePath: string | undefined = undefined;

    if (file && this.fileManager.status()) {
      // A post should be able to be created without a file.
      filePath = await this.fileManager.upload(file.path, file.filename);
    } else if (file) {
      return {
        status: 400,
        data: {
          message:
            'Thumbnail uploads are temporarily disabled. Remove the thumbnail and try again. ',
        },
      };
    }

    const post = await this.postsRepo.create({
      type,
      title,
      body,
      location,
      capacity,
      coords,
      UserId: userID,
      thumbnail: filePath,
    });

    if (!post) {
      return {
        status: 500,
        data: { message: 'Could not create the new post' },
      };
    }

    if (tags) {
      const tagObjs = await this.tagsRepo.bulkCreate(
        // create (or find) our tag objects
        tags.slice(0, 3).map((t) => {
          // restrict to max 3 tags
          return { text: t.trim() };
        }),
        {
          ignoreDuplicates: true,
        }
      );
      await post.addTags(tagObjs); // allows inserting multiple items into PostTags without directly referencing it
    }

    return { status: 200, data: { result: post } };
  }

  /**
   * Update the post by ID.
   * @returns A result object indicating whether the update was successful, with the updated post if
   * it was updated.
   */
  async updatePost(
    currentUserId: string,
    postID: string,
    title?: string,
    body?: string,
    location?: string,
    capacity?: number,
    coords?: latLng
  ): Promise<{ status: number; data?: { message?: string; result?: Post } }> {
    const post = await this.postsRepo.findByPk(postID);

    if (post && post.UserId == currentUserId) {
      try {
        post.title = title || post.title;
        post.body = body || post.body;
        post.location = location || post.location;
        post.capacity = capacity || post.capacity;
        post.coords = coords || post.coords;
        await post.save();
        return { status: 200, data: { result: post } };
      } catch (err) {
        console.error(`Could not update post ${postID}\n`, err);
        return { status: 500, data: { message: 'Could not update the post.' } };
      }
    } else if (post) {
      return {
        status: 401,
        data: { message: 'Not authorized to edit this post.' },
      };
    }
    return { status: 404, data: { message: 'Could not find post.' } };
  }
}
