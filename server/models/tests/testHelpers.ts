import argon2 from 'argon2';
import db from '../index';
import { latLng, Post } from '../post';
import { PostTag } from '../PostTags';
import { Tag } from '../tags';
import { User } from '../user';
import { Comment } from '../comment';

const UserModel: typeof User = db.User;
const PostModel: typeof Post = db.Post;
const CommentModel: typeof Comment = db.Comment;
const TagModel: typeof Tag = db.Tag;

/* 
Create a User entry in our database with the given user and email string. Returns
the entry that was created on success, or throws an error on failure.
*/
export async function makeUser(user: string, email: string): Promise<User> {
  const hashedPassword = await argon2.hash('pass', {
    type: argon2.argon2id,
  });
  const testUser: User = await UserModel.create({
    firstName: 'test',
    lastName: 'test',
    userName: user,
    password: hashedPassword,
    email: email,
  }).catch((err: Error) => {
    throw err;
  });

  return testUser;
}

/* 
Create a User entry in our database with the given user and email string
with the password as part of the serialized object. Returns
the entry that was created on success, or throws an error on failure.
*/
export async function makeUserWithPass(
  user: string,
  email: string
): Promise<User> {
  const hashedPassword = await argon2.hash('pass', {
    type: argon2.argon2id,
  });
  const testUser: User = await UserModel.scope('withPassword')
    .create({
      firstName: 'test',
      lastName: 'test',
      userName: user,
      password: hashedPassword,
      email: email,
    })
    .catch((err: Error) => {
      throw err;
    });

  return testUser;
}

/**
 * @returns A valid user record.
 */
export async function makeValidUser(): Promise<User> {
  return makeUser('validUser', 'valid@mail.utoronto.ca');
}

/* Create a (basic) Post entry in our database with the provided userid of the author, 
title, and body. Return the post on success, or throw an error on failure. 
*/
export async function makePost(
  authorid: string,
  title: string,
  body: string,
  coords?: latLng,
  capacity = 10
): Promise<Post> {
  return await PostModel.create({
    type: 'Events',
    title: title,
    body: body,
    feedbackScore: 10,
    capacity,
    location: 'toronto',
    thumbnail: 'some-path',
    UserId: authorid,
    coords,
  });
}

/* Create a (basic) Post entry in our database with the provided userid of the author, 
title, body, and (optional) tags. Return the post on success, or null on failure. 
*/
export async function makePostWithTags(
  authorid: string,
  tags: string[]
): Promise<Post> {
  const post = await makeValidPost(authorid);

  const tagObjs = await TagModel.bulkCreate(
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

  return post;
}

export async function makeValidPost(
  authorID: string,
  capacity = 10
): Promise<Post> {
  return makePost(
    authorID,
    'This is a new post!',
    'This is a new post!This is a new post!',
    undefined,
    capacity
  );
}

/*
Create a (basic) Comment entry in our database with the provided userid of the
provided post, with  body. Return the comment on success, or throw an error on failure. 
*/
export async function makeComment(
  body: string,
  UserID: string,
  PostID: string
): Promise<Comment> {
  const testComment: Comment = await CommentModel.create({
    body: body,
    UserId: UserID,
    PostId: PostID,
  }).catch((err: Error) => {
    throw err;
  });
  return testComment;
}

/* 
Create a Comment entry in our databse with the given author id and post 
id. Return the entry that was created.
*/
export async function makeValidComment(
  authorID: string,
  postID: string
): Promise<Comment> {
  return await makeComment(
    'This is the body of the comment!\
    This is the body of the comment!',
    authorID,
    postID
  );
}
export async function getAllTags(): Promise<Tag[]> {
  return await TagModel.findAll();
}

export async function getPostTags(
  postId: string
): Promise<(Tag & PostTag)[] | undefined> {
  const post = await PostModel.findByPk(postId);

  return await post?.getTags();
}

/* Ensure that the database is synchronized properly. The sync is forced, so any existing tables
are dropped and re-made. */
export async function dbSync() {
  await db.sequelize.sync({ force: true });
}
