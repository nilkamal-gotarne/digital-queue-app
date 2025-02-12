const senderEmail = "846361001@smtp-brevo.com";
const key = "6fvmM9YtLUpJcz3C";

const sendOtpEmail = async (
  to: string,
  toName: string,
  subject: string,
  html: string
): Promise<void> => {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": key,
      },
      body: JSON.stringify({
        sender: {
          name: "Vertex auto Solution",
          email: senderEmail,
        },
        to: [
          {
            email: to,
            name: toName,
          },
        ],
        subject: subject,
        htmlContent: html,
      }),
    });
    const responseData = await response.json();
    console.log("from email send", responseData);
    return responseData;
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export default sendOtpEmail;
