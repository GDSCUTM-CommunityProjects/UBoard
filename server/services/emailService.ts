import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();

export enum EMAIL_TYPE {
  RESET = "reset",
  CONF = "conf",
}

export default class EmailService {
  constructor() {
    sgMail.setApiKey(<string>process.env.SENDGRID_API);
  }

  /** Sends an email using the SendGrid API with the provided parameters. Returns the success status. */
  private async sendEmail(
    emailAddress: string,
    subjectLine: string,
    body: string,
    html: string
  ) {
    var status: boolean = true;

    const msg = {
      to: emailAddress,
      from: <string>process.env.FROM_EMAIL,
      subject: subjectLine,
      text: body,
      html: html,
    };

    try {
      await sgMail.send(msg);
    } catch (err) {
      console.error(`Send email failed: ${err}`);
      status = false;
    }

    return status;
  }

  /** Sends an account confirmation email based on the provided parameters. Returns the success status. */
  async sendConfirmEmail(
    confToken: string,
    firstName: string,
    lastName: string,
    emailAddress: string
  ): Promise<boolean> {
    const confirmURL = `${process.env.WEBSITE}/confirmation/c=${confToken}`; // this will be our route
    const subjectLine = "UBoard - Confirm your Email Address";

    const body = `Thank you for signing up to UBoard, ${firstName} ${lastName}.
    
    To continue with your account registration, please confirm your email address by visiting: 
    
    ${confirmURL}`;
    const html = `Thank you for signing up to UBoard, ${firstName} ${lastName}. </br>
        
    To continue with your account registration, please confirm your email address by <a href="${confirmURL}">clicking here</a>
        `;

    return await this.sendEmail(emailAddress, subjectLine, body, html);
  }

  /** Sends a password reset email to the user based on the provided parameters. Returns the success status. */
  async sendResetEmail(
    confToken: string,
    firstName: string,
    lastName: string,
    userName: string,
    emailAddress: string
  ): Promise<boolean> {
    const resetURL = `${process.env.WEBSITE}/password-reset/r=${confToken}`;
    const subjectLine = "UBoard - Password Reset Requested";
    const body = `Hello,  ${firstName} ${lastName}.
        A password reset has been requested for the account with username: ${userName}. To reset your password, click the link below. 
        ${resetURL}
        `;
    const html = `Hello, ${firstName} ${lastName}.  </br>
        A password reset has been requested for the account with username: ${userName}. To reset your password, <a href="${resetURL}">click here</a>
        `;

    return await this.sendEmail(emailAddress, subjectLine, body, html);
  }
}
