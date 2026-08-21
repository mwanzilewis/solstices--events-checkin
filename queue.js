const NORTHSTAR_MQ_URL = process.env.NORTHSTAR_MQ_URL;
const NORTHSTAR_MQ_API_KEY = process.env.NORTHSTAR_MQ_API_KEY;

async function publishPrintRequest(message) {
  const response = await fetch(
    `${NORTHSTAR_MQ_URL}/messages`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NORTHSTAR_MQ_API_KEY}`
      },

      body: JSON.stringify({
        topic: "badge-printing",
        message
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Northstar MQ error: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

module.exports = {
  publishPrintRequest
};
