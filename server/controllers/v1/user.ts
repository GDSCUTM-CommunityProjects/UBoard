import argon2 from "argon2";
import EmailService, { EMAIL_TYPE } from "../../services/emailService";
import { User } from "../../models/user";
import db from "../../models";

export default class UserController {
  protected secret: string;
  protected userRepo: typeof User;
  protected emailService: EmailService;

  constructor(model: typeof User, secret: string, emailService: EmailService) {
    this.userRepo = model;
    this.secret = secret;
    this.emailService = emailService;
  }

  /* Email Related */

  /** Generates and returns a random alphanumeric string. Used in validating
    emails. */
  private generateRandom(): string {
    const alphabet =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var str = "";

    for (var i = 0; i < alphabet.length; i++) {
      str += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    return str;
  }

  /** Send a preformatted email to the user based on the email type. */
  protected async sendEmailHandler(
    user: User,
    type: EMAIL_TYPE,
    confToken: string
  ) {
    var status: boolean = true;
    switch (type) {
      case EMAIL_TYPE.RESET: {
        status = await this.emailService.sendResetEmail(
          confToken,
          user.firstName,
          user.lastName,
          user.userName,
          user.email
        );
        break;
      }
      case EMAIL_TYPE.CONF: {
        status = await this.emailService.sendConfirmEmail(
          confToken,
          user.firstName,
          user.lastName,
          user.email
        );
        break;
      }
      default: {
        // should never reach here
        return false;
      }
    }

    return status;
  }

  /** Assign an emailing token to a user based on the provided type and send them an email.
    Returns the success status. */
  protected async generateToken(
    user: User,
    type: EMAIL_TYPE
  ): Promise<boolean> {
    const confToken = this.generateRandom();
    var status: boolean = true;

    var dateExpires: Date = new Date();
    dateExpires.setUTCHours(dateExpires.getUTCHours() + 12); // expires 12hrs from now

    /* Assign token to user (invalidate previous ones)*/
    try {
      await user.update({
        confirmationToken: `${type}:${confToken}`, // store the type so we can validate it later
        confirmationTokenExpires: dateExpires,
      });
    } catch (err) {
      console.error(`generateToken failed: ${err}`);
      return false;
    }

    status = await this.sendEmailHandler(user, type, confToken);

    return status;
  }

  /** Check whether the provided token matches the requested confirmation type (reset or account) 
    and that it is not expired. Returns the user it matches on success, or null on failure. */
  protected async validateToken(
    token: string,
    type: EMAIL_TYPE
  ): Promise<User | null> {
    const dbTokenFormat = `${type}:${token}`;
    var user: User | null = null;

    try {
      user = await this.userRepo.findOne({
        where: { confirmationToken: dbTokenFormat },
      });
      const currTime = new Date().getTime();
      if (
        !user ||
        user.confirmationToken !== dbTokenFormat ||
        user.confirmationTokenExpires.getTime() <= currTime
      )
        return null;
    } catch (err) {
      console.error(`validateToken failed: ${err}`);
      return null;
    }

    return user;
  }

  /** Generate and send the user an email to reset their password.
      Returns the success status. */
  async sendResetEmail(user: User) {
    const status = await this.generateToken(user, EMAIL_TYPE.RESET);
    return status;
  }

  /** Generate and send the user an email to confirm their account.
      Returns the success status. */
  async sendEmailConfirmation(user: User) {
    const status = await this.generateToken(user, EMAIL_TYPE.CONF);
    return status;
  }

  /** Confirm the user account associated with the token if it is valid. 
    Returns false if the token is invalid or expired.*/
  async confirmEmail(token: string): Promise<boolean> {
    const user: User | null = await this.validateToken(token, EMAIL_TYPE.CONF);
    if (!user) {
      return false;
    }

    /* Confirm the User account and consume the token */
    try {
      await user.update({
        confirmed: true,
        confirmationToken: "",
        confirmationTokenExpires: null,
      });
    } catch (err) {
      console.error(`confirmEmail failed: ${err}`);
      return false;
    }

    return true;
  }

  /** Returns true and changes the password of the user associated to the token, given that the token is valid.
   If the token is expired, or invalid, return false. */
  async resetPassword(
    token: string,
    newPass: string,
    newPassConf: string
  ): Promise<boolean> {
    const user: User | null = await this.validateToken(token, EMAIL_TYPE.RESET);

    if (!user || newPass !== newPassConf) {
      return false;
    }

    const hashed = await argon2.hash(newPass, {
      // should check newPass format before func call
      type: argon2.argon2id,
    });

    /* Change their password & Consume token */
    try {
      await user.update({
        password: hashed,
        confirmationToken: "",
        confirmationTokenExpires: null,
      });
    } catch (err) {
      console.error(`resetPassword (update) failed: ${err}`);
      return false;
    }

    return true;
  }
}
