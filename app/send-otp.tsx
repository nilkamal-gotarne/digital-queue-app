const senderEmail = "vertexautosolution@gmail.com";
const key =
  "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";

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
    console.log("Email sent successfully:", responseData);
    return responseData;
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export default sendOtpEmail;
