import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: "846361001@smtp-brevo.com",
        pass: "6fvmM9YtLUpJcz3C",
      },
});

interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
}

const sendOtp = async (to: string, subject: string, text: string, html: string): Promise<void> => {
    const mailOptions: MailOptions = {
        from: '"Digital Queue" <pramod.kadam1989@gmail.com>',
        to,
        subject,
        text,
        html,
    };

    await transporter.sendMail(mailOptions);
};