const crypto = require("crypto");

const {
  getAttendee,
  updateAttendee
} = require("./database");

const {
  publishPrintRequest
} = require("./queue");


async function checkInAttendee(attendeeId) {

  const attendee = getAttendee(attendeeId);

  if (!attendee) {
    return {
      success: false,
      statusCode: 404,
      message: "Attendee not found"
    };
  }

  /*
   * DUPLICATE PROTECTION
   *
   * Do not create another print request if:
   *
   * 1. The attendee is already checked in
   * 2. A badge is already being printed
   */

  if (attendee.status === "CHECKED_IN") {
    return {
      success: false,
      statusCode: 409,
      status: "ALREADY_CHECKED_IN",
      message: "This attendee is already checked in."
    };
  }

  if (attendee.status === "PRINT_PENDING") {
    return {
      success: false,
      statusCode: 409,
      status: "PRINT_PENDING",
      message: "Badge printing is already in progress."
    };
  }


  /*
   * Create a unique print request ID
   */

  const printRequestId = crypto.randomUUID();


  /*
   * Mark attendee as pending BEFORE publishing.
   */

  updateAttendee(attendeeId, {
    status: "PRINT_PENDING",
    printRequestId
  });


  const printMessage = {
    printRequestId,

    attendeeId: attendee.id,

    attendeeName: attendee.name,

    callbackUrl:
      process.env.WEBHOOK_URL ||
      "http://localhost:3000/webhooks/printer",

    createdAt: new Date().toISOString()
  };


  try {

    /*
     * Send asynchronous message to Northstar MQ.
     */

    await publishPrintRequest(printMessage);


    return {
      success: true,
      statusCode: 202,
      status: "PRINT_PENDING",
      message: "Badge printing has been queued.",
      printRequestId
    };

  } catch (error) {

    /*
     * If publishing fails, allow the attendee
     * to try again.
     */

    updateAttendee(attendeeId, {
      status: "NOT_CHECKED_IN",
      printRequestId: null
    });

    throw error;
  }
}


function processPrinterWebhook(data) {

  const {
    printRequestId,
    attendeeId,
    status
  } = data;


  const attendee = getAttendee(attendeeId);

  if (!attendee) {
    return {
      success: false,
      statusCode: 404,
      message: "Attendee not found"
    };
  }


  /*
   * Verify that this webhook belongs to the
   * current print request.
   */

  if (attendee.printRequestId !== printRequestId) {

    return {
      success: false,
      statusCode: 409,
      message: "Unknown or outdated print request."
    };
  }


  /*
   * SUCCESSFUL PRINT
   */

  if (status === "SUCCESS") {

    /*
     * Idempotency:
     * If webhook is delivered twice, don't create
     * another badge.
     */

    if (attendee.status === "CHECKED_IN") {

      return {
        success: true,
        statusCode: 200,
        message: "Webhook already processed."
      };
    }


    updateAttendee(attendeeId, {
      status: "CHECKED_IN"
    });


    return {
      success: true,
      statusCode: 200,
      status: "CHECKED_IN",
      message: "Badge printed successfully."
    };
  }


  /*
   * PRINT FAILURE
   */

  if (status === "FAILED") {

    updateAttendee(attendeeId, {
      status: "PRINT_FAILED"
    });


    return {
      success: false,
      statusCode: 200,
      status: "PRINT_FAILED",
      message: "Badge printing failed."
    };
  }


  return {
    success: false,
    statusCode: 400,
    message: "Unknown printer status."
  };
}


module.exports = {
  checkInAttendee,
  processPrinterWebhook
};
