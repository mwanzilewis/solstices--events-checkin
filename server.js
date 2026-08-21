require("dotenv").config();

const express = require("express");

const {
  checkInAttendee,
  processPrinterWebhook
} = require("./src/checkin");

const {
  getAttendee,
  getAllAttendees
} = require("./src/database");


const app = express();

const PORT = process.env.PORT || 3000;


/*
 * Middleware
 */

app.use(express.json());

app.use(express.static("public"));


/*
 * Health check
 */

app.get("/health", (req, res) => {

  res.json({
    status: "OK",
    service: "Solstice Event Check-in"
  });

});


/*
 * CHECK-IN
 *
 * POST /api/check-in
 */

app.post("/api/check-in", async (req, res) => {

  try {

    const { attendeeId } = req.body;


    if (!attendeeId) {

      return res.status(400).json({
        success: false,
        message: "attendeeId is required"
      });

    }


    const result =
      await checkInAttendee(attendeeId);


    return res
      .status(result.statusCode)
      .json(result);


  } catch (error) {

    console.error(error);


    return res.status(500).json({
      success: false,
      message: "Unable to queue badge printing."
    });

  }

});


/*
 * GET ATTENDEE STATUS
 *
 * GET /api/check-in/:attendeeId
 */

app.get(
  "/api/check-in/:attendeeId",
  (req, res) => {

    const attendee =
      getAttendee(req.params.attendeeId);


    if (!attendee) {

      return res.status(404).json({
        message: "Attendee not found"
      });

    }


    res.json(attendee);

  }
);


/*
 * GET ALL ATTENDEES
 */

app.get("/api/attendees", (req, res) => {

  res.json(getAllAttendees());

});


/*
 * PRINTER WEBHOOK
 *
 * POST /webhooks/printer
 */

app.post(
  "/webhooks/printer",
  (req, res) => {

    /*
     * In production, verify a webhook signature here.
     */

    const secret =
      req.headers["x-webhook-secret"];


    if (
      process.env.WEBHOOK_SECRET &&
      secret !== process.env.WEBHOOK_SECRET
    ) {

      return res.status(401).json({
        success: false,
        message: "Invalid webhook secret"
      });

    }


    try {

      const result =
        processPrinterWebhook(req.body);


      res
        .status(result.statusCode)
        .json(result);


    } catch (error) {

      console.error(error);


      res.status(500).json({
        success: false,
        message: "Webhook processing failed"
      });

    }

  }
);


/*
 * Start server
 */

app.listen(PORT, () => {

  console.log(
    `Solstice Check-in running on port ${PORT}`
  );

});
