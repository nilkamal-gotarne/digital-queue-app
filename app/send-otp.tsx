import axios from "axios";
const sendOtpEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  try {
    const response = await axios.post(
      "https://digitalqueue.in1.apiqcloud.com/api/sendMail",
      {
        to: to,
        subject: subject,
        html,
      }
    );
    console.log("from email send", response.data);
    // response is logged but not returned
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export default sendOtpEmail;
